'use strict';

const assert = require('assert');
const {
  ingestRelaySubscription,
  ingestRelayUrl,
  isRetryableRelayError,
} = require('./relay_ingest');

function makeEvent(overrides = {}) {
  return {
    kind: 1042,
    id: 'b00d9066bde5ea98b035866f0a5e11dea3afd72bd21e2f837246e26be9a40177',
    pubkey: 'c8170cf2e55db4bdfe4d34b3b453ab2352e81c47801f7d9ae08e7997d27f3d68',
    created_at: 1778244850,
    content: '雑草の生え方が場所によって違うのはなぜ？',
    tags: [
      ['t', 'agroecology'],
      ['context', 'climate_zone', 'warm-temperate'],
      ['phase', 'intermediate'],
    ],
    sig: 'b8a8a2f56cb3b697b1fbe8dabc858d0226153a36500b87bc091ed229127b5bb457535387a4630bf55cffee9752af34df18c02f8a6f0ab14dba53cee2936a33cb',
    ...overrides,
  };
}

function makeRelay(events) {
  return {
    subscribe(filters, handlers) {
      assert.deepStrictEqual(filters, [{ kinds: [1042] }]);
      for (const event of events) {
        handlers.onevent(event);
      }
      handlers.oneose();
      return { close() {} };
    },
  };
}

function makeClosingRelay(reason) {
  return {
    subscribe(filters, handlers) {
      assert.deepStrictEqual(filters, [{ kinds: [1042] }]);
      handlers.onclose(reason);
      return { close() {} };
    },
  };
}

const tests = [
  {
    name: 'ingestRelaySubscription classifies relay events',
    async run() {
      const result = await ingestRelaySubscription(
        makeRelay([
          makeEvent({ id: 'a', created_at: 1 }),
          makeEvent({ id: 'a', created_at: 2 }),
          makeEvent({ id: 'b', created_at: 3, content: '' }),
        ]),
        { kinds: [1042] },
        { skipVerify: true }
      );

      assert.strictEqual(result.accepted.length, 1);
      assert.strictEqual(result.duplicates.length, 1);
      assert.strictEqual(result.invalid.length, 1);
      assert.strictEqual(result.unverified.length, 1);
    },
  },
  {
    name: 'ingestRelayUrl retries transient relay failures',
    async run() {
      let attempt = 0;
      const calls = [];
      const relay = makeRelay([makeEvent({ id: 'a', created_at: 1 })]);

      const result = await ingestRelayUrl(
        'wss://relay.example.com',
        { kinds: [1042] },
        {
          skipVerify: true,
          retry: {
            retries: 2,
            initialDelayMs: 0,
            maxDelayMs: 0,
            factor: 2,
          },
          connectRelay: async () => {
            attempt += 1;
            if (attempt < 3) {
              const error = new Error('socket hang up');
              error.code = attempt === 1 ? 'ECONNRESET' : 'ETIMEDOUT';
              throw error;
            }
            return relay;
          },
          onRetry({ attempt: nextAttempt, delayMs, error }) {
            calls.push({
              attempt: nextAttempt,
              delayMs,
              error: error.message,
            });
          },
        }
      );

      assert.strictEqual(result.accepted.length, 1);
      assert.strictEqual(attempt, 3);
      assert.deepStrictEqual(calls, [
        { attempt: 1, delayMs: 0, error: 'socket hang up' },
        { attempt: 2, delayMs: 0, error: 'socket hang up' },
      ]);
    },
  },
  {
    name: 'ingestRelaySubscription rejects early relay close',
    async run() {
      await assert.rejects(
        ingestRelaySubscription(
          makeClosingRelay('relay closed before EOSE'),
          { kinds: [1042] },
          { skipVerify: true }
        ),
        /relay closed before EOSE/i
      );
    },
  },
  {
    name: 'isRetryableRelayError separates transient and permanent failures',
    run() {
      assert.strictEqual(isRetryableRelayError(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' })), true);
      assert.strictEqual(isRetryableRelayError(new Error('invalid signature')), false);
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
