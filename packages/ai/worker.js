'use strict';

const { createAiAnnotation } = require('./annotation');

function createAiWorker({ queue, provider, store = null, now = () => new Date().toISOString(), createId = defaultAnnotationId }) {
  if (!queue || typeof queue.claimNext !== 'function') throw new TypeError('queue must implement claimNext');
  if (!provider || typeof provider.infer !== 'function') throw new TypeError('provider must implement infer');

  async function runOnce() {
    const job = queue.claimNext();
    if (!job) return { processed: false, reason: 'empty' };
    persistJob(job);

    try {
      const inference = await provider.infer(job);
      const createdAt = now();
      const annotation = createAiAnnotation({
        id: createId(job, inference),
        eventId: job.eventId,
        task: job.task,
        output: inference.output,
        model: inference.model || provider.model || 'unknown',
        modelVersion: inference.modelVersion || provider.modelVersion || null,
        promptVersion: inference.promptVersion || provider.promptVersion || 'unknown',
        rawOutput: inference.rawOutput,
        createdAt,
        generatedAt: inference.generatedAt || createdAt,
      });

      if (store && typeof store.appendAnnotation === 'function') store.appendAnnotation(annotation);
      const completed = queue.complete(job.id, { annotationId: annotation.id });
      persistJob(completed);
      return { processed: true, state: 'completed', job: completed, annotation };
    } catch (error) {
      const failed = queue.fail(job.id, error);
      persistJob(failed);
      return { processed: true, state: failed.state, job: failed, error: failed.lastError };
    }
  }

  function persistJob(job) {
    if (store && typeof store.appendJob === 'function') store.appendJob(job);
  }

  return Object.freeze({ runOnce });
}

function defaultAnnotationId(job) {
  return `ai:${job.id}:${job.attempts}`;
}

module.exports = { createAiWorker, defaultAnnotationId };