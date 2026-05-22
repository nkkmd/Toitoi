'use strict';

const assert = require('assert');
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
      assert.ok(Array.isArray(localFsCapabilityRows));
      assert.strictEqual(localFsProtocolDescriptor.protocol, 'localfs');
      assert.strictEqual(typeof descriptor.adapter.describe, 'function');
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
