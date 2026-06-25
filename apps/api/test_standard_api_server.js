'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ingestNostrEvents } = require('@toitoi/nostr/adapter/ingest_pipeline');
const { persistIngestResult: persistNostrIngestResult } = require('@toitoi/nostr/storage/persistence');
const { makeEvent } = require('@toitoi/nostr/storage/test_fixtures');
const { ingestAtProtoEvents } = require('@toitoi/atproto/adapter/ingest_pipeline');
const { lookupEvent } = require('@toitoi/atproto/storage/indexer');
const { persistIngestResult } = require('@toitoi/atproto/storage/persistence');
const { makeAtProtoRecord } = require('@toitoi/atproto/test_fixtures');
const lingonberryFixture = require('../../packages/lingonberry/fixtures/minimal-publish-request.json');
const { ingestLingonberryEvents } = require('../../packages/lingonberry/adapter/ingest_pipeline');
const { persistIngestResult: persistLingonberryIngestResult } = require('../../packages/lingonberry/storage/persistence');
const { createProtocolStorageRuntime } = require('@toitoi/protocol');
const { createStandardApiService } = require('./standard_api_service');
const {
  createMultiTransportStorageRuntime,
  describeProtocolStorage,
  loadIndexSnapshotFromOptions,
} = require('./server');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-api-server-'));
}

