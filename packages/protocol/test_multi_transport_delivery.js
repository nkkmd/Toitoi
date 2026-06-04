'use strict';

const assert = require('assert');
const {
  executeOutboundFanOutPlan,
} = require('./index');

const tests = [
  {
    name: 'executeOutboundFanOutPlan delivers through injected handlers',
    async run() {
      const canonicalEvent = {
        id: 'tt:evt:01JVVDELIVERY000000000000000000000',
        schemaVersion: '0.3.1',
        type: 'inquiry',
        createdAt: '2026-05-28T00:00:00.000Z',
        body: {
          text: 'microclimate を観察した。',
          language: 'ja',
        },
        provenance: {
          sources: [
            {
              protocol: 'nostr',
              sourceId: 'f'.repeat(64),
            },
          ],
        },
      };

      const calls = [];
      const result = await executeOutboundFanOutPlan(canonicalEvent, {
        protocols: ['nostr', 'atproto'],
        handlers: {
          nostr: async ({ entry, options }) => {
            calls.push({
              protocol: 'nostr',
              kind: entry.transport.kind,
              options,
            });
            return { status: 'ok', published: true };
          },
          atproto: async ({ entry, options }) => {
            calls.push({
              protocol: 'atproto',
              collection: entry.transport.collection,
              options,
            });
            return { status: 'ok', created: true };
          },
        },
        protocolOptions: {
          nostr: { relayUrl: 'wss://relay.example' },
          atproto: { pdsHost: 'https://pds.example' },
        },
        nostr: { relayUrl: 'wss://relay.example' },
        atproto: { pdsHost: 'https://pds.example' },
      });

      assert.strictEqual(result.sourceEventId, canonicalEvent.id);
      assert.strictEqual(result.delivered.length, 2);
      assert.strictEqual(result.quarantined.length, 0);
      assert.strictEqual(result.skipped.length, 0);
      assert.deepStrictEqual(calls.map(call => call.protocol).sort(), ['atproto', 'nostr']);
      assert.strictEqual(result.results[0].status, 'delivered');
    },
  },
  {
    name: 'executeOutboundFanOutPlan retries retryable failures before delivering',
    async run() {
      const canonicalEvent = {
        id: 'tt:evt:01JVVRETRY0000000000000000000000000',
        schemaVersion: '0.3.1',
        type: 'inquiry',
        createdAt: '2026-05-28T00:00:00.000Z',
        body: {
          text: 'retry を確認する。',
          language: 'ja',
        },
      };

      let attempts = 0;
      const result = await executeOutboundFanOutPlan(canonicalEvent, {
        protocols: ['nostr'],
        handlers: {
          nostr: async () => {
            attempts += 1;
            if (attempts === 1) {
              const error = new Error('temporary failure');
              error.retryable = true;
              throw error;
            }
            return { status: 'ok', attempt: attempts };
          },
        },
        retry: {
          retries: 1,
          initialDelayMs: 0,
          maxDelayMs: 0,
        },
      });

      assert.strictEqual(attempts, 2);
      assert.strictEqual(result.delivered.length, 1);
      assert.strictEqual(result.quarantined.length, 0);
      assert.strictEqual(result.results[0].status, 'delivered');
      assert.strictEqual(result.results[0].attempts, 2);
      assert.strictEqual(result.results[0].delivery.attempt, 2);
    },
  },
  {
    name: 'executeOutboundFanOutPlan preserves skipped transport entries',
    async run() {
      const canonicalEvent = {
        id: 'tt:evt:01JVVSKIP0000000000000000000000000',
        schemaVersion: '0.3.1',
        type: 'inquiry',
        createdAt: '2026-05-28T00:00:00.000Z',
        body: {
          text: 'skip を確認する。',
          language: 'ja',
        },
      };

      const result = await executeOutboundFanOutPlan(canonicalEvent, {
        protocols: ['does-not-exist'],
      });

      assert.strictEqual(result.delivered.length, 0);
      assert.strictEqual(result.quarantined.length, 0);
      assert.strictEqual(result.skipped.length, 1);
      assert.strictEqual(result.results[0].status, 'skipped');
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

run().catch(error => {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.stack || error.message : String(error));
});
