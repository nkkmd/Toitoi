'use strict';

const assert = require('assert');
const fixture = require('../fixtures/minimal-publish-request.json');
const { publishCanonicalEventToLingonberry } = require('./outbound');

const tests = [
  {
    name: 'publishCanonicalEventToLingonberry publishes a converted object',
    async run() {
      const originalFetch = global.fetch;
      const calls = [];
      global.fetch = async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ status: 'ok', id: 'lb:obj:example' }),
        };
      };

      try {
        const result = await publishCanonicalEventToLingonberry({
          id: 'tt:evt:example',
          schemaVersion: '0.1.0',
          type: 'inquiry',
          createdAt: '2026-06-17T00:00:00Z',
          body: {
            text: 'How does shade affect weed flora?',
            language: 'en',
          },
          provenance: {
            sources: [{ protocol: 'lingonberry', sourceId: 'fixture' }],
          },
        }, {
          carrierUrl: 'https://relay.example',
          publisher: fixture.publisher,
        });

        assert.strictEqual(result.protocol, 'lingonberry');
        assert.strictEqual(result.object.schemaVersion, '0.1.0');
        assert.strictEqual(result.published.status, 'ok');
        assert.strictEqual(calls.length, 1);
        assert.strictEqual(JSON.parse(calls[0].init.body).object.body.text, 'How does shade affect weed flora?');
      } finally {
        global.fetch = originalFetch;
      }
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
