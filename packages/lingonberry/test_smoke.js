'use strict';

const assert = require('assert');
const { getObject } = require('./live/http_client');
const { publishCanonicalEventToLingonberry } = require('./live/outbound');

function isEnabled() {
  return process.env.LINGONBERRY_LIVE_SMOKE_TEST === '1';
}

function makeSmokeCanonical() {
  return {
    id: 'tt:evt:01H8JQK7YB0B4Z1K0P0W0M0N1L',
    schemaVersion: '0.1.0',
    type: 'inquiry',
    createdAt: new Date().toISOString(),
    body: {
      text: 'Toitoi Lingonberry live smoke test.',
      language: 'en',
    },
    provenance: {
      sources: [
        {
          protocol: 'lingonberry',
          sourceId: 'smoke',
        },
      ],
    },
  };
}

const tests = [
  {
    name: 'Lingonberry live smoke test publishes one gated object',
    async run() {
      if (!isEnabled()) {
        console.log('[SKIP] Lingonberry live smoke test is gated by LINGONBERRY_LIVE_SMOKE_TEST=1');
        return;
      }

      const result = await publishCanonicalEventToLingonberry(makeSmokeCanonical(), {
        carrierUrl: process.env.LINGONBERRY_CARRIER_URL,
        publicKey: process.env.LINGONBERRY_PUBLISHER_PUBLIC_KEY,
        privateKey: process.env.LINGONBERRY_PUBLISHER_PRIVATE_KEY,
      });

      assert.strictEqual(result.protocol, 'lingonberry');
      assert.ok(result.object.id.startsWith('lb:obj:'));
      assert.ok(result.published);

      const fetched = await getObject({
        carrierUrl: process.env.LINGONBERRY_CARRIER_URL,
        id: result.object.id,
      });

      assert.ok(fetched);
      console.log(`PASS live smoke publish ${result.object.id}`);
    },
  },
];

async function run() {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
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
