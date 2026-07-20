'use strict';

const assert = require('node:assert/strict');
const { createCanonicalPublisher } = require('./canonical_publisher');

async function run() {
  const persisted = [];
  const storageModule = {
    persistIngestResult(storageDir, ingestResult, options) {
      persisted.push({ storageDir, ingestResult, options });
      return {
        batchId: 'batch-publication-1',
        canonicalRecordIds: ['canonical-record-1'],
        rawRecordIds: ['raw-record-1'],
      };
    },
  };
  const publisher = createCanonicalPublisher({
    storageDir: '/tmp/toitoi-publication-test',
    storageModule,
    protocolRuntime: { listProtocols: () => [], getProtocol: () => null },
    deliver: async (event) => ({
      sourceEventId: event.id,
      delivered: [{ protocol: 'nostr', attempts: 2, delivery: { ok: true } }],
      skipped: [{ protocol: 'atproto', reason: 'credentials unavailable' }],
      quarantined: [{ protocol: 'lingonberry', reason: 'temporary failure' }],
    }),
    now: () => '2026-07-20T01:00:00.000Z',
  });

  const result = await publisher({
    id: 'tt:evt:inquiry-1',
    type: 'inquiry',
    body: { text: '雨後の土壌水分は根の状態とどう関係するか？', language: 'ja' },
    createdAt: '2026-07-20T00:59:00.000Z',
    meta: { publication: { draftId: 'tt:draft:inquiry-1' } },
  }, { draftId: 'tt:draft:inquiry-1' });

  assert.equal(result.canonicalEvent.meta.publication.publishedAt, '2026-07-20T01:00:00.000Z');
  assert.deepEqual(result.canonicalEvent.meta.publication.delivery.delivered, [{ protocol: 'nostr', attempts: 2 }]);
  assert.equal(result.canonicalEvent.meta.publication.delivery.skipped[0].protocol, 'atproto');
  assert.equal(result.canonicalEvent.meta.publication.delivery.quarantined[0].protocol, 'lingonberry');
  assert.equal(result.storage.batchId, 'batch-publication-1');
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].options.source, 'canonical-publication');
  assert.equal(persisted[0].ingestResult.processedEvents[0].canonicalEvent.id, 'tt:evt:inquiry-1');
  assert.match(persisted[0].ingestResult.processedEvents[0].errors[0], /lingonberry/);

  console.log('v0.6.0 canonical publisher passed');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
