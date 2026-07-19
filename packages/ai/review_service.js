'use strict';

const { createAiAnnotation } = require('./annotation');

function createAiReviewService({ store, now = () => new Date().toISOString() }) {
  if (!store || typeof store.latestAnnotationsById !== 'function' || typeof store.appendAnnotation !== 'function') {
    throw new TypeError('store must implement latestAnnotationsById and appendAnnotation');
  }

  function mutate(id, action, { output, reviewedBy, note } = {}) {
    const current = store.latestAnnotationsById().get(id);
    if (!current) throw new Error(`annotation not found: ${id}`);
    if (current.reviewState !== 'unreviewed') {
      throw new Error(`annotation ${id} is already ${current.reviewState}`);
    }
    if (!['accept', 'edit', 'reject'].includes(action)) throw new TypeError(`unsupported review action: ${action}`);
    if (typeof reviewedBy !== 'string' || reviewedBy.trim() === '') {
      throw new TypeError('reviewedBy must be a non-empty string');
    }

    const reviewState = action === 'accept' ? 'accepted' : action === 'edit' ? 'edited' : 'rejected';
    const nextOutput = action === 'edit' ? output : current.output;
    if (action === 'edit' && (!output || typeof output !== 'object' || Array.isArray(output))) {
      throw new TypeError('output is required for edit');
    }

    const next = createAiAnnotation({
      ...current,
      output: nextOutput,
      reviewState,
      reviewedAt: now(),
      reviewedBy: reviewedBy.trim(),
      reviewNote: note || null,
    });
    store.appendAnnotation(next);
    return next;
  }

  return Object.freeze({
    accept: (id, input) => mutate(id, 'accept', input),
    edit: (id, input) => mutate(id, 'edit', input),
    reject: (id, input) => mutate(id, 'reject', input),
  });
}

module.exports = { createAiReviewService };