'use strict';

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function relationTerms(event) {
  const terms = [];
  for (const collection of [event?.relationships, event?.lineage]) {
    for (const edge of Array.isArray(collection) ? collection : []) {
      if (!edge || typeof edge !== 'object') continue;
      for (const value of [edge.type, edge.relation, edge.source, edge.target]) {
        if (nonEmpty(value)) terms.push(value.trim());
      }
    }
  }
  return terms;
}

function classifySearchResult(options = {}) {
  const requestedId = nonEmpty(options.requestedId) ? options.requestedId.trim() : null;
  const event = options.event && typeof options.event === 'object' ? options.event : {};
  const eventId = nonEmpty(event.id) ? event.id.trim() : null;

  if (requestedId && eventId === requestedId) {
    return Object.freeze({
      classification: 'exact_identity',
      reason: 'canonical_id_match',
      identityMerged: false,
    });
  }

  const relatedTo = nonEmpty(options.relatedTo) ? options.relatedTo.trim() : null;
  if (relatedTo && relationTerms(event).includes(relatedTo)) {
    return Object.freeze({
      classification: 'explicit_relation',
      reason: 'declared_semantic_edge',
      identityMerged: false,
    });
  }

  return Object.freeze({
    classification: 'related_candidate',
    reason: options.lexical ? 'lexical_similarity' : 'structured_context_overlap',
    identityMerged: false,
  });
}

module.exports = {
  classifySearchResult,
  relationTerms,
};
