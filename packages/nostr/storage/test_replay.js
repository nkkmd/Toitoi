'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ingestNostrEvents } = require('../adapter/ingest_pipeline');
const { persistIngestResult } = require('./persistence');
const {
  buildCanonicalIdMapFromRawRecords,
  loadPersistedIndexSnapshot,
  replayStorage,
} = require('./replay');

function makeEvent(overrides = {}) {
  return {
    kind: 1042,
    id: 'b00d9066bde5ea98b035866f0a5e11dea3afd72bd21e2f837246e26be9a40177',
    pubkey: 'c8170cf2e55db4bdfe4d34b3b453ab2352e81c47801f7d9ae08e7997d27f3d68',
    created_at: 1778244850,
    content: '雑草の生え方が場所によって違うのはなぜ？',
    tags: [
      ['t', 'agroecology'],
      ['context', 'climate_zone', 'warm-temperate'],
      ['relationship', 'microclimate', 'weed_flora'],
      ['phase', 'intermediate'],
    ],
    sig: 'b8a8a2f56cb3b697b1fbe8dabc858d0226153a36500b87bc091ed229127b5bb457535387a4630bf55cffee9752af34df18c02f8a6f0ab14dba53cee2936a33cb',
    ...overrides,
  };
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-replay-'));
}

const tests = [
  {
    name: 'replayStorage rebuilds a derived index from raw storage',
    run() {
      const storageDir = makeTempDir();
      const ingestResult = ingestNostrEvents([
        makeEvent({ id: 'a', created_at: 1 }),
        makeEvent({ id: 'b', created_at: 2, content: 'two', tags: [['phase', 'expert'], ['relationship', 'soil_moisture', 'pest']] }),
      ], {
        skipVerify: true,
      });

      persistIngestResult(storageDir, ingestResult, {
        source: 'jsonl',
        sourceLabel: 'fixture',
      });

      const replayed = replayStorage(storageDir);
      assert.strictEqual(replayed.ingestResult.accepted.length, 2);
      assert.strictEqual(replayed.indexSnapshot.total, 2);
      assert.ok(Array.isArray(replayed.indexSnapshot.byType.inquiry));
      assert.strictEqual(replayed.indexSnapshot.byType.inquiry.length, 2);
      assert.strictEqual(
        replayed.ingestResult.accepted[0].canonicalEvent.id,
        ingestResult.accepted[0].canonicalEvent.id
      );
      assert.strictEqual(replayed.rawRecords[0].canonicalEventId, ingestResult.accepted[0].canonicalEvent.id);
      assert.ok(replayed.indexSnapshot.byId[replayed.ingestResult.accepted[0].canonicalEvent.id]);

      const persistedSnapshot = loadPersistedIndexSnapshot(storageDir);
      assert.strictEqual(persistedSnapshot.total, 2);
    },
  },
  {
    name: 'buildCanonicalIdMapFromRawRecords keeps the earliest canonical id',
    run() {
      const mapping = buildCanonicalIdMapFromRawRecords([
        {
          rawEvent: { id: 'source-a' },
          canonicalEventId: 'tt:evt:01JVVFIRST000000000000000000000000',
        },
        {
          rawEvent: { id: 'source-a' },
          canonicalEventId: 'tt:evt:01JVVSECOND00000000000000000000000',
        },
      ]);

      assert.strictEqual(mapping.get('source-a'), 'tt:evt:01JVVFIRST000000000000000000000000');
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
