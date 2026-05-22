'use strict';

const assert = require('assert');
const {
  createCapability,
  createProtocolDescriptor,
  renderCapabilityRows,
} = require('./protocol_descriptor');

const tests = [
  {
    name: 'createProtocolDescriptor normalizes adapter, converter, and capabilities',
    run() {
      const descriptor = createProtocolDescriptor({
        protocol: 'example',
        name: 'Example',
        adapter: {
          validateRawEvent: () => true,
        },
        converter: {
          toTransport: () => ({}),
        },
        capabilities: {
          rawAcquisition: true,
          ordering: createCapability('partial', 'custom ordering'),
        },
        provenance: {
          rawRef: true,
        },
      });

      assert.strictEqual(descriptor.protocol, 'example');
      assert.strictEqual(descriptor.name, 'Example');
      assert.strictEqual(descriptor.capabilities.rawAcquisition.support, 'yes');
      assert.strictEqual(descriptor.capabilities.ordering.support, 'partial');
      assert.strictEqual(descriptor.provenance.rawRef, true);
    },
  },
  {
    name: 'renderCapabilityRows emits flat capability rows',
    run() {
      const rows = renderCapabilityRows([
        {
          protocol: 'example',
          name: 'Example',
          capabilities: {
            rawAcquisition: createCapability('yes', 'available'),
            storageSnapshot: createCapability('no', 'not available'),
          },
        },
      ]);

      assert.deepStrictEqual(rows, [
        {
          protocol: 'example',
          name: 'Example',
          capability: 'rawAcquisition',
          support: 'yes',
          notes: 'available',
        },
        {
          protocol: 'example',
          name: 'Example',
          capability: 'storageSnapshot',
          support: 'no',
          notes: 'not available',
        },
      ]);
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
