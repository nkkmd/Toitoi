'use strict';

const assert = require('assert');
const { createStandardApiService } = require('../../apps/api/standard_api_service');
const { ingestAtProtoEvents } = require('../atproto/adapter/ingest_pipeline');
const { replayStorage: replayAtProtoStorage } = require('../atproto/storage/replay');
const { persistIngestResult: persistAtProtoIngestResult } = require('../atproto/storage/persistence');
const { makeAtProtoRecord, makeTempDir: makeAtProtoTempDir } = require('../atproto/test_fixtures');
const { ingestNostrEvents } = require('../nostr/adapter/ingest_pipeline');
const { replayStorage: replayNostrStorage } = require('../nostr/storage/replay');
const { persistIngestResult: persistNostrIngestResult } = require('../nostr/storage/persistence');
const { lookupEvent } = require('../nostr/storage/indexer');
const { makeEvent, makeTempDir: makeNostrTempDir } = require('../nostr/storage/test_fixtures');
const {
  buildDerivedIndexFromCanonicalEvents,
  composeMultiTransportIndexSnapshot,
  mergeCanonicalEventsByIdentity,
} = require('./multi_transport');

function runReplay(storageDir, replayStorage, options = {}) {
  return replayStorage(storageDir, {
    persistIndex: false,
    ...options,
  });
}

function buildCombinedSnapshot(canonicalEvents, options = {}) {
  const merged = mergeCanonicalEventsByIdentity(canonicalEvents, options);
  return buildDerivedIndexFromCanonicalEvents(merged.canonicalEvents, {
    identityIndex: merged.identityIndex,
  });
}

function getCanonicalEvent(replayResult, sourceId) {
  const indexSnapshot = replayResult && replayResult.indexSnapshot
    ? replayResult.indexSnapshot
    : replayResult;
  const event = lookupEvent(indexSnapshot, sourceId);
  assert.ok(event, `expected event for ${sourceId}`);
  return event;
}

