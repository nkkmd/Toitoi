'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('@toitoi/nostr/adapter/ingest_pipeline');
const { persistIngestResult } = require('@toitoi/nostr/storage/persistence');
const { replayStorage } = require('@toitoi/nostr/storage/replay');
const { makeEvent, makeTempDir } = require('@toitoi/nostr/storage/test_fixtures');
const { createStandardApiService } = require('./standard_api_service');
const {
  GOLDEN_PATH_IDS,
  GOLDEN_PATH_RELAY,
  createGoldenPathEvents,
} = require('./fixtures/golden_path');

function findTag(event, name, value) {
  return event.tags.some(tag => Array.isArray(tag) && tag[0] === name && (value === undefined || tag[1] === value));
}

function findLineageTag(event, targetId) {
  return event.tags.find(tag => Array.isArray(tag) && tag[0] === 'e' && tag[1] === targetId);
}

function assertSchemaValidLineageTag(tag, targetId) {
  assert.deepStrictEqual(tag, ['e', targetId, GOLDEN_PATH_RELAY, 'reply']);
  assert.strictEqual(tag.length, 4);
}

function assertFixtureContract(events) {
  assert.strictEqual(events.length, 3);
  assert.deepStrictEqual(events.map(event => event.id), [
    GOLDEN_PATH_IDS.root,
    GOLDEN_PATH_IDS.translated,
    GOLDEN_PATH_IDS.comparison,
  ]);

  for (const event of events) {
    assert.match(event.id, /^[0-9a-f]{64}$/);
    assert.ok(Number.isInteger(event.created_at));
    assert.ok(typeof event.content === 'string' && event.content.length > 0);
    assert.ok(Array.isArray(event.tags));
    assert.ok(findTag(event, 't', 'agroecology'));
  }

  const [root, translated, comparison] = events;
  assert.ok(findTag(root, 'context', 'field_zone'));
  assert.ok(findTag(root, 'relationship', 'microclimate'));

  assert.ok(findTag(translated, 'context', 'climate_zone'));
  assert.ok(translated.tags.some(tag => tag[0] === 'relationship' && tag[1] === 'translated_from' && tag[2] === GOLDEN_PATH_IDS.root));
  assertSchemaValidLineageTag(findLineageTag(translated, GOLDEN_PATH_IDS.root), GOLDEN_PATH_IDS.root);

  assert.ok(comparison.tags.some(tag => tag[0] === 'relationship' && tag[1] === 'observed_alongside' && tag[2] === GOLDEN_PATH_IDS.root));
  assert.ok(comparison.tags.some(tag => tag[0] === 'relationship' && tag[1] === 'observed_alongside' && tag[2] === GOLDEN_PATH_IDS.translated));
  assertSchemaValidLineageTag(findLineageTag(comparison, GOLDEN_PATH_IDS.translated), GOLDEN_PATH_IDS.translated);
}

function run() {
  const sourceEvents = createGoldenPathEvents(makeEvent);
  assertFixtureContract(sourceEvents);

  const ingestResult = ingestNostrEvents(sourceEvents, { skipVerify: true });
  assert.strictEqual(ingestResult.rejected.length, 0);
  assert.strictEqual(ingestResult.accepted.length, 3);

  const storageDir = makeTempDir('toitoi-golden-path-e2e-');
  persistIngestResult(storageDir, ingestResult, {
    source: 'jsonl',
    sourceLabel: 'v0.2.0-golden-path',
  });

  const replayed = replayStorage(storageDir, { persistIndex: false });
  assert.strictEqual(replayed.ingestResult.rejected.length, 0);
  assert.strictEqual(replayed.ingestResult.accepted.length, 3);
  assert.strictEqual(replayed.indexSnapshot.total, 3);

  const [rootCanonical, translatedCanonical, comparisonCanonical] = replayed.ingestResult.accepted
    .map(entry => entry.canonicalEvent);

  assert.strictEqual(replayed.indexSnapshot.sourceIdIndex[GOLDEN_PATH_IDS.root], rootCanonical.id);
  assert.strictEqual(replayed.indexSnapshot.sourceIdIndex[GOLDEN_PATH_IDS.translated], translatedCanonical.id);
  assert.strictEqual(replayed.indexSnapshot.sourceIdIndex[GOLDEN_PATH_IDS.comparison], comparisonCanonical.id);

  assert.ok(translatedCanonical.provenance);
  assert.ok(comparisonCanonical.provenance);
  assert.ok(replayed.indexSnapshot.lineageParentsBySource[translatedCanonical.id].includes(rootCanonical.id));
  assert.ok(replayed.indexSnapshot.lineageParentsBySource[comparisonCanonical.id].includes(translatedCanonical.id));

  const service = createStandardApiService({ indexSnapshot: replayed.indexSnapshot });

  const rootDetail = service.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.root}/detail`,
  });
  assert.strictEqual(rootDetail.statusCode, 200);
  assert.strictEqual(rootDetail.body.event.id, rootCanonical.id);
  assert.ok(rootDetail.body.event.provenance);
  assert.ok(rootDetail.body.references.children.some(child => child.id === translatedCanonical.id));

  const translatedDetail = service.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.translated}/detail`,
  });
  assert.strictEqual(translatedDetail.statusCode, 200);
  assert.ok(translatedDetail.body.references.parents.some(parent => parent.id === rootCanonical.id));
  assert.ok(translatedDetail.body.references.children.some(child => child.id === comparisonCanonical.id));

  const tree = service.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.root}/tree`,
  });
  assert.strictEqual(tree.statusCode, 200);
  assert.strictEqual(tree.body.id, rootCanonical.id);
  assert.strictEqual(tree.body.children[0].id, translatedCanonical.id);
  assert.strictEqual(tree.body.children[0].children[0].id, comparisonCanonical.id);

  const list = service.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries?limit=10&offset=0&order=asc',
  });
  assert.strictEqual(list.statusCode, 200);
  assert.strictEqual(list.body.total, 3);

  const contextQuery = service.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries/query?climate_zone=warm-temperate',
  });
  assert.strictEqual(contextQuery.statusCode, 200);
  assert.strictEqual(contextQuery.body.total, 1);
  assert.strictEqual(contextQuery.body.results[0].event.id, rootCanonical.id);

  const relationQuery = service.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries/relation?relationship=microclimate',
  });
  assert.strictEqual(relationQuery.statusCode, 200);
  assert.strictEqual(relationQuery.body.total, 2);

  console.log('PASS v0.2.0 Golden Path survives ingest, persistence, replay, provenance, lineage, and Standard API access');
}

try {
  run();
} catch (error) {
  console.error('FAIL v0.2.0 Golden Path integration');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
