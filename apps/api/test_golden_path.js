'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('@toitoi/nostr/adapter/ingest_pipeline');
const { persistIngestResult } = require('@toitoi/nostr/storage/persistence');
const { replayStorage } = require('@toitoi/nostr/storage/replay');
const { makeEvent, makeTempDir } = require('@toitoi/nostr/storage/test_fixtures');
const { createStandardApiService } = require('./standard_api_service');
const { GOLDEN_PATH_IDS, createGoldenPathEvents } = require('./fixtures/golden_path');

function run() {
  const storageDir = makeTempDir('toitoi-golden-path-');
  const events = createGoldenPathEvents(makeEvent);

  assert.strictEqual(events.length, 3);
  for (const event of events) {
    assert.match(event.id, /^[0-9a-f]{64}$/);
  }

  const ingestResult = ingestNostrEvents(events, { skipVerify: true });
  assert.strictEqual(ingestResult.rejected.length, 0);
  assert.strictEqual(ingestResult.accepted.length, 3);

  persistIngestResult(storageDir, ingestResult, {
    source: 'jsonl',
    sourceLabel: 'v0.2.0-golden-path',
  });

  const replayed = replayStorage(storageDir, { persistIndex: false });
  assert.strictEqual(replayed.ingestResult.rejected.length, 0);
  assert.strictEqual(replayed.ingestResult.accepted.length, 3);
  assert.strictEqual(replayed.indexSnapshot.total, 3);

  const canonicalBySourceId = new Map(
    replayed.ingestResult.accepted.map(record => [record.rawEvent.id, record.canonicalEvent]),
  );
  const root = canonicalBySourceId.get(GOLDEN_PATH_IDS.root);
  const translated = canonicalBySourceId.get(GOLDEN_PATH_IDS.translated);
  const comparison = canonicalBySourceId.get(GOLDEN_PATH_IDS.comparison);

  assert.ok(root);
  assert.ok(translated);
  assert.ok(comparison);
  assert.ok(root.provenance && Array.isArray(root.provenance.sources));
  assert.ok(root.provenance.sources.length > 0);
  assert.ok(translated.lineage.some(edge => edge.target === GOLDEN_PATH_IDS.root));
  assert.ok(comparison.lineage.some(edge => edge.target === GOLDEN_PATH_IDS.translated));

  const service = createStandardApiService({ indexSnapshot: replayed.indexSnapshot });
  const list = service.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries?limit=10&offset=0&order=asc',
  });
  assert.strictEqual(list.statusCode, 200);
  assert.strictEqual(list.body.total, 3);
  assert.deepStrictEqual(
    list.body.results.map(result => result.event.id),
    [GOLDEN_PATH_IDS.root, GOLDEN_PATH_IDS.translated, GOLDEN_PATH_IDS.comparison],
  );

  console.log('PASS v0.2.0 golden path is reproducible through ingest, persistence, replay, provenance, lineage, and Standard API');
}

try {
  run();
} catch (error) {
  console.error('FAIL v0.2.0 golden path');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
