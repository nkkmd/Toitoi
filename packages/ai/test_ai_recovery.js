'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  createAiInspectionService,
  createAiJsonlStore,
  restoreAiJobQueue,
} = require('./index');

function withTempDir(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-ai-recovery-'));
  try {
    run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

withTempDir((directory) => {
  const store = createAiJsonlStore({ directory });
  store.appendJob({
    id: 'job-pending', eventId: 'event-1', task: 'summarize', payload: { text: 'A' },
    state: 'pending', attempts: 0, lastError: null,
    createdAt: '2026-07-16T00:00:00.000Z', updatedAt: '2026-07-16T00:00:00.000Z',
  });
  store.appendJob({
    id: 'job-processing', eventId: 'event-1', task: 'tag', payload: { text: 'B' },
    state: 'processing', attempts: 1, lastError: null,
    createdAt: '2026-07-16T00:00:01.000Z', updatedAt: '2026-07-16T00:00:02.000Z',
  });
  store.appendJob({
    id: 'job-completed', eventId: 'event-2', task: 'summarize', payload: null,
    state: 'completed', attempts: 1, lastError: null, result: { annotationId: 'annotation-1' },
    createdAt: '2026-07-16T00:00:03.000Z', updatedAt: '2026-07-16T00:00:04.000Z',
  });
  store.appendAnnotation({
    recordType: 'annotation', schemaVersion: '0.1.0', id: 'annotation-1', eventId: 'event-2',
    task: 'summarize', output: { summary: 'summary' }, model: 'fake', promptVersion: 'test',
    rawOutput: '{}', createdAt: '2026-07-16T00:00:04.000Z', reviewState: 'unreviewed',
    reviewedAt: null, reviewNote: null,
  });

  const restored = restoreAiJobQueue({ store, maxAttempts: 3 });
  assert.equal(restored.queue.get('job-pending').state, 'pending');
  assert.equal(restored.queue.get('job-processing').state, 'pending');
  assert.equal(restored.queue.get('job-processing').attempts, 1);
  assert.equal(restored.queue.get('job-processing').lastError, 'requeued after process restart');
  assert.equal(restored.queue.get('job-completed').state, 'completed');
  assert.deepEqual(restored.queue.get('job-completed').result, { annotationId: 'annotation-1' });

  const latestProcessing = store.latestJobsById().get('job-processing');
  assert.equal(latestProcessing.state, 'pending');

  const inspection = createAiInspectionService({ store });
  assert.equal(inspection.listJobs({ state: 'pending' }).length, 2);
  assert.equal(inspection.listJobs({ eventId: 'event-1' }).length, 2);
  assert.equal(inspection.getJob('missing'), null);
  assert.equal(inspection.listAnnotations({ eventId: 'event-2' }).length, 1);
  assert.equal(inspection.getAnnotation('annotation-1').output.summary, 'summary');
  assert.deepEqual(
    inspection.getEventAiView('event-2').annotations.map((item) => item.id),
    ['annotation-1'],
  );
});

console.log('ai recovery tests passed');
