'use strict';

const assert = require('node:assert/strict');
const {
  AI_ANNOTATION_SCHEMA_VERSION,
  createAiAnnotation,
  createAiJobQueue,
} = require('./index');

function testAnnotationContract() {
  const annotation = createAiAnnotation({
    id: 'ann-1',
    eventId: 'event-1',
    task: 'tag',
    output: { tags: ['weed', 'east-side', 'weed'] },
    model: 'local-model',
    promptVersion: 'tag-v1',
    rawOutput: '{"tags":["weed","east-side"]}',
    createdAt: '2026-07-16T00:00:00.000Z',
  });

  assert.equal(annotation.schemaVersion, AI_ANNOTATION_SCHEMA_VERSION);
  assert.deepEqual(annotation.output.tags, ['weed', 'east-side']);
  assert.equal(annotation.reviewState, 'unreviewed');
  assert.throws(() => createAiAnnotation({
    id: 'ann-2', eventId: 'event-1', task: 'summarize', output: {},
    model: 'local-model', promptVersion: 'summary-v1', createdAt: '2026-07-16T00:00:00.000Z',
  }), /output.summary/);
}

function testQueueRetryBoundary() {
  const timestamps = ['t1', 't2', 't3', 't4', 't5'];
  const queue = createAiJobQueue({ maxAttempts: 2, now: () => timestamps.shift() || 'tn' });

  assert.equal(queue.enqueue({ id: 'job-1', eventId: 'event-1', task: 'summarize' }).accepted, true);
  assert.equal(queue.enqueue({ id: 'job-1', eventId: 'event-1', task: 'summarize' }).reason, 'duplicate');

  assert.equal(queue.claimNext().attempts, 1);
  assert.equal(queue.fail('job-1', new Error('temporary')).state, 'pending');
  assert.equal(queue.claimNext().attempts, 2);
  assert.equal(queue.fail('job-1', 'still broken').state, 'failed');
  assert.equal(queue.claimNext(), null);
  assert.equal(queue.list({ state: 'failed' }).length, 1);
}

testAnnotationContract();
testQueueRetryBoundary();
console.log('AI foundation tests passed');