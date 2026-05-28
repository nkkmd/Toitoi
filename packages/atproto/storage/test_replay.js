'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ingestAtProtoEvents } = require('../adapter/ingest_pipeline');
const { persistIngestResult } = require('./persistence');
const { loadPersistedIndexSnapshot, replayStorage } = require('./replay');
const { makeAtProtoRecord } = require('../test_fixtures');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-atproto-replay-'));
}

const tests = [
  {
    name: 'replayStorage rebuilds an ATProto derived index from raw storage',
    run() {
      const storageDir = makeTempDir();
      const root = makeAtProtoRecord({
        uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/1',
        rkey: '1',
        createdAt: '2026-05-28T00:00:00.000Z',
        record: {
          type: 'inquiry',
          text: 'microclimate は雑草に影響するか？',
          language: 'ja',
          relationships: [{ source: 'microclimate', target: 'weed_flora' }],
          phase: 'expert',
          labels: ['agroecology'],
        },
      });
      const child = makeAtProtoRecord({
        uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/2',
        rkey: '2',
        createdAt: '2026-05-28T00:00:01.000Z',
        record: {
          type: 'inquiry',
          text: 'その影響は土壌水分と関係するか？',
          language: 'ja',
          relationships: [{ source: 'soil_moisture', target: 'weed_flora' }],
          lineage: [{ type: 'derived_from', target: root.uri }],
          phase: 'expert',
        },
      });

      const ingestResult = ingestAtProtoEvents([root, child]);
      persistIngestResult(storageDir, ingestResult, {
        source: 'jsonl',
        sourceLabel: 'fixture',
      });

      const replayed = replayStorage(storageDir);
      assert.strictEqual(replayed.ingestResult.accepted.length, 2);
      assert.strictEqual(replayed.indexSnapshot.total, 2);
      assert.ok(Array.isArray(replayed.indexSnapshot.byType.inquiry));
      assert.strictEqual(replayed.indexSnapshot.byType.inquiry.length, 2);

      const persistedSnapshot = loadPersistedIndexSnapshot(storageDir);
      assert.strictEqual(persistedSnapshot.total, 2);
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
