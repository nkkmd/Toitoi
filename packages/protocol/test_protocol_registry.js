'use strict';

const assert = require('assert');
const {
  createCapability,
  createProtocolDescriptor,
} = require('./protocol_descriptor');
const {
  createProtocolRegistry,
  renderCapabilityMatrixMarkdown,
} = require('./protocol_registry');

const tests = [
  {
    name: 'createProtocolRegistry registers and lists descriptors',
    run() {
      const registry = createProtocolRegistry();
      registry.add({
        protocol: 'nostr',
        name: 'Nostr',
        adapter: {
          validateRawEvent: () => true,
        },
        converter: {
          toTransport: () => ({}),
        },
        capabilities: {
          rawAcquisition: true,
        },
      });

      assert.strictEqual(registry.has('nostr'), true);
      assert.strictEqual(registry.get('nostr').name, 'Nostr');
      assert.strictEqual(registry.list().length, 1);
      assert.strictEqual(registry.capabilityRows().length, 1);
    },
  },
  {
    name: 'createProtocolRegistry rejects duplicate protocol registration',
    run() {
      const registry = createProtocolRegistry([
        {
          protocol: 'nostr',
          name: 'Nostr',
          adapter: {
            validateRawEvent: () => true,
          },
          converter: {
            toTransport: () => ({}),
          },
          capabilities: {
            rawAcquisition: true,
          },
        },
      ]);

      assert.throws(() => {
        registry.add({
          protocol: 'nostr',
          name: 'Duplicate',
          adapter: {
            validateRawEvent: () => true,
          },
          converter: {
            toTransport: () => ({}),
          },
          capabilities: {
            rawAcquisition: createCapability('partial', 'duplicate'),
          },
        });
      }, /Protocol already registered: nostr/);
    },
  },
  {
    name: 'renderCapabilityMatrixMarkdown renders a capability matrix',
    run() {
      const registry = createProtocolRegistry([
        createProtocolDescriptor({
          protocol: 'nostr',
          name: 'Nostr',
          adapter: {
            validateRawEvent: () => true,
          },
          converter: {
            toTransport: () => ({}),
          },
          capabilities: {
            rawAcquisition: true,
            replayability: createCapability('yes', 'append-only'),
          },
        }),
        createProtocolDescriptor({
          protocol: 'atproto',
          name: 'ATProto',
          adapter: {
            validateRawEvent: () => true,
          },
          converter: {
            toTransport: () => ({}),
          },
          capabilities: {
            rawAcquisition: createCapability('unknown', 'not implemented yet'),
            replayability: createCapability('unknown', 'not implemented yet'),
          },
        }),
      ]);

      const markdown = renderCapabilityMatrixMarkdown(registry.list());
      assert.ok(markdown.includes('| Capability | atproto | nostr |'));
      assert.ok(markdown.includes('rawAcquisition'));
      assert.ok(markdown.includes('replayability'));
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
