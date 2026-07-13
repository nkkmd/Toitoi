'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('../nostr/adapter/ingest_pipeline');
const { publishCanonicalEventToNostrRelay } = require('../nostr/live/outbound');
const { ingestLingonberryEvents } = require('../lingonberry/adapter/ingest_pipeline');
const { getObject } = require('../lingonberry/live/http_client');
const { publishCanonicalEventToLingonberry } = require('../lingonberry/live/outbound');

function makeCanonicalEvent() {
  return {
    id: 'tt:evt:01H8JQK7YB0B4Z1K0P0W0M0N1L',
    schemaVersion: '0.1.0',
    type: 'inquiry',
    createdAt: '2026-07-13T00:00:00.000Z',
    body: {
      text: '畑の東側だけ雑草の種類が違うのは、微気候と関係しているだろうか。',
      language: 'ja',
    },
    labels: ['agroecology'],
  };
}

function makeNostrSecretKey() {
  return new Uint8Array(32).fill(1);
}

async function testNostrRoundTrip(canonicalEvent) {
  let relayEvent = null;
  const published = await publishCanonicalEventToNostrRelay(canonicalEvent, {
    secretKey: makeNostrSecretKey(),
    relayUrl: 'wss://operational-smoke.invalid',
    publish(event) {
      relayEvent = JSON.parse(JSON.stringify(event));
    },
  });

  assert.strictEqual(published.protocol, 'nostr');
  assert.ok(relayEvent);
  assert.strictEqual(relayEvent.id, published.event.id);
  assert.strictEqual(relayEvent.content, canonicalEvent.body.text);

  const ingested = ingestNostrEvents([relayEvent]);
  assert.strictEqual(ingested.invalid.length, 0);
  assert.strictEqual(ingested.accepted.length, 1);

  const roundTripped = ingested.accepted[0].canonicalEvent;
  assert.ok(roundTripped);
  assert.strictEqual(roundTripped.body.text, canonicalEvent.body.text);
  assert.ok(roundTripped.provenance);
  assert.ok(roundTripped.provenance.sources.some(source => source.protocol === 'nostr'));

  return roundTripped;
}

async function testLingonberryRoundTrip(canonicalEvent) {
  const originalFetch = global.fetch;
  let storedObject = null;

  global.fetch = async (url, options = {}) => {
    const method = options.method || 'GET';

    if (method === 'POST' && url === 'https://carrier.operational-smoke.invalid/v1/objects') {
      const request = JSON.parse(options.body);
      storedObject = JSON.parse(JSON.stringify(request.object));
      return {
        ok: true,
        status: 201,
        statusText: 'Created',
        async text() {
          return JSON.stringify({ accepted: true, id: storedObject.id });
        },
      };
    }

    if (method === 'GET' && storedObject && url.endsWith(`/v1/objects/${encodeURIComponent(storedObject.id)}`)) {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        async text() {
          return JSON.stringify(storedObject);
        },
      };
    }

    throw new Error(`unexpected operational smoke request: ${method} ${url}`);
  };

  try {
    const published = await publishCanonicalEventToLingonberry(canonicalEvent, {
      carrierUrl: 'https://carrier.operational-smoke.invalid',
      publicKey: '1'.repeat(64),
      signature: '2'.repeat(128),
    });

    assert.strictEqual(published.protocol, 'lingonberry');
    assert.ok(published.object.id.startsWith('lb:obj:'));
    assert.ok(published.published.accepted);

    const fetched = await getObject({
      carrierUrl: 'https://carrier.operational-smoke.invalid',
      id: published.object.id,
    });
    assert.deepStrictEqual(fetched, storedObject);

    const ingested = ingestLingonberryEvents([fetched], { skipVerify: true });
    assert.strictEqual(ingested.invalid.length, 0);
    assert.strictEqual(ingested.accepted.length, 1);

    const roundTripped = ingested.accepted[0].canonicalEvent;
    assert.ok(roundTripped);
    assert.strictEqual(roundTripped.body.text, canonicalEvent.body.text);
    assert.ok(roundTripped.provenance);
    assert.ok(roundTripped.provenance.sources.some(source => source.protocol === 'lingonberry'));

    return roundTripped;
  } finally {
    global.fetch = originalFetch;
  }
}

async function run() {
  const canonicalEvent = makeCanonicalEvent();
  const nostrEvent = await testNostrRoundTrip(canonicalEvent);
  const lingonberryEvent = await testLingonberryRoundTrip(canonicalEvent);

  assert.strictEqual(nostrEvent.body.text, lingonberryEvent.body.text);
  console.log('PASS Nostr and Lingonberry publish, retrieve, and re-ingest the v0.2.0 operational smoke inquiry');
}

run().catch(error => {
  process.exitCode = 1;
  console.error('FAIL primary transport operational smoke');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
});
