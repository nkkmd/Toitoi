'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Relay } = require('nostr-tools');
const WebSocket = require('ws');

const { createStandardApiService } = require('../../apps/api/standard_api_service');
const { ingestAtProtoEvents } = require('../atproto/adapter/ingest_pipeline');
const { publishCanonicalEventToAtProto } = require('../atproto/live/outbound');
const { getRecord, extractRecordRkey } = require('../atproto/live/atproto_client');
const { persistIngestResult: persistAtProtoIngestResult } = require('../atproto/storage/persistence');
const { replayStorage: replayAtProtoStorage } = require('../atproto/storage/replay');
const { publishCanonicalEventToNostrRelay } = require('../nostr/live/outbound');
const { ingestRelayUrl } = require('../nostr/adapter/relay_ingest');
const { persistIngestResult: persistNostrIngestResult } = require('../nostr/storage/persistence');
const { replayStorage: replayNostrStorage } = require('../nostr/storage/replay');
const {
  composeMultiTransportIndexSnapshot,
} = require('./multi_transport');

function isEnabled() {
  return process.env.TOITOI_LIVE_MULTI_TRANSPORT_TEST === '1';
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeLiveCanonicalEvent() {
  return {
    id: 'tt:evt:01JVVLIVEMULTITRANSPORT000000000',
    schemaVersion: '0.3.1',
    type: 'inquiry',
    createdAt: '2026-05-28T00:00:00.000Z',
    body: {
      text: 'Live multi-transport canonical event smoke test.',
      language: 'en',
    },
    labels: ['agroecology'],
    contexts: {
      climate_zone: 'warm-temperate',
    },
    phase: 'expert',
  };
}

function logStep(message, details) {
  if (details === undefined) {
    console.log(`[STEP] ${message}`);
    return;
  }

  console.log(`[STEP] ${message}: ${details}`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required`);
  }

  return value.trim();
}

function connectRelay(relayUrl) {
  global.WebSocket = WebSocket;
  return Relay.connect(relayUrl);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPublishedNostrEvent(relayUrl, eventId) {
  let lastResult = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    lastResult = await ingestRelayUrl(relayUrl, { ids: [eventId] }, {
      skipVerify: true,
      retry: {
        retries: 0,
        initialDelayMs: 0,
        maxDelayMs: 0,
        factor: 2,
      },
    });

    if (lastResult.accepted.length > 0) {
      return lastResult;
    }

    await sleep(1000);
  }

  const observed = lastResult ? lastResult.accepted.length : 0;
  throw new Error(`published Nostr event ${eventId} was not observed on relay ${relayUrl} (accepted=${observed})`);
}

function persistAndReplayNostr(storageDir, ingestResult, sourceLabel) {
  persistNostrIngestResult(storageDir, ingestResult, {
    source: 'live',
    sourceLabel,
  });

  return replayNostrStorage(storageDir, {
    persistIndex: false,
  });
}

function persistAndReplayAtProto(storageDir, ingestResult, sourceLabel) {
  persistAtProtoIngestResult(storageDir, ingestResult, {
    source: 'live',
    sourceLabel,
  });

  return replayAtProtoStorage(storageDir, {
    persistIndex: false,
  });
}

const tests = [
  {
    name: 'live multi-transport publish collapses to one canonical id',
    async run() {
      if (!isEnabled()) {
        console.log('[SKIP] live multi-transport test is gated by TOITOI_LIVE_MULTI_TRANSPORT_TEST=1');
        return;
      }

      const relayUrl = requireEnv('NOSTR_RELAY_URL');
      const nostrSecretKey = requireEnv('NOSTR_SECRET_KEY');
      const pdsHost = requireEnv('ATPROTO_PDS_HOST');
      const identifier = requireEnv('ATPROTO_HANDLE');
      const password = requireEnv('ATPROTO_APP_PASSWORD');

      const canonicalEvent = makeLiveCanonicalEvent();
      const sharedCanonicalId = canonicalEvent.id;
      const nostrStorageDir = makeTempDir('toitoi-live-nostr-');
      const atprotoStorageDir = makeTempDir('toitoi-live-atproto-');

      logStep('canonical id to verify', sharedCanonicalId);

      const nostrRelay = await connectRelay(relayUrl);
      try {
        logStep('publishing to Nostr relay', relayUrl);
        const nostrPublished = await publishCanonicalEventToNostrRelay(canonicalEvent, {
          relay: nostrRelay,
          relayUrl,
          secretKey: nostrSecretKey,
        });

        assert.ok(nostrPublished.event);
        assert.ok(nostrPublished.event.id);
        logStep('Nostr relay event id', nostrPublished.event.id);
        assert.notStrictEqual(nostrPublished.event.id, sharedCanonicalId);

        const nostrObserved = await fetchPublishedNostrEvent(relayUrl, nostrPublished.event.id);
        logStep('Nostr relay fetch confirmed', `${relayUrl} -> ${nostrPublished.event.id}`);
        const nostrReplay = persistAndReplayNostr(
          nostrStorageDir,
          nostrObserved,
          relayUrl,
        );
        const nostrCanonicalEvent = nostrReplay.ingestResult.accepted[0]?.canonicalEvent;
        assert.ok(nostrCanonicalEvent);
        assert.strictEqual(nostrCanonicalEvent.body.text, canonicalEvent.body.text);

        logStep('publishing to ATProto PDS', pdsHost);
        const atprotoPublished = await publishCanonicalEventToAtProto(canonicalEvent, {
          pdsHost,
          sessionOptions: {
            pdsHost,
            identifier,
            password,
          },
        });

        assert.ok(atprotoPublished.session);
        assert.ok(atprotoPublished.created);
        assert.ok(atprotoPublished.created.uri);
        assert.ok(atprotoPublished.created.cid);
        logStep('ATProto record uri', atprotoPublished.created.uri);

        const fetchedRecord = await getRecord({
          pdsHost,
          repo: atprotoPublished.session.did,
          collection: atprotoPublished.draft.collection,
          uri: atprotoPublished.created.uri,
        });

        assert.ok(fetchedRecord && typeof fetchedRecord.value === 'object');

        logStep('ATProto getRecord confirmed', `${pdsHost} -> ${atprotoPublished.created.uri}`);
        const atprotoRawRecord = {
          uri: atprotoPublished.created.uri,
          cid: atprotoPublished.created.cid,
          did: atprotoPublished.session.did,
          collection: atprotoPublished.draft.collection,
          rkey: extractRecordRkey(atprotoPublished.created.uri),
          createdAt: atprotoPublished.draft.record.createdAt,
          record: fetchedRecord.value,
        };

        const atprotoIngest = ingestAtProtoEvents([atprotoRawRecord]);
        assert.strictEqual(atprotoIngest.accepted.length, 1);

        const atprotoReplay = persistAndReplayAtProto(
          atprotoStorageDir,
          atprotoIngest,
          pdsHost,
        );
        const atprotoCanonicalEvent = atprotoReplay.ingestResult.accepted[0]?.canonicalEvent;
        assert.ok(atprotoCanonicalEvent);
        assert.strictEqual(atprotoCanonicalEvent.body.text, canonicalEvent.body.text);

        const merged = composeMultiTransportIndexSnapshot([
          nostrCanonicalEvent,
          atprotoCanonicalEvent,
        ], {
          identityMapping: {
            [nostrPublished.event.id]: sharedCanonicalId,
            [atprotoPublished.created.uri]: sharedCanonicalId,
          },
        });

        assert.strictEqual(merged.indexSnapshot.total, 1);
        assert.strictEqual(merged.canonicalEvents.length, 1);
        assert.strictEqual(merged.indexSnapshot.byId[sharedCanonicalId].id, sharedCanonicalId);
        assert.strictEqual(merged.indexSnapshot.canonicalIdentityIndex.bySourceId[nostrPublished.event.id], sharedCanonicalId);
        assert.strictEqual(merged.indexSnapshot.canonicalIdentityIndex.bySourceId[atprotoPublished.created.uri], sharedCanonicalId);
        logStep('canonical merge confirmed', sharedCanonicalId);

        const service = createStandardApiService({
          indexSnapshot: merged.indexSnapshot,
        });

        const list = service.handleRequest({
          method: 'GET',
          url: '/api/v1/inquiries?limit=10',
        });
        assert.strictEqual(list.statusCode, 200);
        assert.strictEqual(list.body.total, 1);
        assert.strictEqual(list.body.results[0].event.id, sharedCanonicalId);
        assert.strictEqual(list.body.results[0].provenance.sourceCount, 2);

        const lookupByNostr = service.handleRequest({
          method: 'GET',
          url: `/api/v1/inquiries/${nostrPublished.event.id}`,
        });
        const lookupByAtProto = service.handleRequest({
          method: 'GET',
          url: `/api/v1/inquiries/${atprotoPublished.created.uri}`,
        });

        assert.strictEqual(lookupByNostr.statusCode, 200);
        assert.strictEqual(lookupByNostr.body.id, sharedCanonicalId);
        assert.strictEqual(lookupByAtProto.statusCode, 200);
        assert.strictEqual(lookupByAtProto.body.id, sharedCanonicalId);
      } finally {
        if (nostrRelay && typeof nostrRelay.close === 'function') {
          try {
            nostrRelay.close();
          } catch (error) {
            // Best-effort cleanup only.
          }
        }
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

run().catch(error => {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.stack || error.message : String(error));
});
