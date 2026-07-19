'use strict';

const AI_ANNOTATION_SCHEMA_VERSION = '0.2.0';
const SUPPORTED_TASKS = new Set(['summarize', 'tag', 'generate_inquiries']);
const REVIEW_STATES = new Set(['unreviewed', 'accepted', 'edited', 'rejected']);

function assertNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

function normalizeStringArray(values, field, { allowEmpty = true } = {}) {
  if (!Array.isArray(values)) throw new TypeError(`${field} must be an array`);
  const normalized = [...new Set(values.map((value) => {
    assertNonEmptyString(value, `${field}[]`);
    return value.trim();
  }))];
  if (!allowEmpty && normalized.length === 0) throw new TypeError(`${field} must not be empty`);
  return normalized;
}

function normalizeTags(tags) {
  return normalizeStringArray(tags, 'output.tags');
}

function normalizeInquiryCandidate(candidate, index) {
  const field = `output.candidates[${index}]`;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new TypeError(`${field} must be an object`);
  }
  assertNonEmptyString(candidate.inquiry, `${field}.inquiry`);
  assertNonEmptyString(candidate.observation, `${field}.observation`);
  assertNonEmptyString(candidate.relationship, `${field}.relationship`);
  assertNonEmptyString(candidate.uncertainty, `${field}.uncertainty`);

  const context = candidate.context && typeof candidate.context === 'object' && !Array.isArray(candidate.context)
    ? { ...candidate.context }
    : (() => { throw new TypeError(`${field}.context must be an object`); })();

  return Object.freeze({
    inquiry: candidate.inquiry.trim(),
    context: Object.freeze(context),
    observation: candidate.observation.trim(),
    relationship: candidate.relationship.trim(),
    uncertainty: candidate.uncertainty.trim(),
    tags: Object.freeze(normalizeStringArray(candidate.tags || [], `${field}.tags`)),
    source_refs: Object.freeze(normalizeStringArray(candidate.source_refs || [], `${field}.source_refs`, { allowEmpty: false })),
  });
}

function normalizeInquiryOutput(output) {
  if (!Array.isArray(output.candidates) || output.candidates.length === 0) {
    throw new TypeError('output.candidates must be a non-empty array');
  }
  return { candidates: Object.freeze(output.candidates.map(normalizeInquiryCandidate)) };
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

  if (!SUPPORTED_TASKS.has(input.task)) throw new TypeError(`unsupported task: ${input.task}`);
  const reviewState = input.reviewState || 'unreviewed';
  if (!REVIEW_STATES.has(reviewState)) throw new TypeError(`unsupported reviewState: ${reviewState}`);

  let output = input.output && typeof input.output === 'object' && !Array.isArray(input.output)
    ? { ...input.output }
    : {};
  if (input.task === 'summarize') assertNonEmptyString(output.summary, 'output.summary');
  if (input.task === 'tag') output.tags = normalizeTags(output.tags);
  if (input.task === 'generate_inquiries') output = normalizeInquiryOutput(output);

  return Object.freeze({
    schemaVersion: AI_ANNOTATION_SCHEMA_VERSION,
    id: input.id,
    eventId: input.eventId,
    task: input.task,
    output: Object.freeze(output),
    model: input.model,
    modelVersion: input.modelVersion || null,
    promptVersion: input.promptVersion,
    rawOutput: input.rawOutput == null ? null : String(input.rawOutput),
    createdAt: input.createdAt,
    generatedAt: input.generatedAt || input.createdAt,
    reviewState,
    reviewedAt: input.reviewedAt || null,
    reviewedBy: input.reviewedBy || null,
    reviewNote: input.reviewNote || null,
  });
}

module.exports = {
  AI_ANNOTATION_SCHEMA_VERSION,
  SUPPORTED_TASKS,
  REVIEW_STATES,
  createAiAnnotation,
  normalizeInquiryCandidate,
};