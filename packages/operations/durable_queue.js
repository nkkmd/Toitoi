'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensureDirectory(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
}

function appendJsonl(filename, value) {
  ensureDirectory(filename);
  fs.appendFileSync(filename, `${JSON.stringify(value)}\n`, 'utf8');
}

function readJsonl(filename) {
  if (!fs.existsSync(filename)) return [];
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

class DurableJobQueue {
  constructor(options = {}) {
    if (!options.directory) throw new TypeError('directory is required');
    this.directory = path.resolve(options.directory);
    this.eventsFile = path.join(this.directory, 'queue-events.jsonl');
    this.deadLetterFile = path.join(this.directory, 'dead-letter.jsonl');
    this.now = options.now || (() => new Date().toISOString());
    this.id = options.id || (() => crypto.randomUUID());
    this.accepting = true;
    this.inFlight = new Set();
  }

  append(type, jobId, data = {}) {
    const event = { sequence: readJsonl(this.eventsFile).length + 1, type, jobId, at: this.now(), data };
    appendJsonl(this.eventsFile, event);
    return event;
  }

  enqueue(payload, options = {}) {
    if (!this.accepting) throw new Error('queue is shutting down');
    const jobId = options.jobId || this.id();
    this.append('enqueued', jobId, { payload, attempts: 0, maxAttempts: options.maxAttempts || 3 });
    return jobId;
  }

  snapshot() {
    const state = new Map();
    for (const event of readJsonl(this.eventsFile)) {
      const previous = state.get(event.jobId) || { jobId: event.jobId };
      if (event.type === 'enqueued') state.set(event.jobId, { ...previous, ...event.data, status: 'pending' });
      if (event.type === 'started') state.set(event.jobId, { ...previous, status: 'running', attempts: event.data.attempts });
      if (event.type === 'retry') state.set(event.jobId, { ...previous, status: 'pending', attempts: event.data.attempts, lastError: event.data.error });
      if (event.type === 'completed') state.set(event.jobId, { ...previous, status: 'completed', result: event.data.result });
      if (event.type === 'dead_lettered') state.set(event.jobId, { ...previous, status: 'dead_letter', attempts: event.data.attempts, lastError: event.data.error });
    }
    return [...state.values()];
  }

  pending() {
    return this.snapshot().filter(job => job.status === 'pending' || job.status === 'running');
  }

  async runNext(handler) {
    const job = this.pending()[0];
    if (!job) return null;
    const attempts = (job.attempts || 0) + 1;
    this.inFlight.add(job.jobId);
    this.append('started', job.jobId, { attempts });
    try {
      const result = await handler(job.payload, { jobId: job.jobId, attempts });
      this.append('completed', job.jobId, { result });
      return { jobId: job.jobId, status: 'completed', result };
    } catch (error) {
      if (attempts >= job.maxAttempts) {
        const record = { jobId: job.jobId, payload: job.payload, attempts, error: error.message, failedAt: this.now() };
        appendJsonl(this.deadLetterFile, record);
        this.append('dead_lettered', job.jobId, { attempts, error: error.message });
        return { jobId: job.jobId, status: 'dead_letter', error: error.message };
      }
      this.append('retry', job.jobId, { attempts, error: error.message });
      return { jobId: job.jobId, status: 'pending', error: error.message };
    } finally {
      this.inFlight.delete(job.jobId);
    }
  }

  deadLetters() {
    return readJsonl(this.deadLetterFile);
  }

  beginShutdown() {
    this.accepting = false;
    return { accepting: false, inFlight: this.inFlight.size };
  }

  isDrained() {
    return this.inFlight.size === 0;
  }
}

module.exports = { DurableJobQueue, appendJsonl, readJsonl };
