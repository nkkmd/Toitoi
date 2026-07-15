'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('../../packages/nostr/adapter/ingest_pipeline');
const { persistIngestResult } = require('../../packages/nostr/storage/persistence');
const { replayStorage } = require('../../packages/nostr/storage/replay');
const { makeEvent, makeTempDir } = require('../../packages/nostr/storage/test_fixtures');
const { createStandardApiService } = require('../api/standard_api_service');
const { createGoldenPathEvents } = require('../api/fixtures/golden_path');
const { VIEW_STATES } = require('./inquiry_view_model');
const {
  createContextExplorationModel,
  createContextLoadingModel,
} = require('./context_exploration_model');
const { renderContextExploration } = require('./context_exploration_renderer');

function buildService() {
  const ingestResult = ingestNostrEvents(createGoldenPathEvents(makeEvent), { skipVerify: true });
  const storageDir = makeTempDir('toitoi-context-exploration-');
  persistIngestResult(storageDir, ingestResult, {
    source: 'jsonl',
    sourceLabel: 'v0.3.0-context-exploration',
  });
  const replayed = replayStorage(storageDir, { persistIndex: false });
  return createStandardApiService({ indexSnapshot: replayed.indexSnapshot });
}

function run() {
  const service = buildService();
  const response = service.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries/query?field_zone=east',
  });
  assert.strictEqual(response.statusCode, 400);

  const contextResponse = service.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries/query?climate_zone=cool-temperate',
  });
  assert.strictEqual(contextResponse.statusCode, 200);
  assert.strictEqual(contextResponse.body.total, 1);

  const model = createContextExplorationModel(contextResponse.body, {
    criteria: { climate_zone: 'cool-temperate' },
  });
  assert.strictEqual(model.state, VIEW_STATES.READY);
  assert.strictEqual(model.results.length, 1);
  assert.strictEqual(model.results[0].matchedCriteria[0].key, 'climate_zone');
  assert.strictEqual(model.semantics.identityMerge, false);

  const broadResponse = service.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries/query?type=inquiry',
  });
  const comparison = createContextExplorationModel(broadResponse.body, {
    criteria: { climate_zone: 'warm-temperate' },
  });
  assert.ok(comparison.comparisonKeys.includes('climate_zone'));
  assert.ok(comparison.results.some(item => item.differingContexts.some(context => context.key === 'climate_zone')));

  const emptyResponse = service.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries/query?climate_zone=tropical-highland',
  });
  const emptyModel = createContextExplorationModel(emptyResponse.body, {
    criteria: { climate_zone: 'tropical-highland' },
  });
  assert.strictEqual(emptyModel.state, VIEW_STATES.EMPTY);

  const invalidModel = createContextExplorationModel({}, { criteria: {} });
  assert.strictEqual(invalidModel.state, VIEW_STATES.ERROR);
  assert.strictEqual(createContextLoadingModel({ climate_zone: 'cool-temperate' }).state, VIEW_STATES.LOADING);

  const html = renderContextExploration(model);
  assert.ok(html.includes('data-state="ready"'));
  assert.ok(html.includes('cool-temperate'));
  assert.ok(html.includes('同一の問いとして自動統合しません'));
  assert.ok(html.includes('role="region"'));
  assert.ok(html.includes('/detail'));

  const escaped = renderContextExploration(createContextExplorationModel({
    total: 1,
    results: [{ event: { id: 'x', body: { text: '<script>alert(1)</script>' }, contexts: { climate_zone: 'warm-temperate' } } }],
  }, { criteria: { climate_zone: 'warm-temperate' } }));
  assert.ok(!escaped.includes('<script>'));
  assert.ok(escaped.includes('&lt;script&gt;'));

  console.log('PASS context exploration exposes filters, comparison, states, and conservative identity semantics');
}

try {
  run();
} catch (error) {
  console.error('FAIL context exploration contract');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
