'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('../adapter/ingest_pipeline');
const { persistIngestResult } = require('./persistence');
const {
  projectCanonicalEvent,
  projectEventDetailView,
  projectEventListView,
  projectEventLookupView,
  projectLineageView,
  projectRelationView,
  projectSearchView,
} = require('./standard_api_views');
const { replayStorage } = require('./replay');
const { makeEvent, makeTempDir } = require('./test_fixtures');

const tests = [
  {
    name: 'standard API views project canonical and provenance data without highlight',
    run() {
      const storageDir = makeTempDir('toitoi-standard-api-');
      const rootId = 'root-event-id-000000000000000000000000000000000000000000000000000000000001';
      const childId = 'child-event-id-0000000000000000000000000000000000000000000000000000000002';

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
      ], {
        skipVerify: true,
      });

      persistIngestResult(storageDir, ingestResult, {
        source: 'jsonl',
        sourceLabel: 'fixture',
      });

      const replayed = replayStorage(storageDir, { persistIndex: false });
      const rootCanonical = replayed.ingestResult.accepted[0].canonicalEvent;
      const childCanonical = replayed.ingestResult.accepted[1].canonicalEvent;

      const projected = projectCanonicalEvent(rootCanonical);
      assert.strictEqual(projected.id, rootCanonical.id);
      assert.ok(projected.provenance);
      assert.strictEqual(projected.provenance.sourceCount, 1);
      assert.ok(!Object.prototype.hasOwnProperty.call(projected, 'highlight'));

      const detail = projectEventDetailView(replayed.indexSnapshot, rootId);
      assert.ok(detail);
      assert.strictEqual(detail.event.id, rootCanonical.id);
      assert.strictEqual(detail.references.children[0].id, childCanonical.id);

      const listView = projectEventListView(replayed.indexSnapshot, { limit: 10 });
      assert.strictEqual(listView.total, 2);
      assert.strictEqual(listView.results[0].event.id, childCanonical.id);

      const relationView = projectRelationView(replayed.indexSnapshot, 'microclimate', { limit: 10 });
      assert.strictEqual(relationView.total, 2);

      const searchView = projectSearchView(replayed.indexSnapshot, 'microclimate', { limit: 10 });
      assert.strictEqual(searchView.total, 2);

      const lookupView = projectEventLookupView(replayed.indexSnapshot, rootId);
      assert.strictEqual(lookupView.id, rootCanonical.id);

      const tree = projectLineageView(replayed.indexSnapshot, rootId);
      assert.strictEqual(tree.id, rootCanonical.id);
      assert.strictEqual(tree.children.length, 1);
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
