'use strict';

const { createAiJobQueue } = require('./job_queue');

function restoreAiJobQueue({ store, maxAttempts = 3, now, requeueProcessing = true } = {}) {
  if (!store || typeof store.latestJobsById !== 'function') {
    throw new TypeError('store.latestJobsById must be a function');
  }

  const queue = createAiJobQueue({ maxAttempts, now });
  const latest = [...store.latestJobsById().values()]
    .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));

  const recovered = [];
  for (const record of latest) {
    const state = record.state === 'processing' && requeueProcessing ? 'pending' : record.state;
    const job = queue.restore({
      ...record,
      state,
      lastError: record.state === 'processing' && requeueProcessing
        ? 'requeued after process restart'
        : record.lastError,
    });
    recovered.push(job);

    if (record.state === 'processing' && requeueProcessing) {
      store.appendJob(job);
    }
  }

  return Object.freeze({ queue, recovered });
}

module.exports = { restoreAiJobQueue };
