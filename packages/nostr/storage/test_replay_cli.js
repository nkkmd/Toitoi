'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ingestNostrEvents } = require('../adapter/ingest_pipeline');
const { persistIngestResult } = require('./persistence');
const { parseArgs, summarizeReplayResult } = require('./replay_cli');
const { replayStorage } = require('./replay');

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-replay-cli-'));
}

const tests = [
  {
    name: 'parseArgs requires a storage directory',
    run() {
      assert.throws(() => parseArgs(['node', 'script']), /--storage-dir is required/);
      const args = parseArgs(['node', 'script', '--storage-dir', '/tmp/example', '--no-persist-index']);
      assert.strictEqual(args.storageDir, '/tmp/example');
      assert.strictEqual(args.noPersistIndex, true);
      assert.strictEqual(args.skipVerify, true);
    },
  },
  {
    name: 'summarizeReplayResult exposes replay counters',
    run() {
      const storageDir = makeTempDir();
      const ingestResult = ingestNostrEvents([makeEvent()], { skipVerify: true });
      persistIngestResult(storageDir, ingestResult, { source: 'jsonl', sourceLabel: 'fixture' });
      const replayed = replayStorage(storageDir);
      const summary = summarizeReplayResult(replayed);

      assert.strictEqual(summary.rawRecords, 1);
      assert.strictEqual(summary.accepted, 1);
      assert.strictEqual(summary.indexTotal, 1);
      assert.ok(summary.indexSnapshotPath.endsWith('index-snapshot.json'));
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
