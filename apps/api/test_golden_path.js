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
  const ingestResult = ingestNostrEvents(createGoldenPathEvents(makeEvent), {
    skipVerify: true,
  });

  assert.strictEqual(ingestResult.rejected.length, 0);
  assert.strictEqual(ingestResult.accepted.length, 3);

  persistIngestResult(storageDir, ingestResult, {
    source: 'jsonl',
    sourceLabel: 'v0.2.0-golden-path',
  });

  const replayed = replayStorage(storageDir, { persistIndex: false });
  const service = createStandardApiService({
    indexSnapshot: replayed.indexSnapshot,
  });

  const root = service.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.root}/detail`,
  });
  assert.strictEqual(root.statusCode, 200);
  assert.strictEqual(root.body.event.id, GOLDEN_PATH_IDS.root);
  assert.ok(root.body.event.provenance);
  assert.ok(root.body.references.children.some(child => child.id === GOLDEN_PATH_IDS.translated));

  const translated = service.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.translated}/detail`,
  });
  assert.strictEqual(translated.statusCode, 200);
  assert.ok(translated.body.references.parents.some(parent => parent.id === GOLDEN_PATH_IDS.root));
  assert.ok(translated.body.references.children.some(child => child.id === GOLDEN_PATH_IDS.comparison));

  const tree = service.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.root}/tree`,
  });
  assert.strictEqual(tree.statusCode, 200);
  assert.strictEqual(tree.body.id, GOLDEN_PATH_IDS.root);
  assert.strictEqual(tree.body.children[0].id, GOLDEN_PATH_IDS.translated);
  assert.strictEqual(tree.body.children[0].children[0].id, GOLDEN_PATH_IDS.comparison);

  const contextQuery = service.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries/query?field_zone=east',
  });
  assert.strictEqual(contextQuery.statusCode, 200);
  assert.strictEqual(contextQuery.body.total, 2);

  const relationQuery = service.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries/relation?relationship=translated_from',
  });
  assert.strictEqual(relationQuery.statusCode, 200);
  assert.strictEqual(relationQuery.body.total, 1);
  assert.strictEqual(relationQuery.body.results[0].event.id, GOLDEN_PATH_IDS.translated);

  console.log('PASS v0.2.0 golden path is reproducible through ingest, replay, API, provenance, and lineage');
}

try {
  run();
} catch (error) {
  console.error('FAIL v0.2.0 golden path');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
