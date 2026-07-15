'use strict';

const assert = require('assert');
const {
  submitInquiryDraft,
  approveInquiryDraft,
} = require('./inquiry_draft');
const {
  DERIVATION_TYPES,
  createDerivedInquiryDraft,
  publishApprovedDerivedInquiry,
} = require('./derived_inquiry');
const { convertCanonicalToNostrDraft } = require('../nostr/converter/canonical_to_nostr_converter');
const { convertCanonicalToLingonberryObject } = require('../lingonberry/converter/canonical_to_lingonberry_converter');

const sourceInquiryId = 'tt:evt:source-inquiry-001';
const candidate = {
  type: 'inquiry',
  body: {
    text: '冷涼地でも圃場東側の雑草相と水分条件の関係を確かめたい。',
    language: 'ja',
  },
  contexts: {
    field_zone: 'east',
    climate_zone: 'cool-temperate',
  },
  relationships: [
    { source: 'microclimate', target: 'weed_flora' },
  ],
  labels: ['agroecology'],
};

function run() {
  assert.deepStrictEqual(DERIVATION_TYPES, [
    'derived_from',
    'translated_from',
    'annotates',
    'reframes',
    'revises',
    'synthesizes',
  ]);

  const draft = createDerivedInquiryDraft({
    id: 'tt:draft:derived-001',
    sourceInquiryId,
    relationType: 'translated_from',
    candidate,
    authorId: 'human:farmer-a',
    ai: {
      involved: true,
      model: 'local-qwen',
      operation: 'translation-draft',
    },
    createdAt: '2026-07-15T13:00:00.000Z',
  });

  assert.deepStrictEqual(draft.candidate.lineage, [
    { type: 'translated_from', target: sourceInquiryId },
  ]);
  assert.strictEqual(draft.derivation.authorId, 'human:farmer-a');
  assert.throws(() => publishApprovedDerivedInquiry(draft, {
    canonicalId: 'tt:evt:derived-001',
    publisherId: 'human:farmer-a',
  }), /only approved/);

  const submitted = submitInquiryDraft(draft, {
    submittedAt: '2026-07-15T13:05:00.000Z',
  });
  const approved = approveInquiryDraft(submitted, {
    reviewerId: 'human:reviewer-b',
    reviewedAt: '2026-07-15T13:10:00.000Z',
    note: 'Source, wording, and local context confirmed.',
  });

  const canonical = publishApprovedDerivedInquiry(approved, {
    canonicalId: 'tt:evt:derived-001',
    publisherId: 'human:farmer-a',
    publishedAt: '2026-07-15T13:15:00.000Z',
  });

  assert.strictEqual(canonical.id, 'tt:evt:derived-001');
  assert.deepStrictEqual(canonical.lineage, [
    { type: 'translated_from', target: sourceInquiryId },
  ]);
  assert.strictEqual(canonical.meta.publication.sourceInquiryId, sourceInquiryId);
  assert.strictEqual(canonical.meta.publication.relationType, 'translated_from');
  assert.strictEqual(canonical.meta.publication.humanReview.reviewerId, 'human:reviewer-b');
  assert.strictEqual(canonical.meta.publication.ai.model, 'local-qwen');
  assert.strictEqual(canonical.provenance.sources[0].sourceId, approved.id);

  const nostr = convertCanonicalToNostrDraft(canonical, {
    kind: 1042,
    defaultRelay: 'wss://relay.example.com',
    requireAgroecologyTag: true,
    lineageMap: new Map([[sourceInquiryId, {
      eventId: 'a'.repeat(64),
      relay: 'wss://relay.example.com',
    }]]),
  });
  assert.ok(nostr.output.tags.some(tag => tag[0] === 'e'
    && tag[1] === 'a'.repeat(64)
    && tag[3] === 'translated_from'));

  const lingonberry = convertCanonicalToLingonberryObject(canonical);
  assert.deepStrictEqual(lingonberry.lineage, canonical.lineage);
  assert.strictEqual(lingonberry.meta.publication.humanReview.decision, 'approved');

  assert.throws(() => createDerivedInquiryDraft({
    id: 'tt:draft:bad-relation',
    sourceInquiryId,
    relationType: 'likes',
    candidate,
  }), /relationType/);

  console.log('PASS derived inquiry requires human approval and preserves lineage and publication provenance');
}

try {
  run();
} catch (error) {
  console.error('FAIL derived inquiry publication contract');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
