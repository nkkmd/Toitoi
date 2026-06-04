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
const { makeEvent, makeTempDir: makeNostrTempDir } = require('../nostr/storage/test_fixtures');
const {
  buildOutboundFanOutPlan,
  replayMultiTransportStorage,
} = require('./index');

const tests = [
  {
    name: 'replayMultiTransportStorage merges replayed sources with explicit identity mapping',
    run() {
      const nostrStorageDir = makeNostrTempDir();
      const atprotoStorageDir = makeAtProtoTempDir();
      const nostrRawId = 'd'.repeat(64);
      const atprotoRawUri = 'at://did:plc:toitoi123/app.toitoi.inquiry/multi-transport';
      const sharedCanonicalId = 'tt:evt:01JVVMULTITRANSPORT000000000000000';

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
          rkey: 'multi-transport',
          createdAt: '2026-05-28T00:00:02.000Z',
          indexedAt: '2026-05-28T00:00:03.000Z',
          record: {
            type: 'inquiry',
            text: 'microclimate を観察した。',
            language: 'ja',
          },
        }),
      ]);
      persistAtProtoIngestResult(atprotoStorageDir, atprotoIngest, {
        source: 'jsonl',
        sourceLabel: 'atproto-fixture',
      });

      const merged = replayMultiTransportStorage([
        {
          protocol: 'nostr',
          storageDir: nostrStorageDir,
          replayStorage: replayNostrStorage,
        },
        {
          protocol: 'atproto',
          storageDir: atprotoStorageDir,
          replayStorage: replayAtProtoStorage,
        },
      ], {
        identityMapping: {
          [nostrRawId]: sharedCanonicalId,
          [atprotoRawUri]: sharedCanonicalId,
        },
      });

      assert.strictEqual(merged.indexSnapshot.total, 1);
      assert.strictEqual(merged.canonicalEvents.length, 1);
      assert.strictEqual(merged.identityIndex.bySourceId[nostrRawId], sharedCanonicalId);
      assert.strictEqual(merged.identityIndex.bySourceId[atprotoRawUri], sharedCanonicalId);

      const service = createStandardApiService({
        indexSnapshot: merged.indexSnapshot,
      });
      const list = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries?limit=10' });

      assert.strictEqual(list.statusCode, 200);
      assert.strictEqual(list.body.total, 1);
      assert.strictEqual(list.body.results[0].event.id, sharedCanonicalId);
      assert.strictEqual(list.body.results[0].provenance.sourceCount, 2);
    },
  },
  {
    name: 'buildOutboundFanOutPlan emits ready drafts and quarantines unsupported transports',
    run() {
      const canonicalEvent = {
        id: 'tt:evt:01JVVOUTBOUNDPLAN00000000000000000',
        schemaVersion: '0.3.1',
        type: 'inquiry',
        createdAt: '2026-05-28T00:00:00.000Z',
        body: {
          text: 'microclimate は雑草の分布に影響するか？',
          language: 'ja',
        },
        labels: ['agroecology'],
        contexts: {
          climate_zone: 'warm-temperate',
        },
        relationships: [
          { source: 'microclimate', target: 'weed_flora' },
        ],
        phase: 'expert',
        lineage: [],
        provenance: {
          sources: [
            {
              protocol: 'nostr',
              sourceId: 'e'.repeat(64),
            },
          ],
        },
      };

      const plan = buildOutboundFanOutPlan(canonicalEvent);

      assert.strictEqual(plan.sourceEventId, canonicalEvent.id);
      assert.strictEqual(plan.ready.length, 2);
      assert.strictEqual(plan.quarantined.length, 1);
      assert.strictEqual(plan.skipped.length, 0);

      const readyProtocols = plan.ready.map(entry => entry.protocol).sort();
      assert.deepStrictEqual(readyProtocols, ['atproto', 'nostr']);

      const nostrEntry = plan.ready.find(entry => entry.protocol === 'nostr');
      const atprotoEntry = plan.ready.find(entry => entry.protocol === 'atproto');
      assert.ok(nostrEntry);
      assert.ok(atprotoEntry);
      assert.strictEqual(nostrEntry.transport.kind, 1042);
      assert.strictEqual(atprotoEntry.transport.collection, 'app.toitoi.inquiry');

      const quarantinedProtocols = plan.quarantined.map(entry => entry.protocol);
      assert.deepStrictEqual(quarantinedProtocols, ['localfs']);
      assert.ok(plan.quarantined[0].reason.includes('not implemented'));
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
