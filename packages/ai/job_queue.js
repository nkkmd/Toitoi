'use strict';

const JOB_STATES = new Set(['pending', 'processing', 'completed', 'failed']);

function createAiJobQueue({ maxAttempts = 3, now = () => new Date().toISOString() } = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError('maxAttempts must be a positive integer');
  }

  const jobs = new Map();
  const order = [];

  function validateIdentity({ id, eventId, task }) {
    for (const [field, value] of Object.entries({ id, eventId, task })) {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeError(`${field} must be a non-empty string`);
      }
    }
  }

  function enqueue({ id, eventId, task, payload = null }) {
    validateIdentity({ id, eventId, task });
    if (jobs.has(id)) {
      return { accepted: false, reason: 'duplicate', job: { ...jobs.get(id) } };
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

  function restore(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      throw new TypeError('snapshot must be an object');
    }
    validateIdentity(snapshot);
    if (!JOB_STATES.has(snapshot.state)) {
      throw new TypeError(`unsupported state: ${snapshot.state}`);
    }
    if (!Number.isInteger(snapshot.attempts) || snapshot.attempts < 0) {
      throw new TypeError('attempts must be a non-negative integer');
    }
    if (snapshot.attempts > maxAttempts) {
      throw new TypeError('attempts exceeds maxAttempts');
    }
    if (jobs.has(snapshot.id)) {
      throw new Error(`duplicate restored job: ${snapshot.id}`);
    }

    const job = {
      id: snapshot.id,
      eventId: snapshot.eventId,
      task: snapshot.task,
      payload: snapshot.payload == null ? null : snapshot.payload,
      state: snapshot.state,
      attempts: snapshot.attempts,
      lastError: snapshot.lastError == null ? null : String(snapshot.lastError),
      createdAt: snapshot.createdAt || now(),
      updatedAt: snapshot.updatedAt || snapshot.createdAt || now(),
    };
    if (Object.prototype.hasOwnProperty.call(snapshot, 'result')) job.result = snapshot.result;
    jobs.set(job.id, job);
    order.push(job.id);
    return { ...job };
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

  return Object.freeze({ enqueue, restore, claimNext, complete, fail, get, list });
}

module.exports = { JOB_STATES, createAiJobQueue };
