'use strict';

const assert = require('assert');
const { generateSecretKey } = require('nostr-tools');
const {
  publishCanonicalEventToNostrRelay,
  resolveRelayPublisher,
} = require('./outbound');

const tests = [
  {
    name: 'publishCanonicalEventToNostrRelay finalizes and publishes a draft',
    async run() {
      const canonicalEvent = {
        id: 'tt:evt:01JVVNOSTROUT00000000000000000000',
        schemaVersion: '0.1.0',
        type: 'inquiry',
        createdAt: '2026-05-28T00:00:00.000Z',
        body: {
          text: 'Nostr outbound を確認する。',
          language: 'ja',
        },
      };

      let publishedEvent = null;
      const result = await publishCanonicalEventToNostrRelay(canonicalEvent, {
        secretKey: generateSecretKey(),
        publish(event) {
          publishedEvent = event;
        },
        relayUrl: 'wss://relay.example',
      });

      assert.ok(result.draft);
      assert.ok(result.event);
      assert.strictEqual(result.protocol, 'nostr');
      assert.strictEqual(result.relayUrl, 'wss://relay.example');
      assert.strictEqual(publishedEvent.id, result.event.id);
      assert.strictEqual(publishedEvent.kind, result.event.kind);
      assert.strictEqual(publishedEvent.content, canonicalEvent.body.text);
    },
  },
  {
    name: 'resolveRelayPublisher accepts relay instances',
    run() {
      const relay = {
        publish: () => 'ok',
      };

      const publish = resolveRelayPublisher({ relay });
      assert.strictEqual(publish(), 'ok');
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
