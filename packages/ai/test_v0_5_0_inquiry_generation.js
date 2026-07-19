'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  createAiAnnotation,
  createAiJobQueue,
  createAiJsonlStore,
  createAiReviewService,
  createAiWorker,
  createDeterministicAiProvider,
  createLlamaCppProvider,
} = require('./index');

async function testInquiryGenerationGoldenPath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-ai-v050-'));
  const store = createAiJsonlStore({ directory });
  const queue = createAiJobQueue();
  const worker = createAiWorker({ queue, store, provider: createDeterministicAiProvider() });
  queue.enqueue({
    id: 'job-inquiry-1',
    eventId: 'observation-1',
    task: 'generate_inquiries',
    payload: { observation: '畑の東側だけ雑草の種類が違う。' },
  });
  const result = await worker.runOnce();
  assert.equal(result.state, 'completed');
  assert.equal(result.annotation.task, 'generate_inquiries');
  assert.equal(result.annotation.output.candidates.length, 2);
  assert.deepEqual(result.annotation.output.candidates[0].source_refs, ['observation-1']);
  assert.equal(result.annotation.reviewState, 'unreviewed');

  const review = createAiReviewService({ store, now: () => '2026-07-19T00:00:00.000Z' });
  const accepted = review.accept(result.annotation.id, { reviewedBy: 'human-reviewer', note: '確認済み' });
  assert.equal(accepted.reviewState, 'accepted');
  assert.equal(accepted.reviewedBy, 'human-reviewer');
  assert.throws(() => review.reject(result.annotation.id, { reviewedBy: 'other' }), /already accepted/);
}

function testMalformedInquiryOutputIsRejected() {
  assert.throws(() => createAiAnnotation({
    id: 'annotation-bad', eventId: 'event-1', task: 'generate_inquiries',
    model: 'fixture', promptVersion: 'v1', createdAt: '2026-07-19T00:00:00.000Z',
    output: { candidates: [{ inquiry: '問いだけ' }] }, rawOutput: '{}',
  }), /context|observation|relationship|uncertainty/);
}

async function testLlamaCppProviderParsesCompatibleResponse() {
  const provider = createLlamaCppProvider({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ model: 'qwen-test', choices: [{ message: { content: JSON.stringify({ candidates: [{
        inquiry: 'なぜ違うのか？', context: { field: 'east' }, observation: '雑草が違う',
        relationship: 'spatial_variation', uncertainty: '未確認', tags: ['雑草'], source_refs: ['event-1'],
      }] }) } }] }),
    }),
  });
  const inference = await provider.infer({ task: 'generate_inquiries', eventId: 'event-1', payload: { observation: '雑草が違う' } });
  assert.equal(inference.model, 'qwen-test');
  assert.equal(inference.output.candidates[0].source_refs[0], 'event-1');
}

(async () => {
  await testInquiryGenerationGoldenPath();
  testMalformedInquiryOutputIsRejected();
  await testLlamaCppProviderParsesCompatibleResponse();
  console.log('v0.5.0 inquiry generation tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});