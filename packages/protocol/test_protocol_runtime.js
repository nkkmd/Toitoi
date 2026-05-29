'use strict';

const assert = require('assert');
const {
  buildProtocolIntrospectionPayload,
  createProtocolRuntime,
  renderProtocolHelp,
} = require('./protocol_runtime');

const tests = [
  {
    name: 'createProtocolRuntime selects the default protocol and exposes metadata',
    run() {
      const runtime = createProtocolRuntime();

      assert.strictEqual(runtime.selectedProtocol, 'nostr');
      assert.ok(Array.isArray(runtime.availableProtocols));
      assert.ok(runtime.availableProtocols.includes('nostr'));
      assert.ok(runtime.capabilityMatrixMarkdown.includes('| Capability |'));
      assert.strictEqual(runtime.describeSelectedProtocol().protocol, 'nostr');
      assert.strictEqual(typeof runtime.describeSelectedProtocol().adapter.protocol, 'string');
    },
  },
  {
    name: 'createProtocolRuntime can select an explicit protocol',
    run() {
      const runtime = createProtocolRuntime({ protocol: 'atproto' });

      assert.strictEqual(runtime.selectedProtocol, 'atproto');
      assert.strictEqual(runtime.describeSelectedProtocol().protocol, 'atproto');
      assert.strictEqual(runtime.getProtocol('localfs').protocol, 'localfs');
    },
  },
  {
    name: 'buildProtocolIntrospectionPayload returns protocol metadata for startup surfaces',
    run() {
      const payload = buildProtocolIntrospectionPayload(createProtocolRuntime());

      assert.strictEqual(payload.selectedProtocol, 'nostr');
      assert.ok(Array.isArray(payload.availableProtocols));
      assert.ok(Array.isArray(payload.protocols));
      assert.ok(payload.protocols.some(protocol => protocol.protocol === 'nostr'));
    },
  },
  {
    name: 'renderProtocolHelp summarizes the selected protocol',
    run() {
      const help = renderProtocolHelp(createProtocolRuntime({ protocol: 'atproto' }));

      assert.ok(help.includes('Available protocols:'));
      assert.ok(help.includes('Selected protocol: atproto'));
      assert.ok(help.includes('atproto (ATProto)'));
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
