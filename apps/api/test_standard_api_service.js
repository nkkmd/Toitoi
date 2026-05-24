'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('@toitoi/nostr/adapter/ingest_pipeline');
const { persistIngestResult } = require('@toitoi/nostr/storage/persistence');
const { replayStorage } = require('@toitoi/nostr/storage/replay');
const { makeEvent, makeTempDir } = require('@toitoi/nostr/storage/test_fixtures');
const { createStandardApiService } = require('./standard_api_service');

const tests = [
  {
    name: 'standard API service returns canonical views through HTTP routes',
    run() {
      const storageDir = makeTempDir('toitoi-standard-api-');
      const rootId = 'root-event-id-000000000000000000000000000000000000000000000000000000000001';
      const childId = 'child-event-id-0000000000000000000000000000000000000000000000000000000002';
      const dslId = 'dsl-event-id-0000000000000000000000000000000000000000000000000000000003';

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
          id: dslId,
          created_at: 3,
          content: 'DSL で微気候モデルを定義している。',
          tags: [
            ['t', 'agroecology'],
            ['context', 'climate_zone', 'warm-temperate'],
            ['dsl:model', 'm1', 'microclimate_model'],
            ['dsl:var', 'm1', 'microclimate', 'independent'],
            ['dsl:var', 'm1', 'weed_flora', 'dependent'],
            ['dsl:rel', 'm1', 'microclimate', 'weed_flora'],
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
      const dslCanonical = replayed.ingestResult.accepted[2].canonicalEvent;
      const service = createStandardApiService({
        indexSnapshot: replayed.indexSnapshot,
      });

      const health = service.handleRequest({ method: 'GET', url: '/health' });
      assert.strictEqual(health.statusCode, 200);
      assert.strictEqual(health.body.status, 'ok');
      assert.ok(typeof health.body.timestamp === 'string');

      const lookup = service.handleRequest({ method: 'GET', url: `/api/v1/inquiries/${rootId}` });
      assert.strictEqual(lookup.statusCode, 200);
      assert.strictEqual(lookup.body.id, rootCanonical.id);
      assert.ok(lookup.body.provenance);
      assert.ok(!Object.prototype.hasOwnProperty.call(lookup.body, 'highlight'));

      const detail = service.handleRequest({ method: 'GET', url: `/api/v1/inquiries/${rootId}/detail` });
      assert.strictEqual(detail.statusCode, 200);
      assert.strictEqual(detail.body.event.id, rootCanonical.id);
      assert.strictEqual(detail.body.references.children[0].id, childCanonical.id);

      const list = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries?limit=10&offset=0&order=desc' });
      assert.strictEqual(list.statusCode, 200);
      assert.strictEqual(list.body.total, 3);
      assert.strictEqual(list.body.results[0].event.id, dslCanonical.id);

      const pagedList = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries?limit=1&offset=1&order=desc' });
      assert.strictEqual(pagedList.statusCode, 200);
      assert.strictEqual(pagedList.body.total, 3);
      assert.strictEqual(pagedList.body.results.length, 1);
      assert.strictEqual(pagedList.body.results[0].event.id, childCanonical.id);

      const filtered = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/query?q=microclimate' });
      assert.strictEqual(filtered.statusCode, 200);
      assert.strictEqual(filtered.body.total, 3);

      const sinceFiltered = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/query?since=2' });
      assert.strictEqual(sinceFiltered.statusCode, 200);
      assert.strictEqual(sinceFiltered.body.total, 2);
      assert.strictEqual(sinceFiltered.body.results[0].event.id, dslCanonical.id);

      const untilFiltered = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/query?until=2' });
      assert.strictEqual(untilFiltered.statusCode, 200);
      assert.strictEqual(untilFiltered.body.total, 2);
      assert.strictEqual(untilFiltered.body.results[0].event.id, childCanonical.id);

      const relation = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/relation?relationship=microclimate' });
      assert.strictEqual(relation.statusCode, 200);
      assert.strictEqual(relation.body.total, 2);

      const contextFiltered = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/query?climate_zone=warm-temperate' });
      assert.strictEqual(contextFiltered.statusCode, 200);
      assert.strictEqual(contextFiltered.body.total, 2);

      const dslModelFiltered = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/query?dsl_model=microclimate_model' });
      assert.strictEqual(dslModelFiltered.statusCode, 200);
      assert.strictEqual(dslModelFiltered.body.total, 1);
      assert.strictEqual(dslModelFiltered.body.results[0].event.id, dslCanonical.id);

      const dslRoleFiltered = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/query?dsl_var=microclimate&dsl_role=independent' });
      assert.strictEqual(dslRoleFiltered.statusCode, 200);
      assert.strictEqual(dslRoleFiltered.body.total, 1);
      assert.strictEqual(dslRoleFiltered.body.results[0].event.id, dslCanonical.id);

      const phaseFiltered = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/query?phase=expert' });
      assert.strictEqual(phaseFiltered.statusCode, 200);
      assert.strictEqual(phaseFiltered.body.total, 2);

      const tree = service.handleRequest({ method: 'GET', url: `/api/v1/inquiries/${rootId}/tree` });
      assert.strictEqual(tree.statusCode, 200);
      assert.strictEqual(tree.body.id, rootCanonical.id);
      assert.strictEqual(tree.body.children.length, 1);

      const emptyQuery = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/query' });
      assert.strictEqual(emptyQuery.statusCode, 400);
      assert.ok(emptyQuery.body.hint);

      const missingRelation = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/relation' });
      assert.strictEqual(missingRelation.statusCode, 400);
      assert.ok(missingRelation.body.hint);
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
