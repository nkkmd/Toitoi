'use strict';

const assert = require('assert');
const {
  validateAtProtoStorageAndReplayDoc,
} = require('./validate_atproto_storage_and_replay');

const tests = [
  {
    name: 'atproto operational doc covers backup, replay, smoke gating, and fixture hooks',
    run() {
      const result = validateAtProtoStorageAndReplayDoc();

      assert.strictEqual(result.errors.length, 0);
      assert.ok(result.source.includes('gated live smoke'));
      assert.ok(result.source.includes('replayStorage'));
      assert.ok(result.source.includes('packages/atproto/test_smoke.js'));
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
