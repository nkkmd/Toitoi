'use strict';

const {
  createInquiryDraft,
  assertPublishableInquiryDraft,
} = require('./inquiry_draft');

const DERIVATION_TYPES = Object.freeze([
  'derived_from',
  'translated_from',
  'observed_alongside',
  'contrasts_with',
  'synthesizes',
  'reframes',
  'annotates',
  'revises',
]);
const DERIVATION_TYPE_SET = new Set(DERIVATION_TYPES);

const RELATION_GUIDANCE = Object.freeze({
  derived_from: 'Create a general derivative inquiry while preserving the source lineage.',
  translated_from: 'Translate the inquiry into a different language without claiming canonical identity.',
  observed_alongside: 'Connect an inquiry observed in the same field, time, or context.',
  contrasts_with: 'State the meaningful difference or tension between the inquiries.',
  synthesizes: 'Combine at least two source inquiries into a new inquiry.',
  reframes: 'Restate the inquiry from a materially different perspective.',
  annotates: 'Add an explanatory, contextual, or interpretive inquiry.',
  revises: 'Correct or update the source inquiry while preserving its history.',
});

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

function assertCanonicalEventId(value, fieldName) {
  if (!isNonEmptyString(value) || !/^tt:evt:[^\s]+$/.test(value)) {
    throw new TypeError(`${fieldName} must use the tt:evt:<opaque-id> form`);
  }
  return value.trim();
}

function assertDerivationType(type) {
  if (!DERIVATION_TYPE_SET.has(type)) {
    throw new TypeError(`relationType must be one of: ${DERIVATION_TYPES.join(', ')}`);
  }
  return type;
}

function normalizeRelationDetails(relationType, details = {}, { strict = false } = {}) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    throw new TypeError('relationDetails must be an object');
  }

  const normalized = clone(details);
  const requiredString = (field, message) => {
    if (strict && !isNonEmptyString(normalized[field])) throw new TypeError(message);
    if (isNonEmptyString(normalized[field])) normalized[field] = normalized[field].trim();
  };

  if (relationType === 'translated_from') {
    requiredString('sourceLanguage', 'translated_from requires sourceLanguage');
    requiredString('targetLanguage', 'translated_from requires targetLanguage');
    if (strict && normalized.sourceLanguage === normalized.targetLanguage) {
      throw new TypeError('translated_from requires a different targetLanguage');
    }
  }
  if (relationType === 'observed_alongside') {
    if (strict && !isNonEmptyString(normalized.observationNote) && !isNonEmptyString(normalized.contextNote)) {
      throw new TypeError('observed_alongside requires observationNote or contextNote');
    }
  }
  if (relationType === 'contrasts_with') requiredString('rationale', 'contrasts_with requires rationale');
  if (relationType === 'reframes') requiredString('rationale', 'reframes requires rationale');
  if (relationType === 'annotates') {
    if (strict && !isNonEmptyString(normalized.annotationText) && !isNonEmptyString(normalized.rationale)) {
      throw new TypeError('annotates requires annotationText or rationale');
    }
  }
  if (relationType === 'revises') requiredString('revisionSummary', 'revises requires revisionSummary');
  if (relationType === 'synthesizes') {
    const sourceInquiryIds = Array.isArray(normalized.sourceInquiryIds) ? normalized.sourceInquiryIds : [];
    if (strict && sourceInquiryIds.length < 2) {
      throw new TypeError('synthesizes requires at least two sourceInquiryIds');
    }
    normalized.sourceInquiryIds = [...new Set(sourceInquiryIds.map((id, index) => assertCanonicalEventId(id, `sourceInquiryIds[${index}]`)))];
    if (strict && normalized.sourceInquiryIds.length < 2) {
      throw new TypeError('synthesizes requires at least two distinct sourceInquiryIds');
    }
  }

  return normalized;
}

function createDerivedInquiryDraft({
  id,
  sourceInquiryId,
  relationType,
  relationDetails = {},
  relationConfirmedByHuman = true,
  strictRelationValidation = false,
  candidate,
  createdAt,
  authorId,
  ai,
}) {
  const sourceId = assertCanonicalEventId(sourceInquiryId, 'sourceInquiryId');
  assertDerivationType(relationType);
  if (relationConfirmedByHuman !== true) {
    throw new TypeError('relationConfirmedByHuman must be true before creating a derived Inquiry Draft');
  }
  const normalizedDetails = normalizeRelationDetails(relationType, relationDetails, {
    strict: strictRelationValidation,
  });

  const nextCandidate = clone(candidate);
  nextCandidate.lineage = Array.isArray(nextCandidate.lineage) ? nextCandidate.lineage.slice() : [];
  const lineageSources = relationType === 'synthesizes'
    ? normalizedDetails.sourceInquiryIds
    : [sourceId];
  for (const target of lineageSources) {
    nextCandidate.lineage.push({ type: relationType, target });
  }

  const draft = createInquiryDraft({ id, candidate: nextCandidate, createdAt });
  draft.derivation = {
    sourceInquiryId: sourceId,
    sourceInquiryIds: lineageSources,
    relationType,
    relationDetails: normalizedDetails,
    relationConfirmedByHuman: true,
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
  assertCanonicalEventId(canonicalId, 'canonicalId');
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
        sourceInquiryIds: clone(draft.derivation.sourceInquiryIds || [draft.derivation.sourceInquiryId]),
        relationType: draft.derivation.relationType,
        relationDetails: clone(draft.derivation.relationDetails || {}),
        relationConfirmedByHuman: draft.derivation.relationConfirmedByHuman === true,
        authorId: draft.derivation.authorId || null,
        ai: draft.derivation.ai || null,
        humanReview: clone(draft.review),
      },
    },
  };
}

module.exports = {
  DERIVATION_TYPES,
  RELATION_GUIDANCE,
  assertDerivationType,
  normalizeRelationDetails,
  createDerivedInquiryDraft,
  publishApprovedDerivedInquiry,
};
