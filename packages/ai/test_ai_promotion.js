'use strict';

const assert = require('assert');
const { createAiAnnotation } = require('./annotation');
const { promoteAcceptedAnnotationsToInquiryDraft } = require('./promotion');
const {
  submitInquiryDraft,
  approveInquiryDraft,
  assertPublishableInquiryDraft,
} = require('@toitoi/protocol/inquiry_draft');

function makeAnnotation(overrides = {}) {
  return createAiAnnotation({
    id: 'tt:ai:annotation-001',
    eventId: 'tt:evt:observation-001',
    task: 'summarize',
    output: { summary: '畑の東側だけ雑草相が異なる。' },
    model: 'fake-provider-v1',
    promptVersion: 'summary-v1',
    rawOutput: '{"summary":"畑の東側だけ雑草相が異なる。"}',
    createdAt: '2026-07-16T10:00:00.000Z',
    reviewState: 'accepted',
    reviewedAt: '2026-07-16T10:05:00.000Z',
    ...overrides,
  });
}

function run() {
  const annotation = makeAnnotation();
  const draft = promoteAcceptedAnnotationsToInquiryDraft({
    id: 'tt:draft:ai-promotion-001',
    eventId: annotation.eventId,
    annotations: [annotation],
    candidate: {
      type: 'inquiry',
      body: {
        text: '畑の東側だけ雑草相が異なるのは、土壌水分の差と関係しているか。',
        language: 'ja',
      },
      contexts: { field_zone: 'east' },
      labels: ['agroecology'],
    },
    createdAt: '2026-07-16T10:10:00.000Z',
  });

  assert.strictEqual(draft.status, 'draft');
  assert.strictEqual(draft.candidate.meta.aiPromotion.requiresHumanReview, true);
  assert.strictEqual(draft.candidate.meta.aiPromotion.sourceEventId, annotation.eventId);
  assert.strictEqual(draft.candidate.meta.aiPromotion.annotationRefs[0].annotationId, annotation.id);
  assert.throws(() => assertPublishableInquiryDraft(draft), /only approved/);

  const submitted = submitInquiryDraft(draft, {
    submittedAt: '2026-07-16T10:15:00.000Z',
  });
  const approved = approveInquiryDraft(submitted, {
    reviewerId: 'human:reviewer-001',
    reviewedAt: '2026-07-16T10:20:00.000Z',
  });
  assert.doesNotThrow(() => assertPublishableInquiryDraft(approved));

  assert.throws(() => promoteAcceptedAnnotationsToInquiryDraft({
    id: 'tt:draft:unreviewed',
    eventId: annotation.eventId,
    annotations: [makeAnnotation({ reviewState: 'unreviewed', reviewedAt: null })],
    candidate: draft.candidate,
  }), /must be accepted/);

  assert.throws(() => promoteAcceptedAnnotationsToInquiryDraft({
    id: 'tt:draft:mismatch',
    eventId: 'tt:evt:other',
    annotations: [annotation],
    candidate: draft.candidate,
  }), /different event/);

  console.log('PASS accepted AI annotations promote only into a human-reviewed inquiry draft');
}

try {
  run();
} catch (error) {
  console.error('FAIL AI annotation promotion contract');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