const tests = [
  {
    name: 'transport ingest suppresses same-source duplicates',
    run() {
      const nostrId = 'f'.repeat(64);
      const nostrIngest = ingestNostrEvents([
        makeEvent({ id: nostrId, created_at: 1 }),
        makeEvent({ id: nostrId, created_at: 1 }),
      ], {
        skipVerify: true,
      });

      assert.strictEqual(nostrIngest.accepted.length, 1);
      assert.strictEqual(nostrIngest.duplicates.length, 1);

      const atprotoUri = 'at://did:plc:toitoi123/app.toitoi.inquiry/duplicate';
      const atprotoIngest = ingestAtProtoEvents([
        makeAtProtoRecord({
          uri: atprotoUri,
          rkey: 'duplicate',
          createdAt: '2026-05-28T00:00:00.000Z',
          indexedAt: '2026-05-28T00:00:01.000Z',
        }),
        makeAtProtoRecord({
          uri: atprotoUri,
          rkey: 'duplicate',
          createdAt: '2026-05-28T00:00:00.000Z',
          indexedAt: '2026-05-28T00:00:01.000Z',
        }),
      ]);

      assert.strictEqual(atprotoIngest.accepted.length, 1);
      assert.strictEqual(atprotoIngest.duplicates.length, 1);
    },
  },
  {
    name: 'cross-source events remain distinct without explicit mapping',
    run() {
      const nostrStorageDir = makeNostrTempDir();
      const atprotoStorageDir = makeAtProtoTempDir();
      const nostrRawId = 'a'.repeat(64);
      const atprotoRawUri = 'at://did:plc:toitoi123/app.toitoi.inquiry/cross-source';

      const nostrIngest = ingestNostrEvents([
        makeEvent({
          id: nostrRawId,
          created_at: 1,
          content: 'microclimate が雑草の分布に影響しているかを観察した。',
        }),
      ], {
        skipVerify: true,
      });
      persistNostrIngestResult(nostrStorageDir, nostrIngest, {
        source: 'jsonl',
        sourceLabel: 'nostr-fixture',
      });

      const atprotoIngest = ingestAtProtoEvents([
        makeAtProtoRecord({
          uri: atprotoRawUri,
          rkey: 'cross-source',
          createdAt: '2026-05-28T00:00:02.000Z',
          indexedAt: '2026-05-28T00:00:03.000Z',
          record: {
            type: 'inquiry',
            text: 'microclimate が雑草の分布に影響しているかを観察した。',
            language: 'ja',
            phase: 'expert',
            relationships: [
              { source: 'microclimate', target: 'weed_flora' },
            ],
          },
        }),
      ]);
      persistAtProtoIngestResult(atprotoStorageDir, atprotoIngest, {
        source: 'jsonl',
        sourceLabel: 'atproto-fixture',
      });

      const nostrReplay = runReplay(nostrStorageDir, replayNostrStorage);
      const atprotoReplay = runReplay(atprotoStorageDir, replayAtProtoStorage);

      const combined = buildCombinedSnapshot([
        ...nostrReplay.ingestResult.accepted.map(item => item.canonicalEvent),
        ...atprotoReplay.ingestResult.accepted.map(item => item.canonicalEvent),
      ]);

      assert.strictEqual(combined.total, 2);
      assert.strictEqual(Object.keys(combined.byId).length, 2);

      const service = createStandardApiService({
        indexSnapshot: combined,
      });
      const list = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries?limit=10' });

      assert.strictEqual(list.statusCode, 200);
      assert.strictEqual(list.body.total, 2);
      assert.ok(list.body.results.every(item => item.provenance.sourceCount === 1));
    },
  },
  {
    name: 'explicit identity mapping collapses cross-source provenance',
    run() {
      const nostrStorageDir = makeNostrTempDir();
      const atprotoStorageDir = makeAtProtoTempDir();
      const nostrRawId = 'b'.repeat(64);
      const atprotoRawUri = 'at://did:plc:toitoi123/app.toitoi.inquiry/shared-identity';
      const sharedCanonicalId = 'tt:evt:01JVVSHAREDIDENTITY00000000000000000';

      const nostrIngest = ingestNostrEvents([
        makeEvent({
          id: nostrRawId,
          created_at: 1,
          content: 'microclimate と soil_moisture の関係を見ている。',
        }),
      ], {
        skipVerify: true,
      });
      persistNostrIngestResult(nostrStorageDir, nostrIngest, {
        source: 'jsonl',
        sourceLabel: 'nostr-fixture',
      });

      const atprotoIngest = ingestAtProtoEvents([
        makeAtProtoRecord({
          uri: atprotoRawUri,
          rkey: 'shared-identity',
          createdAt: '2026-05-28T00:00:02.000Z',
          indexedAt: '2026-05-28T00:00:03.000Z',
          record: {
            type: 'inquiry',
            text: 'microclimate と soil_moisture の関係を見ている。',
            language: 'ja',
            phase: 'expert',
          },
        }),
      ]);
      persistAtProtoIngestResult(atprotoStorageDir, atprotoIngest, {
        source: 'jsonl',
        sourceLabel: 'atproto-fixture',
      });

      const nostrReplay = runReplay(nostrStorageDir, replayNostrStorage);
      const atprotoReplay = runReplay(atprotoStorageDir, replayAtProtoStorage);
      const merged = composeMultiTransportIndexSnapshot([
        ...nostrReplay.ingestResult.accepted.map(item => item.canonicalEvent),
        ...atprotoReplay.ingestResult.accepted.map(item => item.canonicalEvent),
      ], {
        identityMapping: {
          [nostrRawId]: sharedCanonicalId,
          [atprotoRawUri]: sharedCanonicalId,
        },
      });

      assert.strictEqual(merged.indexSnapshot.total, 1);
      assert.strictEqual(merged.canonicalEvents.length, 1);
      assert.strictEqual(merged.indexSnapshot.canonicalIdentityIndex.bySourceId[nostrRawId], sharedCanonicalId);
      assert.strictEqual(merged.indexSnapshot.canonicalIdentityIndex.bySourceId[atprotoRawUri], sharedCanonicalId);

      const service = createStandardApiService({
        indexSnapshot: merged.indexSnapshot,
      });
      const list = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries?limit=10' });
      const lookupByNostr = service.handleRequest({ method: 'GET', url: `/api/v1/inquiries/${nostrRawId}` });
      const lookupByAtproto = lookupEvent(merged.indexSnapshot, atprotoRawUri);

      assert.strictEqual(list.statusCode, 200);
      assert.strictEqual(list.body.total, 1);
      assert.strictEqual(list.body.results[0].event.id, sharedCanonicalId);
      assert.strictEqual(list.body.results[0].provenance.sourceCount, 2);
      assert.deepStrictEqual(
        list.body.results[0].provenance.sourceProtocols.slice().sort(),
        ['atproto', 'nostr']
      );
      assert.strictEqual(lookupByNostr.statusCode, 200);
      assert.strictEqual(lookupByNostr.body.id, sharedCanonicalId);
      assert.ok(lookupByAtproto);
      assert.strictEqual(lookupByAtproto.id, sharedCanonicalId);
    },
  },
  {
    name: 'ambiguous cross-source lineage is retained without merge',
    run() {
      const nostrStorageDir = makeNostrTempDir();
      const atprotoStorageDir = makeAtProtoTempDir();
      const rootRawId = 'c'.repeat(64);
      const childRawUri = 'at://did:plc:toitoi123/app.toitoi.inquiry/ambiguous-child';

      const nostrIngest = ingestNostrEvents([
        makeEvent({
          id: rootRawId,
          created_at: 1,
          content: 'root の観察。',
        }),
      ], {
        skipVerify: true,
      });
      persistNostrIngestResult(nostrStorageDir, nostrIngest, {
        source: 'jsonl',
        sourceLabel: 'nostr-fixture',
      });

      const atprotoIngest = ingestAtProtoEvents([
        makeAtProtoRecord({
          uri: childRawUri,
          rkey: 'ambiguous-child',
          createdAt: '2026-05-28T00:00:02.000Z',
          indexedAt: '2026-05-28T00:00:03.000Z',
          record: {
            type: 'inquiry',
            text: 'root の観察を引き継ぐ。',
            language: 'ja',
            phase: 'expert',
            lineage: [
              { type: 'derived_from', target: rootRawId },
            ],
          },
        }),
      ]);
      persistAtProtoIngestResult(atprotoStorageDir, atprotoIngest, {
        source: 'jsonl',
        sourceLabel: 'atproto-fixture',
      });

      const nostrReplay = runReplay(nostrStorageDir, replayNostrStorage);
      const atprotoReplay = runReplay(atprotoStorageDir, replayAtProtoStorage);
      const combined = buildCombinedSnapshot([
        ...nostrReplay.ingestResult.accepted.map(item => item.canonicalEvent),
        ...atprotoReplay.ingestResult.accepted.map(item => item.canonicalEvent),
      ]);

      const rootEvent = getCanonicalEvent(combined, rootRawId);
      const childEvent = getCanonicalEvent(combined, childRawUri);
      const service = createStandardApiService({
        indexSnapshot: combined,
      });
      const tree = service.handleRequest({ method: 'GET', url: `/api/v1/inquiries/${rootEvent.id}/tree` });

      assert.strictEqual(combined.total, 2);
      assert.strictEqual(tree.statusCode, 200);
      assert.strictEqual(tree.body.id, rootEvent.id);
      assert.strictEqual(tree.body.children.length, 1);
      assert.strictEqual(tree.body.children[0].id, childEvent.id);
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
