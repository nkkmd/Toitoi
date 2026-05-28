'use strict';

const assert = require('assert');
const {
  createAtProtoProtocolDescriptor,
  atprotoCapabilityRows,
  atprotoProtocolDescriptor,
} = require('./protocol');

const tests = [
  {
    name: 'atproto protocol descriptor exposes ingest-capable wiring',
    run() {
      const descriptor = createAtProtoProtocolDescriptor();

      assert.strictEqual(descriptor.protocol, 'atproto');
      assert.strictEqual(descriptor.name, 'ATProto');
      assert.strictEqual(descriptor.capabilities.rawAcquisition.support, 'partial');
      assert.strictEqual(descriptor.capabilities.provenanceFidelity.support, 'yes');
      assert.ok(Array.isArray(atprotoCapabilityRows));
      assert.strictEqual(atprotoProtocolDescriptor.protocol, 'atproto');
      assert.strictEqual(typeof descriptor.adapter.normalizeRawEvent, 'function');
      assert.strictEqual(typeof descriptor.converter.toTransport, 'function');
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
