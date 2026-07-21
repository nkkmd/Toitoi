'use strict';

const VOCABULARY_SCOPES = Object.freeze(['core', 'domain', 'local']);
const MAPPING_RELATIONS = Object.freeze([
  'exact_match',
  'close_match',
  'broader_than',
  'narrower_than',
  'translated_as',
  'related_to',
]);

function nonEmpty(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeLabels(labels) {
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
    throw new TypeError('labels must be an object keyed by language tag');
  }
  const normalized = {};
  for (const [language, label] of Object.entries(labels)) {
    normalized[nonEmpty(language, 'label language')] = nonEmpty(label, 'label');
  }
  if (Object.keys(normalized).length === 0) {
    throw new TypeError('labels must contain at least one localized label');
  }
  return normalized;
}

function createVocabularyTerm(input = {}) {
  const scope = nonEmpty(input.scope, 'scope');
  if (!VOCABULARY_SCOPES.includes(scope)) {
    throw new RangeError(`Unsupported vocabulary scope: ${scope}`);
  }
  const term = {
    id: nonEmpty(input.id, 'id'),
    scope,
    labels: normalizeLabels(input.labels),
    definition: typeof input.definition === 'string' ? input.definition.trim() : '',
    vocabularyId: nonEmpty(input.vocabularyId, 'vocabularyId'),
    provenance: input.provenance && typeof input.provenance === 'object'
      ? JSON.parse(JSON.stringify(input.provenance))
      : {},
  };
  if (scope === 'local') {
    term.locality = nonEmpty(input.locality, 'locality');
  }
  return Object.freeze(term);
}

function createVocabularyMappingClaim(input = {}) {
  const relation = nonEmpty(input.relation, 'relation');
  if (!MAPPING_RELATIONS.includes(relation)) {
    throw new RangeError(`Unsupported vocabulary mapping relation: ${relation}`);
  }
  const sourceTermId = nonEmpty(input.sourceTermId, 'sourceTermId');
  const targetTermId = nonEmpty(input.targetTermId, 'targetTermId');
  if (sourceTermId === targetTermId) {
    throw new TypeError('A vocabulary mapping claim requires distinct source and target terms');
  }
  return Object.freeze({
    id: nonEmpty(input.id, 'id'),
    sourceTermId,
    targetTermId,
    relation,
    rationale: nonEmpty(input.rationale, 'rationale'),
    language: typeof input.language === 'string' ? input.language.trim() : '',
    status: input.status === 'accepted' ? 'accepted' : 'proposed',
    confirmedByHuman: input.confirmedByHuman === true,
    provenance: input.provenance && typeof input.provenance === 'object'
      ? JSON.parse(JSON.stringify(input.provenance))
      : {},
  });
}

function classifyVocabularyConnection(claim) {
  if (!claim || typeof claim !== 'object') return 'unrelated';
  if (claim.relation === 'exact_match' && claim.status === 'accepted' && claim.confirmedByHuman === true) {
    return 'mapped_equivalent';
  }
  return 'mapping_candidate';
}

module.exports = {
  MAPPING_RELATIONS,
  VOCABULARY_SCOPES,
  classifyVocabularyConnection,
  createVocabularyMappingClaim,
  createVocabularyTerm,
};
