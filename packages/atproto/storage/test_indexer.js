'use strict';

const assert = require('assert');
const { ingestAtProtoEvents } = require('../adapter/ingest_pipeline');
const { persistIngestResult } = require('./persistence');
const {
  buildLineageTree,
  findEventsByRelationTerm,
  listEvents,
  lookupEvent,
  searchEvents,
} = require('./indexer');
const { replayStorage } = require('./replay');
const { makeAtProtoRecord, makeTempDir } = require('../test_fixtures');

const tests = [
  {
    name: 'ATProto indexer supports lookup, listing, search, relation, and lineage tree',
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
          relationships: [{ source: 'microclimate', target: 'weed_flora' }],
          phase: 'expert',
          labels: ['agroecology'],
        },
      });
      const child = makeAtProtoRecord({
        uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/child',
        rkey: 'child',
        createdAt: '2026-05-28T00:00:01.000Z',
        record: {
          type: 'inquiry',
          text: 'この問いは root の観察を引き継いでいる。',
          language: 'ja',
          relationships: [{ source: 'microclimate', target: 'weed_flora' }],
          lineage: [{ type: 'derived_from', target: root.uri }],
          phase: 'expert',
        },
      });

      const ingestResult = ingestAtProtoEvents([root, child]);
      persistIngestResult(storageDir, ingestResult, {
        source: 'jsonl',
        sourceLabel: 'fixture',
      });

      const replayed = replayStorage(storageDir, { persistIndex: false });
      const snapshot = replayed.indexSnapshot;
      const rootCanonicalId = lookupEvent(snapshot, root.uri).id;
      const childCanonicalId = lookupEvent(snapshot, child.uri).id;

      assert.strictEqual(lookupEvent(snapshot, root.uri).id, rootCanonicalId);
      assert.strictEqual(lookupEvent(snapshot, 'missing'), null);

      const listed = listEvents(snapshot, { limit: 10 });
      assert.deepStrictEqual(listed.results.map(event => event.id), [
        childCanonicalId,
        rootCanonicalId,
      ]);

      const searchResults = searchEvents(snapshot, 'microclimate', { limit: 10 });
      assert.deepStrictEqual(searchResults.results.map(event => event.id), [rootCanonicalId, childCanonicalId]);

      const relationResults = findEventsByRelationTerm(snapshot, 'microclimate', { limit: 10 });
      assert.deepStrictEqual(relationResults.results.map(event => event.id), [childCanonicalId, rootCanonicalId]);

      const tree = buildLineageTree(snapshot, root.uri);
      assert.ok(tree);
      assert.strictEqual(tree.id, rootCanonicalId);
      assert.strictEqual(tree.children.length, 1);
      assert.strictEqual(tree.children[0].id, childCanonicalId);
      assert.strictEqual(tree.children[0].parent_id, rootCanonicalId);
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
