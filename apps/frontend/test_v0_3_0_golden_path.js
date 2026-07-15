'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('../../packages/nostr/adapter/ingest_pipeline');
const { persistIngestResult } = require('../../packages/nostr/storage/persistence');
const { replayStorage } = require('../../packages/nostr/storage/replay');
const { makeEvent, makeTempDir } = require('../../packages/nostr/storage/test_fixtures');
const { convertCanonicalToNostrDraft } = require('../../packages/nostr/converter/canonical_to_nostr_converter');
const {
  approveInquiryDraft,
  createDerivedInquiryDraft,
  publishApprovedDerivedInquiry,
  submitInquiryDraft,
} = require('../../packages/protocol');
const { createStandardApiService } = require('../api/standard_api_service');
const { GOLDEN_PATH_IDS, GOLDEN_PATH_RELAY, createGoldenPathEvents } = require('../api/fixtures/golden_path');
const { createInquiryDetailModel, createLineageTreeModel, VIEW_STATES } = require('./inquiry_view_model');
const { createContextExplorationModel } = require('./context_exploration_model');
const { renderLineageTree } = require('./lineage_tree_renderer');
const { renderContextExploration } = require('./context_exploration_renderer');

const DERIVED_NOSTR_ID = '0000000000000000000000000000000000000000000000000000000000000004';
const DERIVED_CANONICAL_ID = `tt:evt:${DERIVED_NOSTR_ID}`;
const DERIVED_TEXT = '冷涼地の東側圃場で、朝露の残り方と雑草相の違いを継続観察したい。';

function buildService(sourceEvents, label) {
  const ingestResult = ingestNostrEvents(sourceEvents, { skipVerify: true });
  const storageDir = makeTempDir(`toitoi-v0-3-0-${label}-`);
  persistIngestResult(storageDir, ingestResult, {
    source: 'jsonl',
    sourceLabel: label,
  });
  const replayed = replayStorage(storageDir, { persistIndex: false });
  return createStandardApiService({ indexSnapshot: replayed.indexSnapshot });
}

function hasSourceId(result, sourceId) {
  return Array.isArray(result?.provenance?.sourceIds)
    && result.provenance.sourceIds.includes(sourceId);
}

