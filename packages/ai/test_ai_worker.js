'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  createAiJobQueue,
  createAiJsonlStore,
  createAiWorker,
  createDeterministicAiProvider,
} = require('./index');

async function testCompletedJobIsPersistedWithAnnotation() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-ai-'));
  const timestamps = ['2026-07-16T00:00:00.000Z', '2026-07-16T00:00:01.000Z', '2026-07-16T00:00:02.000Z'];
  const now = () => timestamps.shift() || '2026-07-16T00:00:03.000Z';
  const queue = createAiJobQueue({ now });
  const store = createAiJsonlStore({ directory });
  const provider = createDeterministicAiProvider();
  const worker = createAiWorker({ queue, store, provider, now });

  queue.enqueue({
    id: 'job-summary-1',
    eventId: 'event-1',
    task: 'summarize',
    payload: { content: '畑の東側だけ雑草の種類が違う。' },
  });

  const result = await worker.runOnce();
  assert.equal(result.processed, true);
  assert.equal(result.state, 'completed');
  assert.equal(result.annotation.reviewState, 'unreviewed');
  assert.equal(result.annotation.eventId, 'event-1');
  assert.match(result.annotation.output.summary, /雑草/);

  const jobs = store.readJobs();
  assert.deepEqual(jobs.map((job) => job.state), ['processing', 'completed']);
  assert.equal(store.readAnnotations().length, 1);
  assert.equal(store.latestJobsById().get('job-summary-1').state, 'completed');
}

async function testProviderFailureReturnsJobToPending() {
  const queue = createAiJobQueue({ maxAttempts: 2 });
  const provider = { infer: async () => { throw new Error('provider unavailable'); } };
  const worker = createAiWorker({ queue, provider });
  queue.enqueue({ id: 'job-failure-1', eventId: 'event-2', task: 'tag' });

  const first = await worker.runOnce();
  assert.equal(first.state, 'pending');
  assert.equal(first.error, 'provider unavailable');

  const second = await worker.runOnce();
  assert.equal(second.state, 'failed');
  assert.equal(queue.get('job-failure-1').attempts, 2);
}

async function testEmptyQueueIsExplicit() {
  const queue = createAiJobQueue();
  const provider = createDeterministicAiProvider();
  const worker = createAiWorker({ queue, provider });
  assert.deepEqual(await worker.runOnce(), { processed: false, reason: 'empty' });
}

(async () => {
  await testCompletedJobIsPersistedWithAnnotation();
  await testProviderFailureReturnsJobToPending();
  await testEmptyQueueIsExplicit();
  console.log('AI worker tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
