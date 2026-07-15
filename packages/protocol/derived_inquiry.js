'use strict';

const {
  createInquiryDraft,
  assertPublishableInquiryDraft,
} = require('./inquiry_draft');

const DERIVATION_TYPES = Object.freeze([
  'derived_from',
  'translated_from',
  'annotates',
  'reframes',
  'revises',
  'synthesizes',
]);
const DERIVATION_TYPE_SET = new Set(DERIVATION_TYPES);

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

function assertDerivationType(type) {
  if (!DERIVATION_TYPE_SET.has(type)) {
    throw new TypeError(`relationType must be one of: ${DERIVATION_TYPES.join(', ')}`);
  }
  return type;
}

function createDerivedInquiryDraft({
  id,
  sourceInquiryId,
  relationType,
  candidate,
  createdAt,
  authorId,
  ai,
}) {
  if (!isNonEmptyString(sourceInquiryId) || !/^tt:evt:[^\s]+$/.test(sourceInquiryId)) {
    throw new TypeError('sourceInquiryId must use the tt:evt:<opaque-id> form');
  }
  assertDerivationType(relationType);

  const nextCandidate = clone(candidate);
  nextCandidate.lineage = Array.isArray(nextCandidate.lineage) ? nextCandidate.lineage.slice() : [];
  nextCandidate.lineage.push({ type: relationType, target: sourceInquiryId });

  const draft = createInquiryDraft({ id, candidate: nextCandidate, createdAt });
  draft.derivation = {
    sourceInquiryId,
    relationType,
  };
  if (isNonEmptyString(authorId)) {
    draft.derivation.authorId = authorId.trim();
  }
  if (ai && typeof ai === 'object' && !Array.isArray(ai)) {
    draft.derivation.ai = clone(ai);
  }
  return draft;
}

function publishApprovedDerivedInquiry(draft, {
  canonicalId,
  publishedAt,
  publisherId,
  sourceProtocol = 'toitoi',
  sourceId,
} = {}) {
  const candidate = assertPublishableInquiryDraft(draft);
  if (!draft.derivation || typeof draft.derivation !== 'object') {
    throw new TypeError('derived inquiry draft requires derivation metadata');
  }
  if (!isNonEmptyString(canonicalId) || !/^tt:evt:[^\s]+$/.test(canonicalId)) {
    throw new TypeError('canonicalId must use the tt:evt:<opaque-id> form');
  }
  if (!isNonEmptyString(publisherId)) {
    throw new TypeError('publisherId is required');
  }
  const timestamp = normalizeTimestamp(publishedAt, 'publishedAt');
  const provenanceSourceId = isNonEmptyString(sourceId) ? sourceId.trim() : draft.id;

  return {
    ...clone(candidate),
    id: canonicalId,
    schemaVersion: '0.1.0',
    createdAt: timestamp,
    provenance: {
      sources: [{
        protocol: sourceProtocol,
        sourceId: provenanceSourceId,
        createdAt: timestamp,
      }],
    },
    meta: {
      ...(candidate.meta && typeof candidate.meta === 'object' ? clone(candidate.meta) : {}),
      publication: {
        draftId: draft.id,
        publisherId: publisherId.trim(),
        publishedAt: timestamp,
        sourceInquiryId: draft.derivation.sourceInquiryId,
        relationType: draft.derivation.relationType,
        authorId: draft.derivation.authorId || null,
        ai: draft.derivation.ai || null,
        humanReview: clone(draft.review),
      },
    },
  };
}

module.exports = {
  DERIVATION_TYPES,
  createDerivedInquiryDraft,
  publishApprovedDerivedInquiry,
};