function run() {
  const sourceEvents = createGoldenPathEvents(makeEvent);
  const initialService = buildService(sourceEvents, 'before-derivation');

  const detailResponse = initialService.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.root}/detail`,
  });
  assert.strictEqual(detailResponse.statusCode, 200);
  const detailModel = createInquiryDetailModel(detailResponse.body);
  assert.strictEqual(detailModel.state, VIEW_STATES.READY);

  const initialTreeResponse = initialService.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.root}/tree`,
  });
  assert.strictEqual(initialTreeResponse.statusCode, 200);
  const initialTreeModel = createLineageTreeModel(initialTreeResponse.body);
  assert.strictEqual(initialTreeModel.state, VIEW_STATES.READY);
  assert.ok(renderLineageTree(initialTreeModel).includes('問いの系統樹'));

  const contextResponse = initialService.handleRequest({
    method: 'GET',
    url: '/api/v1/inquiries/query?climate_zone=cool-temperate',
  });
  assert.strictEqual(contextResponse.statusCode, 200);
  const contextModel = createContextExplorationModel(contextResponse.body, {
    criteria: { climate_zone: 'cool-temperate' },
  });
  assert.strictEqual(contextModel.state, VIEW_STATES.READY);
  assert.ok(contextModel.results.some(result => hasSourceId(result, GOLDEN_PATH_IDS.translated)));
  assert.ok(renderContextExploration(contextModel).includes('文脈探索'));

  const sourceInquiry = contextModel.results.find(result => hasSourceId(result, GOLDEN_PATH_IDS.translated));
  const draft = createDerivedInquiryDraft({
    id: 'tt:draft:v0.3.0-golden-path-derived',
    sourceInquiryId: sourceInquiry.id,
    relationType: 'translated_from',
    authorId: 'human:nkkmd',
    ai: {
      involved: true,
      role: 'wording-suggestion',
      model: 'local-reference-model',
    },
    createdAt: '2026-07-15T13:10:00.000Z',
    candidate: {
      type: 'inquiry',
      body: {
        text: DERIVED_TEXT,
        language: 'ja',
      },
      contexts: {
        field_zone: 'east',
        climate_zone: 'cool-temperate',
        farming_context: 'field-observation',
      },
      relationships: [
        { source: 'morning_dew', target: 'weed_flora' },
      ],
      labels: ['agroecology'],
    },
  });
  assert.throws(() => publishApprovedDerivedInquiry(draft, {
    canonicalId: DERIVED_CANONICAL_ID,
    publisherId: 'publisher:test',
  }), /only approved/);

  const approved = approveInquiryDraft(
    submitInquiryDraft(draft, { submittedAt: '2026-07-15T13:11:00.000Z' }),
    {
      reviewerId: 'human:reviewer',
      reviewedAt: '2026-07-15T13:12:00.000Z',
      note: '派生元、文脈、問いの表現を確認した。',
    }
  );
  const canonical = publishApprovedDerivedInquiry(approved, {
    canonicalId: DERIVED_CANONICAL_ID,
    publishedAt: '2026-07-15T13:13:00.000Z',
    publisherId: 'publisher:test',
    sourceProtocol: 'toitoi',
  });
  assert.deepStrictEqual(canonical.lineage, [{ type: 'translated_from', target: sourceInquiry.id }]);
  assert.strictEqual(canonical.meta.publication.humanReview.decision, 'approved');

  const converted = convertCanonicalToNostrDraft(canonical, {
    kind: 1042,
    defaultRelay: GOLDEN_PATH_RELAY,
    requireAgroecologyTag: true,
    lineageMap: new Map([[sourceInquiry.id, {
      eventId: GOLDEN_PATH_IDS.translated,
      relay: GOLDEN_PATH_RELAY,
    }]]),
  });
  assert.deepStrictEqual(converted.warnings, []);
  assert.ok(converted.output.tags.some(tag => tag[0] === 'e'
    && tag[1] === GOLDEN_PATH_IDS.translated
    && tag[3] === 'translated_from'));

  const derivedRawEvent = makeEvent({
    id: DERIVED_NOSTR_ID,
    created_at: converted.output.created_at,
    content: converted.output.content,
    tags: converted.output.tags,
  });
  const updatedService = buildService([...sourceEvents, derivedRawEvent], 'after-derivation');

  const updatedTreeResponse = updatedService.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${GOLDEN_PATH_IDS.root}/tree`,
  });
  assert.strictEqual(updatedTreeResponse.statusCode, 200);
  const updatedTreeModel = createLineageTreeModel(updatedTreeResponse.body);
  assert.strictEqual(updatedTreeModel.state, VIEW_STATES.READY);
  const derivedNode = updatedTreeModel.nodes.find(node => node.text === DERIVED_TEXT);
  assert.ok(derivedNode);
  const selectedTreeModel = createLineageTreeModel(updatedTreeResponse.body, {
    selectedId: derivedNode.id,
  });
  assert.strictEqual(selectedTreeModel.selectedId, derivedNode.id);
  assert.ok(renderLineageTree(selectedTreeModel).includes('translated_from'));

  const derivedDetailResponse = updatedService.handleRequest({
    method: 'GET',
    url: `/api/v1/inquiries/${DERIVED_NOSTR_ID}/detail`,
  });
  assert.strictEqual(derivedDetailResponse.statusCode, 200);
  const derivedDetail = createInquiryDetailModel(derivedDetailResponse.body);
  assert.strictEqual(derivedDetail.state, VIEW_STATES.READY);
  assert.ok(derivedDetail.inquiry.provenance.protocols.includes('nostr'));
  assert.strictEqual(derivedDetail.inquiry.parents.length, 1);

  console.log('PASS v0.3.0 Golden Path crosses detail, lineage, context exploration, reviewed derivation, Nostr re-ingest, and updated lineage');
}

try {
  run();
} catch (error) {
  console.error('FAIL v0.3.0 cross-feature Golden Path');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
