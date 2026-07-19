'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  createAiInspectionService,
  createAiJobQueue,
  createAiJsonlStore,
  createAiReviewService,
  createAiWorker,
  createDeterministicAiProvider,
  promoteInquiryCandidate,
} = require('@toitoi/ai');
const {
  approveInquiryDraft,
  assertPublishableInquiryDraft,
  submitInquiryDraft,
} = require('@toitoi/protocol');
const { createAiHttpService } = require('../api/ai_http_service');

async function run() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-v0-5-golden-'));
  const store = createAiJsonlStore({ directory });
  const queue = createAiJobQueue({ now: () => '2026-07-19T12:00:00.000Z' });
  const provider = createDeterministicAiProvider({
    model: 'toitoi-deterministic-fixture',
    promptVersion: 'inquiry-generation-v0.1.0',
  });
  const worker = createAiWorker({
    queue,
    provider,
    store,
    now: () => '2026-07-19T12:01:00.000Z',
  });
  const eventId = 'tt:evt:field-east-observation-001';

  queue.enqueue({
    id: 'job-inquiry-generation-001',
    eventId,
    task: 'generate_inquiries',
    payload: { observation: '畑の東側だけ雑草の種類が違い、土の湿り方も異なる。' },
  });
  const inference = await worker.runOnce();
  assert.equal(inference.state, 'completed');
  assert.equal(inference.annotation.reviewState, 'unreviewed');
  assert.equal(inference.annotation.output.candidates.length, 2);

  const inspectionService = createAiInspectionService({ store });
  const reviewService = createAiReviewService({
    store,
    now: () => '2026-07-19T12:05:00.000Z',
  });
  const http = createAiHttpService({ inspectionService, reviewService });
  const reviewResponse = http.handleRequest({
    method: 'POST',
    url: `/api/v1/ai/annotations/${encodeURIComponent(inference.annotation.id)}/accept`,
    body: {
      reviewedBy: 'human:farmer-reviewer',
      note: 'Observation is accurate; inquiry wording is suitable for drafting.',
    },
  });
  assert.equal(reviewResponse.statusCode, 200);
  assert.equal(reviewResponse.body.reviewState, 'accepted');

  const draft = promoteInquiryCandidate({
    annotation: reviewResponse.body,
    candidateIndex: 0,
    id: 'tt:draft:ai-inquiry-001',
    createdAt: '2026-07-19T12:10:00.000Z',
    authorId: 'human:farmer-author',
    language: 'ja',
  });
  assert.equal(draft.status, 'draft');
  assert.equal(draft.candidate.body.language, 'ja');
  assert.equal(draft.candidate.meta.aiPromotion.requiresHumanReview, true);
  assert.throws(() => assertPublishableInquiryDraft(draft), /only approved/);

  const submitted = submitInquiryDraft(draft, {
    submittedAt: '2026-07-19T12:11:00.000Z',
  });
  const approved = approveInquiryDraft(submitted, {
    reviewerId: 'human:publication-reviewer',
    reviewedAt: '2026-07-19T12:12:00.000Z',
    note: 'Publication scope and local context confirmed.',
  });
  const publishable = assertPublishableInquiryDraft(approved);

  assert.equal(publishable.body.language, 'ja');
  assert.equal(publishable.meta.aiPromotion.annotationRefs[0].reviewState, 'accepted');
  assert.equal(publishable.meta.aiPromotion.annotationRefs[0].model, 'toitoi-deterministic-fixture');
  assert.equal(approved.review.reviewerId, 'human:publication-reviewer');
  assert.notEqual(reviewResponse.body.reviewedBy, approved.review.reviewerId);

  console.log('PASS v0.5.0 Golden Path: observation -> inquiry generation -> API review -> draft -> publication approval');
}

run().catch((error) => {
  console.error('FAIL v0.5.0 inquiry generation Golden Path');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
