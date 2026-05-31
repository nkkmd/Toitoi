'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  createLocalFsProtocolDescriptor,
  localFsCapabilityRows,
  localFsProtocolDescriptor,
} = require('./protocol');

const tests = [
  {
    name: 'localfs protocol descriptor exposes skeleton adapter and capabilities',
    run() {
      const descriptor = createLocalFsProtocolDescriptor();

      assert.strictEqual(descriptor.protocol, 'localfs');
      assert.strictEqual(descriptor.name, 'LocalFS');
      assert.strictEqual(descriptor.capabilities.rawAcquisition.support, 'yes');
      assert.strictEqual(descriptor.capabilities.identityVerification.support, 'no');
      assert.strictEqual(descriptor.capabilities.replayability.support, 'no');
      assert.ok(descriptor.notes.some(note => note.includes('runtime replay is unsupported today')));
      assert.ok(Array.isArray(localFsCapabilityRows));
      assert.strictEqual(localFsProtocolDescriptor.protocol, 'localfs');
      assert.strictEqual(typeof descriptor.adapter.describe, 'function');

      const fixturePath = path.resolve(__dirname, 'fixtures/sample-localfs-entry.json');
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      assert.strictEqual(fixture.kind, 'localfs-entry');
      assert.strictEqual(fixture.metadata.projection, 'metadata-only');
      assert.ok(Array.isArray(fixture.metadata.notes));

      const manifestPath = path.resolve(__dirname, 'fixtures/sample-localfs-manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert.strictEqual(manifest.kind, 'localfs-manifest');
      assert.strictEqual(manifest.entries.length, 2);
      assert.strictEqual(manifest.metadata.status, 'fixture');

      const archivePath = path.resolve(__dirname, 'fixtures/sample-localfs-archive.jsonl');
      const archiveLines = fs.readFileSync(archivePath, 'utf8').trim().split('\n');
      assert.strictEqual(archiveLines.length, 2);
      const firstArchiveRecord = JSON.parse(archiveLines[0]);
      assert.strictEqual(firstArchiveRecord.kind, 'localfs-entry');
      assert.strictEqual(firstArchiveRecord.recordId, 'localfs:sample:001');
    },
  },
];

function run() {
  let failed = 0;

  for (const test of tests) {
    try {
      test.run();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${test.name}`);
      console.error(error instanceof Error ? error.stack || error.message : String(error));
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    console.error(`\n${failed} test(s) failed`);
    return;
  }

  console.log(`\n${tests.length} test(s) passed`);
}

run();
