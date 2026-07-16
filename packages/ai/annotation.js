'use strict';

const AI_ANNOTATION_SCHEMA_VERSION = '0.1.0';
const SUPPORTED_TASKS = new Set(['summarize', 'tag']);
const REVIEW_STATES = new Set(['unreviewed', 'accepted', 'edited', 'rejected']);

function assertNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    throw new TypeError('output.tags must be an array');
  }

  return [...new Set(tags.map((tag) => {
    assertNonEmptyString(tag, 'output.tags[]');
    return tag.trim();
  }))];
}

function createAiAnnotation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('annotation input must be an object');
  }

  assertNonEmptyString(input.id, 'id');
  assertNonEmptyString(input.eventId, 'eventId');
  assertNonEmptyString(input.task, 'task');
  assertNonEmptyString(input.model, 'model');
  assertNonEmptyString(input.promptVersion, 'promptVersion');
  assertNonEmptyString(input.createdAt, 'createdAt');

  if (!SUPPORTED_TASKS.has(input.task)) {
    throw new TypeError(`unsupported task: ${input.task}`);
  }

  const reviewState = input.reviewState || 'unreviewed';
  if (!REVIEW_STATES.has(reviewState)) {
    throw new TypeError(`unsupported reviewState: ${reviewState}`);
  }

  const output = input.output && typeof input.output === 'object'
    ? { ...input.output }
    : {};

  if (input.task === 'summarize') {
    assertNonEmptyString(output.summary, 'output.summary');
  }

  if (input.task === 'tag') {
    output.tags = normalizeTags(output.tags);
  }

  return Object.freeze({
    schemaVersion: AI_ANNOTATION_SCHEMA_VERSION,
    id: input.id,
    eventId: input.eventId,
    task: input.task,
    output: Object.freeze(output),
    model: input.model,
    promptVersion: input.promptVersion,
    rawOutput: input.rawOutput == null ? null : String(input.rawOutput),
    createdAt: input.createdAt,
    reviewState,
    reviewedAt: input.reviewedAt || null,
    reviewNote: input.reviewNote || null,
  });
}

module.exports = {
  AI_ANNOTATION_SCHEMA_VERSION,
  SUPPORTED_TASKS,
  REVIEW_STATES,
  createAiAnnotation,
};
