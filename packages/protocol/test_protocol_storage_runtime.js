'use strict';

const assert = require('assert');
const {
  createProtocolStorageRuntime,
} = require('./protocol_storage_runtime');

const tests = [
  {
    name: 'createProtocolStorageRuntime resolves replay modules through injection',
    run() {
      const runtime = createProtocolStorageRuntime({
        protocol: 'nostr',
        loadReplayModule(protocol) {
          if (protocol === 'nostr') {
            return {
              replayStorage: () => 'nostr replay',
            };
          }
          if (protocol === 'atproto') {
            return {
              replayStorage: () => 'atproto replay',
            };
          }
          return null;
        },
      });

      assert.strictEqual(typeof runtime.resolveReplayStorage(), 'function');
      assert.strictEqual(runtime.describe().supported, true);
    },
  },
  {
    name: 'createProtocolStorageRuntime exposes unsupported protocols clearly',
    run() {
      const runtime = createProtocolStorageRuntime({
        protocol: 'localfs',
        loadReplayModule() {
          return null;
        },
      });

      assert.strictEqual(runtime.protocol, 'localfs');
      assert.strictEqual(runtime.isSupported, false);
      assert.throws(() => runtime.resolveReplayStorage(), /does not expose a replayStorage implementation/);
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
