'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ingestNostrEvents } = require('../adapter/ingest_pipeline');
const { persistIngestResult, loadPersistedRawRecords, loadPersistedCanonicalRecords, loadPersistedIngestRecords } = require('./persistence');

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-storage-'));
}

const tests = [
  {
    name: 'persistIngestResult writes append-only logs',
    run() {
      const storageDir = makeTempDir();
      const ingestResult = ingestNostrEvents([
        makeEvent({ id: 'a', created_at: 1 }),
        makeEvent({ id: 'a', created_at: 2 }),
        makeEvent({ id: 'b', created_at: 3, content: '' }),
      ], {
        skipVerify: true,
      });

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

      assert.strictEqual(rawRecords.length, 3);
      assert.strictEqual(canonicalRecords.length, 1);
      assert.strictEqual(ingestRecords.length, 1);
      assert.strictEqual(rawRecords[0].recordType, 'raw-event');
      assert.strictEqual(canonicalRecords[0].recordType, 'canonical-event');
      assert.strictEqual(ingestRecords[0].recordType, 'ingest-batch');
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
