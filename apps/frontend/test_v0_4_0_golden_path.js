'use strict';

const assert = require('assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  createAiAnnotation,
  createAiJobQueue,
  createAiJsonlStore,
  createAiWorker,
  createDeterministicAiProvider,
  promoteAcceptedAnnotationsToInquiryDraft,
} = require('@toitoi/ai');
const {
  submitInquiryDraft,
  approveInquiryDraft,
  assertPublishableInquiryDraft,
} = require('@toitoi/protocol');
const { createAiReviewViewModel } = require('./ai_review_model');
const { renderAiReview } = require('./ai_review_renderer');

async function run() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-v0-4-golden-'));
  const store = createAiJsonlStore({ directory });
  const queue = createAiJobQueue({ now: () => '2026-07-16T12:00:00.000Z' });
  const provider = createDeterministicAiProvider();
  const worker = createAiWorker({ queue, provider, store, now: () => '2026-07-16T12:01:00.000Z' });
  const eventId = 'tt:evt:field-east-001';

  queue.enqueue({
    id: 'job-summary-1',
    eventId,
    task: 'summarize',
    payload: { text: '畑の東側だけ雑草の種類が違う。土の湿り方も異なるように見える。' },
  });
  await worker.runOnce();

  const generated = [...store.latestAnnotationsById().values()][0];
  assert.strictEqual(generated.reviewState, 'unreviewed');

  const unreviewedModel = createAiReviewViewModel({ eventId, annotations: [generated] });
  assert.strictEqual(unreviewedModel.cards[0].canPromoteToDraft, false);
  assert.ok(renderAiReview(unreviewedModel).includes('公開済みの問いではありません'));

  const accepted = createAiAnnotation({
    ...generated,
    reviewState: 'accepted',
    reviewedAt: '2026-07-16T12:05:00.000Z',
    reviewNote: 'Observation and wording confirmed by a farmer.',
  });

  const reviewedModel = createAiReviewViewModel({ eventId, annotations: [accepted] });
  assert.strictEqual(reviewedModel.cards[0].canPromoteToDraft, true);

  const draft = promoteAcceptedAnnotationsToInquiryDraft({
    id: 'tt:draft:ai-promoted-001',
    eventId,
    annotations: [accepted],
    candidate: {
      type: 'inquiry',
      body: {
        text: '畑の東側だけ雑草相が異なるのは、土壌水分の差と関係しているか。',
        language: 'ja',
      },
      contexts: { field_zone: 'east' },
      labels: ['agroecology'],
    },
    createdAt: '2026-07-16T12:10:00.000Z',
  });

  assert.strictEqual(draft.status, 'draft');
  assert.throws(() => assertPublishableInquiryDraft(draft), /only approved/);

  const submitted = submitInquiryDraft(draft, { submittedAt: '2026-07-16T12:11:00.000Z' });
  const approved = approveInquiryDraft(submitted, {
    reviewerId: 'human:farmer-reviewer',
    reviewedAt: '2026-07-16T12:12:00.000Z',
    note: 'Local observation and inquiry framing confirmed.',
  });
  const publishable = assertPublishableInquiryDraft(approved);

  assert.strictEqual(publishable.body.language, 'ja');
  assert.strictEqual(publishable.meta.aiPromotion.requiresHumanReview, true);
  assert.strictEqual(publishable.meta.aiPromotion.annotationRefs[0].annotationId, accepted.id);

  console.log('PASS v0.4.0 Golden Path: async AI annotation -> human acceptance -> draft -> human approval');
}

run().catch(error => {
  console.error('FAIL v0.4.0 AI Golden Path');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
