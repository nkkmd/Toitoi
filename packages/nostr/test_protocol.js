'use strict';

const assert = require('assert');
const {
  createNostrProtocolDescriptor,
  nostrCapabilityRows,
  nostrProtocolDescriptor,
  nostrProtocolRegistry,
} = require('./protocol');

const tests = [
  {
    name: 'nostr protocol descriptor exposes adapter, converter, and capability rows',
    run() {
      const descriptor = createNostrProtocolDescriptor();

      assert.strictEqual(descriptor.protocol, 'nostr');
      assert.strictEqual(descriptor.name, 'Nostr');
      assert.strictEqual(typeof descriptor.adapter.validateRawEvent, 'function');
      assert.strictEqual(typeof descriptor.converter.toTransport, 'function');
      assert.strictEqual(descriptor.capabilities.rawAcquisition.support, 'yes');
      assert.strictEqual(descriptor.capabilities.deleteSemantics.support, 'partial');
      assert.ok(Array.isArray(nostrCapabilityRows));
      assert.ok(nostrCapabilityRows.some(row => row.capability === 'rawAcquisition'));
      assert.strictEqual(nostrProtocolDescriptor.protocol, 'nostr');
      assert.strictEqual(nostrProtocolRegistry.has('nostr'), true);
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
