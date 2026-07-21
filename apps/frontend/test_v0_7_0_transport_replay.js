'use strict';

const assert = require('node:assert/strict');
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

const SOURCE_RAW_ID = '1'.repeat(64);
const DERIVED_RAW_ID = '2'.repeat(64);
const SOURCE_CANONICAL_ID = `tt:evt:${SOURCE_RAW_ID}`;
const DERIVED_CANONICAL_ID = `tt:evt:${DERIVED_RAW_ID}`;
const RELAY = 'wss://relay.example.com';

function replay(events, label) {
  const result = ingestNostrEvents(events, { skipVerify: true });
  const storageDir = makeTempDir(`toitoi-v0-7-0-${label}-`);
  persistIngestResult(storageDir, result, { source: 'jsonl', sourceLabel: label });
  return replayStorage(storageDir, { persistIndex: false });
}

function run() {
  const sourceRaw = makeEvent({
    id: SOURCE_RAW_ID,
    created_at: 1784592000,
    content: JSON.stringify({ text: 'How does soil moisture affect leaf wilting?', language: 'en' }),
    tags: [['t', 'agroecology'], ['context', 'soil_type', 'clay']],
  });
  const initial = replay([sourceRaw], 'source');
  const sourceEvent = initial.indexSnapshot.events.find(event => event.id === SOURCE_CANONICAL_ID);
  assert.ok(sourceEvent);

  const draft = createDerivedInquiryDraft({
    id: 'tt:draft:v0.7.0-replay',
    sourceInquiryId: SOURCE_CANONICAL_ID,
    relationType: 'contrasts_with',
    relationDetails: { rationale: 'The sandy plot wilted earlier than the clay plot.' },
    relationConfirmedByHuman: true,
    strictRelationValidation: true,
    authorId: 'human:field-worker',
    ai: { suggestedRelationType: 'reframes', model: 'deterministic', accepted: false },
    createdAt: '2026-07-21T03:00:00.000Z',
    candidate: {
      type: 'inquiry',
      body: { text: 'Why did the sandy plot wilt earlier than the clay plot?', language: 'en' },
      contexts: { soil_type: 'sandy', comparison_soil_type: 'clay' },
      labels: ['agroecology'],
    },
  });
  const approved = approveInquiryDraft(
    submitInquiryDraft(draft, { submittedAt: '2026-07-21T03:01:00.000Z' }),
    { reviewerId: 'human:reviewer', reviewedAt: '2026-07-21T03:02:00.000Z' }
  );
  const canonical = publishApprovedDerivedInquiry(approved, {
    canonicalId: DERIVED_CANONICAL_ID,
    publisherId: 'human:field-worker',
    publishedAt: '2026-07-21T03:03:00.000Z',
  });
  const projected = convertCanonicalToNostrDraft(canonical, {
    kind: 1042,
    defaultRelay: RELAY,
    requireAgroecologyTag: true,
    lineageMap: new Map([[SOURCE_CANONICAL_ID, { eventId: SOURCE_RAW_ID, relay: RELAY }]]),
  });
  assert.deepEqual(projected.warnings, []);
  assert.ok(projected.output.tags.some(tag => tag[0] === 'e' && tag[1] === SOURCE_RAW_ID && tag[3] === 'contrasts_with'));

  const derivedRaw = makeEvent({
    id: DERIVED_RAW_ID,
    created_at: projected.output.created_at,
    content: projected.output.content,
    tags: projected.output.tags,
  });
  const replayed = replay([sourceRaw, derivedRaw], 'round-trip');
  const service = createStandardApiService({ indexSnapshot: replayed.indexSnapshot });
  const tree = service.handleRequest({ method: 'GET', url: `/api/v1/inquiries/${SOURCE_RAW_ID}/tree` });
  assert.equal(tree.statusCode, 200);
  const recovered = tree.body.children.find(child => child.id === DERIVED_CANONICAL_ID);
  assert.ok(recovered);
  assert.ok(recovered.lineage.some(edge => edge.type === 'contrasts_with' && edge.target === SOURCE_CANONICAL_ID));
  assert.notEqual(recovered.id, SOURCE_CANONICAL_ID);
  assert.equal(recovered.contexts.soil_type, 'sandy');
  console.log('v0.7.0 transport replay preserves semantic relation without identity merge');
}

try { run(); } catch (error) { console.error(error); process.exitCode = 1; }
