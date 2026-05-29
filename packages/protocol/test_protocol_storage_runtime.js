'use strict';

const assert = require('assert');
const {
  createProtocolStorageRuntime,
  loadStorageReplayModule,
} = require('./protocol_storage_runtime');

const tests = [
  {
    name: 'loadStorageReplayModule resolves supported protocol replay modules',
    run() {
      assert.strictEqual(typeof loadStorageReplayModule('nostr').replayStorage, 'function');
      assert.strictEqual(typeof loadStorageReplayModule('atproto').replayStorage, 'function');
      assert.strictEqual(loadStorageReplayModule('localfs'), null);
    },
  },
  {
    name: 'createProtocolStorageRuntime exposes replay selection helpers',
    run() {
      const runtime = createProtocolStorageRuntime({ protocol: 'atproto' });

      assert.strictEqual(runtime.protocol, 'atproto');
      assert.strictEqual(runtime.isSupported, true);
      assert.strictEqual(typeof runtime.resolveReplayStorage(), 'function');
      assert.strictEqual(runtime.describe().protocol, 'atproto');
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
