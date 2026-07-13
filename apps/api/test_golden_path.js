'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('@toitoi/nostr/adapter/ingest_pipeline');
const { makeEvent } = require('@toitoi/nostr/storage/test_fixtures');
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

function run() {
  const events = createGoldenPathEvents(makeEvent);

  assert.strictEqual(events.length, 3);
  assert.deepStrictEqual(events.map(event => event.id), [
    GOLDEN_PATH_IDS.root,
    GOLDEN_PATH_IDS.translated,
    GOLDEN_PATH_IDS.comparison,
  ]);

  for (const event of events) {
    assert.match(event.id, /^[0-9a-f]{64}$/);
    assert.ok(findTag(event, 't', 'agroecology'));
  }

  assert.deepStrictEqual(
    findLineageTag(events[1], GOLDEN_PATH_IDS.root),
    ['e', GOLDEN_PATH_IDS.root, GOLDEN_PATH_RELAY, 'reply'],
  );
  assert.deepStrictEqual(
    findLineageTag(events[2], GOLDEN_PATH_IDS.translated),
    ['e', GOLDEN_PATH_IDS.translated, GOLDEN_PATH_RELAY, 'reply'],
  );

  const ingestResult = ingestNostrEvents(events, { skipVerify: true });
  assert.strictEqual(ingestResult.rejected.length, 0);
  assert.strictEqual(ingestResult.accepted.length, 3);
  assert.ok(ingestResult.accepted.every(entry => entry.canonicalEvent && entry.canonicalEvent.provenance));

  console.log('PASS v0.2.0 Golden Path fixture is accepted by the Nostr ingest pipeline');
}

try {
  run();
} catch (error) {
  console.error('FAIL v0.2.0 Golden Path ingest integration');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
