'use strict';

const JOB_STATES = new Set(['pending', 'processing', 'completed', 'failed']);

function createAiJobQueue({ maxAttempts = 3, now = () => new Date().toISOString() } = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError('maxAttempts must be a positive integer');
  }

  const jobs = new Map();
  const order = [];

  function enqueue({ id, eventId, task, payload = null }) {
    for (const [field, value] of Object.entries({ id, eventId, task })) {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeError(`${field} must be a non-empty string`);
      }
    }
    if (jobs.has(id)) {
      return { accepted: false, reason: 'duplicate', job: jobs.get(id) };
    }

    const timestamp = now();
    const job = {
      id,
      eventId,
      task,
      payload,
      state: 'pending',
      attempts: 0,
      lastError: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    jobs.set(id, job);
    order.push(id);
    return { accepted: true, job: { ...job } };
  }

  function claimNext() {
    const id = order.find((candidate) => jobs.get(candidate).state === 'pending');
    if (!id) return null;

    const job = jobs.get(id);
    job.state = 'processing';
    job.attempts += 1;
    job.updatedAt = now();
    return { ...job };
  }

  function complete(id, result) {
    const job = requireProcessingJob(id);
    job.state = 'completed';
    job.result = result;
    job.updatedAt = now();
    return { ...job };
  }

  function fail(id, error) {
    const job = requireProcessingJob(id);
    job.lastError = error instanceof Error ? error.message : String(error);
    job.state = job.attempts >= maxAttempts ? 'failed' : 'pending';
    job.updatedAt = now();
    return { ...job };
  }

  function requireProcessingJob(id) {
    const job = jobs.get(id);
    if (!job) throw new Error(`unknown job: ${id}`);
    if (job.state !== 'processing') {
      throw new Error(`job ${id} is not processing`);
    }
    return job;
  }

  function get(id) {
    const job = jobs.get(id);
    return job ? { ...job } : null;
  }

  function list({ state } = {}) {
    if (state && !JOB_STATES.has(state)) {
      throw new TypeError(`unsupported state: ${state}`);
    }
    return order
      .map((id) => jobs.get(id))
      .filter((job) => !state || job.state === state)
      .map((job) => ({ ...job }));
  }

  return Object.freeze({ enqueue, claimNext, complete, fail, get, list });
}

module.exports = { JOB_STATES, createAiJobQueue };
