'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ingestAtProtoEvents } = require('../adapter/ingest_pipeline');
const { persistIngestResult, loadPersistedCanonicalRecords, loadPersistedIngestRecords, loadPersistedRawRecords } = require('./persistence');
const { makeAtProtoRecord } = require('../test_fixtures');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-atproto-storage-'));
}

const tests = [
  {
    name: 'persistIngestResult writes append-only logs for ATProto',
    run() {
      const storageDir = makeTempDir();
      const ingestResult = ingestAtProtoEvents([
        makeAtProtoRecord({ uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/1', rkey: '1', createdAt: '2026-05-28T00:00:00.000Z' }),
        makeAtProtoRecord({ uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/1', rkey: '1', createdAt: '2026-05-28T00:00:00.000Z' }),
      ]);

      const persisted = persistIngestResult(storageDir, ingestResult, {
        source: 'jsonl',
        sourceLabel: 'fixture',
        batchId: 'batch-1',
      });

      assert.ok(fs.existsSync(persisted.rawLogPath));
      assert.ok(fs.existsSync(persisted.canonicalLogPath));
      assert.ok(fs.existsSync(persisted.ingestLogPath));

      const rawRecords = loadPersistedRawRecords(storageDir);
      const canonicalRecords = loadPersistedCanonicalRecords(storageDir);
      const ingestRecords = loadPersistedIngestRecords(storageDir);

      assert.strictEqual(rawRecords.length, 2);
      assert.strictEqual(canonicalRecords.length, 1);
      assert.strictEqual(ingestRecords.length, 1);
      assert.strictEqual(canonicalRecords[0].canonicalEvent.provenance.sources[0].protocol, 'atproto');
      assert.strictEqual(canonicalRecords[0].canonicalEvent.rawRef.storage, 'append-log');
      assert.strictEqual(canonicalRecords[0].canonicalEvent.rawRef.storageId, rawRecords[0].storageId);
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
