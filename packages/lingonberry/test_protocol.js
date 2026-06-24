'use strict';

const assert = require('assert');
const fixture = require('./fixtures/minimal-publish-request.json');
const {
  createLingonberryProtocolDescriptor,
  lingonberryCapabilityRows,
  lingonberryProtocolDescriptor,
  convertCanonicalToLingonberryObject,
  fromTransportToCanonicalLingonberry,
} = require('./protocol');

const tests = [
  {
    name: 'lingonberry protocol descriptor exposes transport wiring',
    run() {
      const descriptor = createLingonberryProtocolDescriptor();

      assert.strictEqual(descriptor.protocol, 'lingonberry');
      assert.strictEqual(descriptor.name, 'Lingonberry');
      assert.strictEqual(descriptor.capabilities.rawAcquisition.support, 'yes');
      assert.strictEqual(descriptor.capabilities.identityVerification.support, 'yes');
      assert.ok(Array.isArray(lingonberryCapabilityRows));
      assert.strictEqual(lingonberryProtocolDescriptor.protocol, 'lingonberry');
      assert.strictEqual(typeof descriptor.adapter.normalizeRawEvent, 'function');
      assert.strictEqual(typeof descriptor.adapter.ingestFromRelayUrl, 'function');
      assert.strictEqual(typeof descriptor.converter.toTransport, 'function');
    },
  },
  {
    name: 'lingonberry protocol descriptor ingests from carrier URL',
    async run() {
      const originalFetch = global.fetch;
      global.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({ objects: [fixture] }),
      });

      try {
        const descriptor = createLingonberryProtocolDescriptor();
        const result = await descriptor.adapter.ingestFromRelayUrl('https://relay.example', { limit: 10 }, { skipVerify: true });

        assert.strictEqual(result.accepted.length, 1);
        assert.strictEqual(result.accepted[0].canonicalEvent.rawRef.protocol, 'lingonberry');
      } finally {
        global.fetch = originalFetch;
      }
    },
  },
  {
    name: 'lingonberry fixture canonicalizes to Toitoi canonical event',
    run() {
      const descriptor = createLingonberryProtocolDescriptor();
      const canonicalization = descriptor.adapter.canonicalizeRawEvent(fixture, { skipVerify: true });

      assert.strictEqual(canonicalization.ok, true);
      assert.strictEqual(canonicalization.canonicalEvent.type, 'inquiry');
      assert.strictEqual(canonicalization.canonicalEvent.body.text, 'What evidence supports this claim?');
      assert.strictEqual(canonicalization.canonicalEvent.rawRef.protocol, 'lingonberry');
      assert.strictEqual(canonicalization.canonicalEvent.provenance.sources[0].objectId, 'lb:obj:toitoi-example-0001');
      assert.ok(canonicalization.canonicalEvent.id.startsWith('tt:evt:'));
    },
  },
  {
    name: 'canonical event converts to Lingonberry knowledge object',
    run() {
      const object = convertCanonicalToLingonberryObject({
        id: 'tt:evt:example',
        type: 'inquiry',
        createdAt: '2026-06-17T00:00:00Z',
        body: {
          text: 'How does field edge shade affect weed flora?',
          language: 'en',
        },
        contexts: {
          site: 'field-edge',
        },
        relationships: [
          { source: 'shade', target: 'weed_flora' },
        ],
      });

      assert.strictEqual(object.schemaVersion, '0.1.0');
      assert.strictEqual(object.type, 'inquiry');
      assert.strictEqual(object.body.language, 'en');
      assert.strictEqual(object.relations[0].target, 'weed_flora');
      assert.strictEqual(fromTransportToCanonicalLingonberry(object).body.text, object.body.text);
    },
  },
];

async function run() {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
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
