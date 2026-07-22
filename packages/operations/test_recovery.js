'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  MigrationRegistry,
  buildBackupManifest,
  verifyBackupManifest,
} = require('./index');

async function run() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-recovery-'));
  fs.writeFileSync(path.join(directory, 'canonical.jsonl'), '{"id":"one"}\n', 'utf8');
  fs.writeFileSync(path.join(directory, 'jobs.jsonl'), '{"id":"job-one"}\n', 'utf8');

  const manifest = buildBackupManifest({
    root: directory,
    files: ['canonical.jsonl', 'jobs.jsonl'],
    createdAt: '2026-07-22T00:00:00.000Z',
  });
  assert.strictEqual(manifest.files.length, 2);
  assert.strictEqual(verifyBackupManifest(manifest, directory).passed, true);

  fs.appendFileSync(path.join(directory, 'jobs.jsonl'), '{"id":"changed"}\n', 'utf8');
  assert.strictEqual(verifyBackupManifest(manifest, directory).passed, false);

  const applied = [];
  const registry = new MigrationRegistry([
    { version: 1, name: 'initialize', up: async context => context.push('initialize') },
    { version: 2, name: 'add-index', up: async context => context.push('add-index') },
  ]);
  const dryRun = await registry.apply({ currentVersion: 0, context: applied, dryRun: true });
  assert.deepStrictEqual(applied, []);
  assert.strictEqual(dryRun.to, 2);

  const result = await registry.apply({ currentVersion: 0, targetVersion: 1, context: applied });
  assert.deepStrictEqual(applied, ['initialize']);
  assert.strictEqual(result.to, 1);

  fs.rmSync(directory, { recursive: true, force: true });
  console.log('operations recovery tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