const tests = [
  {
    name: 'loadIndexSnapshotFromOptions resolves ATProto storage replay',
    run() {
      const storageDir = makeTempDir();
      const root = makeAtProtoRecord({
        uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/root',
        rkey: 'root',
        createdAt: '2026-05-28T00:00:00.000Z',
        record: {
          type: 'inquiry',
          text: 'microclimate が雑草の分布に影響しているかを観察した。',
          language: 'ja',
          phase: 'expert',
        },
      });

      const ingestResult = ingestAtProtoEvents([root]);
      persistIngestResult(storageDir, ingestResult, {
        source: 'jsonl',
        sourceLabel: 'fixture',
      });

      const getIndexSnapshot = loadIndexSnapshotFromOptions({
        storageDir,
        protocol: 'atproto',
      });
      const snapshot = getIndexSnapshot();

      assert.strictEqual(snapshot.total, 1);
      assert.ok(lookupEvent(snapshot, root.uri));

      const service = createStandardApiService({
        getIndexSnapshot,
        protocol: 'atproto',
        protocolStorageRuntime: createProtocolStorageRuntime({
          protocol: 'atproto',
          loadReplayModule(protocol) {
            if (protocol === 'atproto') {
              return require('@toitoi/atproto/storage/replay');
            }
            return null;
          },
        }),
        storageModule: require('@toitoi/atproto/storage'),
      });
      const canonicalId = lookupEvent(snapshot, root.uri).id;

      const protocols = service.handleRequest({ method: 'GET', url: '/api/v1/protocols' });
      assert.strictEqual(protocols.statusCode, 200);
      assert.strictEqual(protocols.body.selectedProtocol, 'atproto');
      assert.strictEqual(protocols.body.selectionSource, 'explicit');
      assert.strictEqual(protocols.body.storage.protocol, 'atproto');
      assert.strictEqual(protocols.body.storage.selectionSource, 'protocol');
      assert.ok(protocols.body.availableProtocols.includes('atproto'));
      const atprotoProtocol = protocols.body.protocols.find(protocol => protocol.protocol === 'atproto');
      assert.ok(atprotoProtocol);
      assert.strictEqual(atprotoProtocol.provenancePolicy.semanticSource, 'canonical');
      assert.strictEqual(atprotoProtocol.provenancePolicy.rawRef, true);

      const lookup = service.handleRequest({ method: 'GET', url: `/api/v1/inquiries/${canonicalId}` });
      assert.strictEqual(lookup.statusCode, 200);
      assert.strictEqual(lookup.body.id, canonicalId);

      const health = service.handleRequest({ method: 'GET', url: '/health' });
      assert.strictEqual(health.statusCode, 200);
      assert.strictEqual(health.body.storage.supported, true);
      assert.strictEqual(health.body.storage.protocol, 'atproto');
      assert.strictEqual(health.body.storage.selectionSource, 'protocol');
    },
  },
  {
    name: 'loadIndexSnapshotFromOptions resolves Lingonberry storage replay',
    run() {
      const storageDir = makeTempDir();
      const ingestResult = ingestLingonberryEvents([lingonberryFixture], {
        skipVerify: true,
      });
      persistLingonberryIngestResult(storageDir, ingestResult, {
        source: 'jsonl',
        sourceLabel: 'fixture',
      });

      const getIndexSnapshot = loadIndexSnapshotFromOptions({
        storageDir,
        protocol: 'lingonberry',
      });
      const snapshot = getIndexSnapshot();

      assert.strictEqual(snapshot.total, 1);
      assert.ok(lookupEvent(snapshot, 'draft:toitoi-example-0001'));

      const service = createStandardApiService({
        getIndexSnapshot,
        protocol: 'lingonberry',
        protocolStorageRuntime: createProtocolStorageRuntime({
          protocol: 'lingonberry',
          loadReplayModule(protocol) {
            if (protocol === 'lingonberry') {
              return require('../../packages/lingonberry/storage/replay');
            }
            return null;
          },
        }),
        storageModule: require('../../packages/lingonberry/storage'),
        describeProtocolStorage,
      });
      const canonicalId = lookupEvent(snapshot, 'draft:toitoi-example-0001').id;

      const protocols = service.handleRequest({ method: 'GET', url: '/api/v1/protocols' });
      assert.strictEqual(protocols.statusCode, 200);
      assert.ok(protocols.body.availableProtocols.includes('lingonberry'));
      assert.strictEqual(protocols.body.storage.protocol, 'lingonberry');
      assert.strictEqual(protocols.body.storage.supported, true);
      const lingonberryProtocol = protocols.body.protocols.find(protocol => protocol.protocol === 'lingonberry');
      assert.ok(lingonberryProtocol);
      assert.strictEqual(lingonberryProtocol.provenancePolicy.semanticSource, 'canonical');
      assert.strictEqual(lingonberryProtocol.provenancePolicy.rawRef, true);

      const protocolDetail = service.handleRequest({ method: 'GET', url: '/api/v1/protocols/lingonberry' });
      assert.strictEqual(protocolDetail.statusCode, 200);
      assert.strictEqual(protocolDetail.body.storage.supported, true);

      const lookup = service.handleRequest({ method: 'GET', url: `/api/v1/inquiries/${canonicalId}` });
      assert.strictEqual(lookup.statusCode, 200);
      assert.strictEqual(lookup.body.id, canonicalId);

      const health = service.handleRequest({ method: 'GET', url: '/health' });
      assert.strictEqual(health.statusCode, 200);
      assert.strictEqual(health.body.storage.supported, true);
      assert.strictEqual(health.body.storage.protocol, 'lingonberry');
    },
  },
  {
    name: 'loadIndexSnapshotFromOptions rejects protocols without replay storage',
    run() {
      assert.throws(
        () => loadIndexSnapshotFromOptions({
          storageDir: makeTempDir(),
          protocol: 'localfs',
        }),
        /registered, but does not expose a replayStorage implementation/
      );
    },
  },
  {
    name: 'loadIndexSnapshotFromOptions rejects unknown protocols separately from unsupported storage',
    run() {
      assert.throws(
        () => loadIndexSnapshotFromOptions({
          storageDir: makeTempDir(),
          protocol: 'missing-protocol',
        }),
        /Unknown protocol: missing-protocol/
      );
    },
  },
  {
    name: 'loadIndexSnapshotFromOptions merges multi-transport snapshots for the API',
    run() {
      const nostrStorageDir = makeTempDir();
      const atprotoStorageDir = makeTempDir();
      const lingonberryStorageDir = makeTempDir();
      const nostrRawId = 'f'.repeat(64);
      const atprotoRawUri = 'at://did:plc:toitoi123/app.toitoi.inquiry/api-fan-in';
      const lingonberryRawSourceId = 'draft:toitoi-example-0001';
      const sharedCanonicalId = 'tt:evt:01JVVAPIFANIN000000000000000000000';

      const nostrIngest = ingestNostrEvents([
        makeEvent({
          id: nostrRawId,
          created_at: 1,
          content: 'microclimate を観察した。',
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
          rkey: 'api-fan-in',
          createdAt: '2026-05-28T00:00:02.000Z',
          indexedAt: '2026-05-28T00:00:03.000Z',
          record: {
            type: 'inquiry',
            text: 'microclimate を観察した。',
            language: 'ja',
          },
        }),
      ]);
      persistIngestResult(atprotoStorageDir, atprotoIngest, {
        source: 'jsonl',
        sourceLabel: 'atproto-fixture',
      });

      const lingonberryIngest = ingestLingonberryEvents([lingonberryFixture], {
        skipVerify: true,
      });
      persistLingonberryIngestResult(lingonberryStorageDir, lingonberryIngest, {
        source: 'jsonl',
        sourceLabel: 'lingonberry-fixture',
      });

      const getIndexSnapshot = loadIndexSnapshotFromOptions({
        transportSources: [
          {
            protocol: 'nostr',
            storageDir: nostrStorageDir,
          },
          {
            protocol: 'atproto',
            storageDir: atprotoStorageDir,
          },
          {
            protocol: 'lingonberry',
            storageDir: lingonberryStorageDir,
          },
        ],
        identityMapping: {
          [nostrRawId]: sharedCanonicalId,
          [atprotoRawUri]: sharedCanonicalId,
          [lingonberryRawSourceId]: sharedCanonicalId,
        },
      });
      const snapshot = getIndexSnapshot();

      assert.strictEqual(snapshot.total, 1);
      assert.ok(lookupEvent(snapshot, nostrRawId));
      assert.ok(lookupEvent(snapshot, atprotoRawUri));
      assert.ok(lookupEvent(snapshot, lingonberryRawSourceId));

      const service = createStandardApiService({
        getIndexSnapshot,
        protocolStorageRuntime: createMultiTransportStorageRuntime([
          { protocol: 'nostr', storageDir: nostrStorageDir },
          { protocol: 'atproto', storageDir: atprotoStorageDir },
          { protocol: 'lingonberry', storageDir: lingonberryStorageDir },
        ]),
        storageModule: require('@toitoi/nostr/storage'),
      });

      const health = service.handleRequest({ method: 'GET', url: '/health' });
      assert.strictEqual(health.statusCode, 200);
      assert.strictEqual(health.body.storage.protocol, 'multi-transport');
      assert.strictEqual(health.body.storage.selectionSource, 'TOITOI_TRANSPORT_SOURCES');
      assert.strictEqual(health.body.storage.sourceCount, 3);

      const protocols = service.handleRequest({ method: 'GET', url: '/api/v1/protocols' });
      assert.strictEqual(protocols.statusCode, 200);
      assert.strictEqual(protocols.body.storage.protocol, 'multi-transport');
      assert.strictEqual(protocols.body.storage.sourceCount, 3);

      const list = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries?limit=10' });
      assert.strictEqual(list.statusCode, 200);
      assert.strictEqual(list.body.total, 1);
      assert.strictEqual(list.body.results[0].event.id, sharedCanonicalId);
      assert.strictEqual(list.body.results[0].provenance.sourceCount, 3);
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
