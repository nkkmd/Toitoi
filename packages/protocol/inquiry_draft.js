'use strict';

const DRAFT_SCHEMA_VERSION = '0.1.0';
const DRAFT_STATUSES = Object.freeze(['draft', 'in_review', 'approved', 'rejected']);
const STATUS_SET = new Set(DRAFT_STATUSES);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTimestamp(value, fieldName) {
  const timestamp = value ?? new Date().toISOString();
  if (!isNonEmptyString(timestamp) || !Number.isFinite(Date.parse(timestamp))) {
    throw new TypeError(`${fieldName} must be an ISO8601 date-time string`);
  }
  return timestamp;
}

function validateCandidate(candidate) {
  const errors = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return ['candidate must be an object'];
  }
  if (candidate.type !== 'inquiry') {
    errors.push('candidate.type must be inquiry');
  }
  if (!candidate.body || typeof candidate.body !== 'object') {
    errors.push('candidate.body is required');
  } else {
    if (!isNonEmptyString(candidate.body.text)) {
      errors.push('candidate.body.text is required');
    }
    if (!isNonEmptyString(candidate.body.language)) {
      errors.push('candidate.body.language is required');
    }
  }
  if (Object.prototype.hasOwnProperty.call(candidate, 'id')) {
    errors.push('candidate must not contain a published canonical event id');
  }
  if (Object.prototype.hasOwnProperty.call(candidate, 'createdAt')) {
    errors.push('candidate must not contain a published canonical event timestamp');
  }
  return errors;
}

function validateDerivation(derivation) {
  const errors = [];
  if (derivation == null) {
    return errors;
  }
  if (typeof derivation !== 'object' || Array.isArray(derivation)) {
    return ['derivation must be an object'];
  }
  if (!isNonEmptyString(derivation.sourceInquiryId)
    || !/^tt:evt:[^\s]+$/.test(derivation.sourceInquiryId)) {
    errors.push('derivation.sourceInquiryId must use the tt:evt:<opaque-id> form');
  }
  if (!isNonEmptyString(derivation.relationType)) {
    errors.push('derivation.relationType is required');
  }
  if (Object.prototype.hasOwnProperty.call(derivation, 'authorId')
    && !isNonEmptyString(derivation.authorId)) {
    errors.push('derivation.authorId must be a non-empty string');
  }
  if (Object.prototype.hasOwnProperty.call(derivation, 'ai')
    && (!derivation.ai || typeof derivation.ai !== 'object' || Array.isArray(derivation.ai))) {
    errors.push('derivation.ai must be an object');
  }
  return errors;
}

function validateInquiryDraft(draft) {
  const errors = [];
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return { ok: false, errors: ['draft must be an object'] };
  }
  if (!isNonEmptyString(draft.id) || !/^tt:draft:[^\s]+$/.test(draft.id)) {
    errors.push('id must use the tt:draft:<opaque-id> form');
  }
  if (draft.schemaVersion !== DRAFT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${DRAFT_SCHEMA_VERSION}`);
  }
  if (!STATUS_SET.has(draft.status)) {
    errors.push(`status must be one of: ${DRAFT_STATUSES.join(', ')}`);
  }
  for (const field of ['createdAt', 'updatedAt']) {
    if (!isNonEmptyString(draft[field]) || !Number.isFinite(Date.parse(draft[field]))) {
      errors.push(`${field} must be an ISO8601 date-time string`);
    }
  }
  errors.push(...validateCandidate(draft.candidate));
  errors.push(...validateDerivation(draft.derivation));

  if (draft.status === 'in_review' && !isNonEmptyString(draft.submittedAt)) {
    errors.push('submittedAt is required while in_review');
  }
  if (draft.status === 'approved' || draft.status === 'rejected') {
    if (!draft.review || typeof draft.review !== 'object') {
      errors.push('review is required after a review decision');
    } else {
      if (!isNonEmptyString(draft.review.reviewerId)) {
        errors.push('review.reviewerId is required');
      }
      if (!isNonEmptyString(draft.review.reviewedAt) || !Number.isFinite(Date.parse(draft.review.reviewedAt))) {
        errors.push('review.reviewedAt must be an ISO8601 date-time string');
      }
      if (draft.review.decision !== draft.status) {
        errors.push('review.decision must match draft status');
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function assertValid(draft) {
  const validation = validateInquiryDraft(draft);
  if (!validation.ok) {
    throw new TypeError(validation.errors.join('; '));
  }
  return draft;
}

function createInquiryDraft({ id, candidate, createdAt }) {
  const timestamp = normalizeTimestamp(createdAt, 'createdAt');
  return assertValid({
    id,
    schemaVersion: DRAFT_SCHEMA_VERSION,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    candidate: clone(candidate),
  });
}

function submitInquiryDraft(draft, { submittedAt } = {}) {
  assertValid(draft);
  if (draft.status !== 'draft' && draft.status !== 'rejected') {
    throw new Error(`cannot submit inquiry draft from status ${draft.status}`);
  }
  const timestamp = normalizeTimestamp(submittedAt, 'submittedAt');
  const next = clone(draft);
  next.status = 'in_review';
  next.submittedAt = timestamp;
  next.updatedAt = timestamp;
  delete next.review;
  return assertValid(next);
}

function decideInquiryDraft(draft, decision, { reviewerId, reviewedAt, note } = {}) {
  assertValid(draft);
  if (draft.status !== 'in_review') {
    throw new Error(`cannot review inquiry draft from status ${draft.status}`);
  }
  if (decision !== 'approved' && decision !== 'rejected') {
    throw new TypeError('decision must be approved or rejected');
  }
  if (!isNonEmptyString(reviewerId)) {
    throw new TypeError('reviewerId is required');
  }
  const timestamp = normalizeTimestamp(reviewedAt, 'reviewedAt');
  const next = clone(draft);
  next.status = decision;
  next.updatedAt = timestamp;
  next.review = {
    decision,
    reviewerId: reviewerId.trim(),
    reviewedAt: timestamp,
  };
  if (isNonEmptyString(note)) {
    next.review.note = note.trim();
  }
  return assertValid(next);
}

function approveInquiryDraft(draft, review) {
  return decideInquiryDraft(draft, 'approved', review);
}

function rejectInquiryDraft(draft, review) {
  return decideInquiryDraft(draft, 'rejected', review);
}

function assertPublishableInquiryDraft(draft) {
  assertValid(draft);
  if (draft.status !== 'approved') {
    throw new Error('only approved inquiry drafts may be published');
  }
  return clone(draft.candidate);
}

module.exports = {
  DRAFT_SCHEMA_VERSION,
  DRAFT_STATUSES,
  validateInquiryDraft,
  createInquiryDraft,
  submitInquiryDraft,
  approveInquiryDraft,
  rejectInquiryDraft,
  assertPublishableInquiryDraft,
};
