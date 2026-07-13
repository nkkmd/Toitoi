'use strict';

const assert = require('assert');
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

function run() {
  const events = createGoldenPathEvents(options => ({ ...options }));

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

  console.log('PASS v0.2.0 Golden Path fixture uses schema-valid lineage tags');
}

try {
  run();
} catch (error) {
  console.error('FAIL v0.2.0 Golden Path fixture');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
