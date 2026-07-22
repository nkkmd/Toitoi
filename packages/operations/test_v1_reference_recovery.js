'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  MigrationRegistry,
  buildBackupManifest,
  verifyBackupManifest,
} = require('./recovery');

const fixture = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../../fixtures/reference/v1.0.0/east-side-weed-scenario.json'),
  'utf8',
));

async function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-v1-recovery-'));
  const restoreRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-v1-restore-'));

  try {
    const durableFiles = {
      'raw/observation.json': fixture.observation,
      'canonical/events.json': [
        fixture.observation,
        fixture.publishedInquiry,
        fixture.relatedInquiry,
        fixture.derivedInquiry,
      ],
      'queue/state.json': {
        jobs: [{ id: fixture.annotation.jobId, state: 'completed' }],
      },
      'audit/records.json': [
        {
          action: 'annotation.reviewed',
          actor: fixture.annotation.review.reviewedBy,
          target: fixture.annotation.id,
        },
        {
          action: 'publication.approved',
          actor: fixture.inquiryDraft.reviewedBy,
          target: fixture.publishedInquiry.id,
        },
      ],
    };

    for (const [relativePath, value] of Object.entries(durableFiles)) {
      const filename = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    }

    const manifest = buildBackupManifest({
      root,
      files: Object.keys(durableFiles),
      createdAt: '2026-07-22T00:30:00.000Z',
      version: 1,
    });
    assert.equal(manifest.files.length, fixture.recoveryExpectations.durableState.length);
    assert.equal(verifyBackupManifest(manifest).passed, true);

    for (const entry of manifest.files) {
      const source = path.join(root, entry.path);
      const destination = path.join(restoreRoot, entry.path);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
    assert.equal(verifyBackupManifest(manifest, restoreRoot).passed, true);

    const restoredEvents = JSON.parse(fs.readFileSync(
      path.join(restoreRoot, 'canonical/events.json'),
      'utf8',
    ));
    assert.deepEqual(
      restoredEvents.map(event => event.id).sort(),
      fixture.recoveryExpectations.canonicalEventIds.slice().sort(),
    );

    const migrationLog = [];
    const registry = new MigrationRegistry([
      {
        version: 1,
        name: 'initialize-v1-reference-state',
        async up(context) {
          context.log.push('v1');
        },
      },
      {
        version: 2,
        name: 'rebuild-derived-indexes',
        async up(context) {
          context.log.push(...fixture.recoveryExpectations.rebuildableDerivedState);
        },
      },
    ]);

    assert.deepEqual(
      registry.plan(0, 2).map(migration => migration.version),
      [1, 2],
    );

    const dryRun = await registry.apply({
      currentVersion: 0,
      targetVersion: 2,
      context: { log: migrationLog },
      dryRun: true,
    });
    assert.equal(dryRun.to, 2);
    assert.equal(dryRun.applied.every(item => item.dryRun), true);
    assert.deepEqual(migrationLog, []);

    const applied = await registry.apply({
      currentVersion: 0,
      targetVersion: 2,
      context: { log: migrationLog },
    });
    assert.equal(applied.to, 2);
    assert.deepEqual(migrationLog, [
      'v1',
      ...fixture.recoveryExpectations.rebuildableDerivedState,
    ]);

    fs.appendFileSync(path.join(restoreRoot, 'canonical/events.json'), 'corruption', 'utf8');
    assert.equal(verifyBackupManifest(manifest, restoreRoot).passed, false);

    console.log('v1.0.0 reference backup, restore, and migration tests passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(restoreRoot, { recursive: true, force: true });
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
