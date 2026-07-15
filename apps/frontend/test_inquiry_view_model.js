'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('../../packages/nostr/adapter/ingest_pipeline');
const { persistIngestResult } = require('../../packages/nostr/storage/persistence');
const { replayStorage } = require('../../packages/nostr/storage/replay');
const { makeEvent, makeTempDir } = require('../../packages/nostr/storage/test_fixtures');
const { createStandardApiService } = require('../api/standard_api_service');
const { GOLDEN_PATH_IDS, createGoldenPathEvents } = require('../api/fixtures/golden_path');
const {
  VIEW_STATES,
  createErrorModel,
  createInquiryDetailModel,
  createLineageTreeModel,
  createLoadingModel,
} = require('./inquiry_view_model');

function buildService() {
  const sourceEvents = createGoldenPathEvents(makeEvent);
  const ingestResult = ingestNostrEvents(sourceEvents, { skipVerify: true });
  const storageDir = makeTempDir('toitoi-frontend-golden-path-');
  persistIngestResult(storageDir, ingestResult, {
    source: 'jsonl',
    sourceLabel: 'v0.3.0-lineage-contract',
  });
  const replayed = replayStorage(storageDir, { persistIndex: false });
  return createStandardApiService({ indexSnapshot: replayed.indexSnapshot });
}

function testGoldenPath() {
  const service = buildService();
  const detailResponse = service.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.translated}/detail`,
  });
  assert.strictEqual(detailResponse.statusCode, 200);

  const detailModel = createInquiryDetailModel(detailResponse.body);
  assert.strictEqual(detailModel.state, VIEW_STATES.READY);
  assert.ok(detailModel.inquiry.id.startsWith('tt:evt:'));
  assert.ok(detailModel.inquiry.text.length > 0);
  assert.ok(detailModel.inquiry.contexts.some(item => item.key === 'climate_zone'));
  assert.ok(detailModel.inquiry.relationships.length > 0);
  assert.deepStrictEqual(detailModel.inquiry.provenance.protocols, ['nostr']);
  assert.ok(detailModel.inquiry.provenance.sourceIds.includes(GOLDEN_PATH_IDS.translated));
  assert.strictEqual(detailModel.inquiry.parents.length, 1);
  assert.strictEqual(detailModel.inquiry.children.length, 1);

  const treeResponse = service.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.root}/tree`,
  });
  assert.strictEqual(treeResponse.statusCode, 200);

  const selectedCanonicalId = detailModel.inquiry.id;
  const treeModel = createLineageTreeModel(treeResponse.body, { selectedId: selectedCanonicalId });
  assert.strictEqual(treeModel.state, VIEW_STATES.READY);
  assert.strictEqual(treeModel.tree.depth, 0);
  assert.strictEqual(treeModel.tree.role, 'root');
  assert.strictEqual(treeModel.tree.children[0].depth, 1);
  assert.strictEqual(treeModel.tree.children[0].role, 'branch');
  assert.strictEqual(treeModel.tree.children[0].children[0].depth, 2);
  assert.strictEqual(treeModel.tree.children[0].children[0].role, 'leaf');
  assert.strictEqual(treeModel.nodes.length, 3);
  assert.strictEqual(treeModel.nodes.filter(node => node.selected).length, 1);
  assert.strictEqual(treeModel.warnings.length, 0);
}

function testCycleAndMissingReferenceProtection() {
  const root = {
    id: 'tt:evt:root',
    body: { text: 'root' },
    provenance: { sourceCount: 1, sourceProtocols: ['nostr'], sourceIds: ['raw-root'] },
    children: [],
  };
  const child = {
    id: 'tt:evt:child',
    body: { text: 'child' },
    relationships: [{ source: 'translated_from', target: root.id }],
    children: [],
  };
  root.children.push(child, null);
  child.children.push(root);

  const model = createLineageTreeModel(root, { selectedId: child.id });
  assert.strictEqual(model.state, VIEW_STATES.READY);
  assert.strictEqual(model.selectedId, child.id);
  assert.strictEqual(model.nodes.filter(node => node.selected).length, 1);
  assert.strictEqual(model.tree.children[0].relationToParent, 'translated_from');
  assert.strictEqual(model.tree.children[0].children[0].status, 'cycle');
  assert.strictEqual(model.tree.children[1].status, 'missing');
  assert.ok(model.warnings.some(warning => warning.type === 'cycle'));
  assert.ok(model.warnings.some(warning => warning.type === 'missing-reference'));
}

function run() {
  testGoldenPath();
  testCycleAndMissingReferenceProtection();

  assert.strictEqual(createLoadingModel().state, VIEW_STATES.LOADING);
  assert.strictEqual(createInquiryDetailModel(null).state, VIEW_STATES.EMPTY);
  assert.strictEqual(createLineageTreeModel(null).state, VIEW_STATES.EMPTY);
  assert.deepStrictEqual(createErrorModel(new Error('network failed')), {
    state: VIEW_STATES.ERROR,
    inquiry: null,
    error: 'network failed',
  });

  console.log('PASS frontend lineage model exposes selection, node roles, relation types, and resilient tree states');
}

try {
  run();
} catch (error) {
  console.error('FAIL frontend inquiry view model contract');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}