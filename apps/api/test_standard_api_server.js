'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ingestAtProtoEvents } = require('@toitoi/atproto/adapter/ingest_pipeline');
const { lookupEvent } = require('@toitoi/atproto/storage/indexer');
const { persistIngestResult } = require('@toitoi/atproto/storage/persistence');
const { makeAtProtoRecord } = require('@toitoi/atproto/test_fixtures');
const { createProtocolStorageRuntime } = require('@toitoi/protocol');
const { createStandardApiService } = require('./standard_api_service');
const { loadIndexSnapshotFromOptions } = require('./server');

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
        /does not expose a replayStorage implementation/
      );
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
