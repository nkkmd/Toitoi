'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('../adapter/ingest_pipeline');
const { persistIngestResult } = require('./persistence');
const {
  buildLineageTree,
  findEventsByRelationTerm,
  listEvents,
  lookupEvent,
  searchEvents,
} = require('./indexer');
const { replayStorage } = require('./replay');
const { makeEvent, makeTempDir } = require('./test_fixtures');

const tests = [
  {
    name: 'indexer supports lookup, listing, search, relation, and lineage tree',
    run() {
      const storageDir = makeTempDir();
      const rootId = 'root-event-id-000000000000000000000000000000000000000000000000000000000001';
      const childId = 'child-event-id-0000000000000000000000000000000000000000000000000000000002';
      const otherId = 'other-event-id-0000000000000000000000000000000000000000000000000000000003';

      const ingestResult = ingestNostrEvents([
        makeEvent({
          id: rootId,
          created_at: 1,
          content: 'microclimate が雑草の分布に影響しているかを観察した。',
        }),
        makeEvent({
          id: childId,
          created_at: 2,
          content: 'この問いは root の観察を引き継いでいる。',
          tags: [
            ['t', 'agroecology'],
            ['relationship', 'microclimate', 'weed_flora'],
            ['e', rootId, 'reply'],
            ['phase', 'expert'],
          ],
        }),
        makeEvent({
          id: otherId,
          created_at: 3,
          content: '別のトピックについての問い。',
          tags: [
            ['t', 'agroecology'],
            ['phase', 'beginner'],
          ],
        }),
      ], {
        skipVerify: true,
      });

      persistIngestResult(storageDir, ingestResult, {
        source: 'jsonl',
        sourceLabel: 'fixture',
      });

      const replayed = replayStorage(storageDir, { persistIndex: false });
      const snapshot = replayed.indexSnapshot;
      const rootCanonicalId = replayed.ingestResult.accepted[0].canonicalEvent.id;
      const childCanonicalId = replayed.ingestResult.accepted[1].canonicalEvent.id;

      assert.strictEqual(lookupEvent(snapshot, rootId).id, rootCanonicalId);
      assert.strictEqual(lookupEvent(snapshot, 'missing'), null);

      const listed = listEvents(snapshot, { limit: 10 });
      assert.deepStrictEqual(listed.results.map(event => event.id), [
        replayed.ingestResult.accepted[2].canonicalEvent.id,
        childCanonicalId,
        rootCanonicalId,
      ]);

      const filtered = listEvents(snapshot, { since: 2, until: 2, limit: 10, order: 'asc' });
      assert.deepStrictEqual(filtered.results.map(event => event.id), [childCanonicalId]);

      const searchResults = searchEvents(snapshot, 'microclimate', { limit: 10 });
      assert.deepStrictEqual(searchResults.results.map(event => event.id), [rootCanonicalId, childCanonicalId]);

      const relationResults = findEventsByRelationTerm(snapshot, 'microclimate', { limit: 10 });
      assert.deepStrictEqual(relationResults.results.map(event => event.id), [rootCanonicalId, childCanonicalId]);

      const tree = buildLineageTree(snapshot, rootId);
      assert.ok(tree);
      assert.strictEqual(tree.id, rootCanonicalId);
      assert.strictEqual(tree.children.length, 1);
      assert.strictEqual(tree.children[0].id, childCanonicalId);
      assert.strictEqual(tree.children[0].parent_id, rootCanonicalId);
      assert.deepStrictEqual(tree.children[0].children, []);
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
