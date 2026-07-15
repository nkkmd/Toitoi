'use strict';

const { VIEW_STATES } = require('./inquiry_view_model');

const CONTEXT_KEYS = Object.freeze([
  'climate_zone',
  'soil_type',
  'farming_context',
  'crop_family',
]);

function normalizeRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCriteria(criteria) {
  const source = normalizeRecord(criteria);
  return CONTEXT_KEYS.map(key => ({ key, value: typeof source[key] === 'string' ? source[key].trim() : '' }))
    .filter(item => item.value !== '');
}

function toContextMap(event) {
  return normalizeRecord(event && event.contexts);
}

function toResultItem(entry, selectedCriteria) {
  const event = normalizeRecord(entry && entry.event ? entry.event : entry);
  const contexts = toContextMap(event);
  const matched = selectedCriteria.filter(item => contexts[item.key] === item.value);
  const differing = CONTEXT_KEYS.filter(key => contexts[key] && !matched.some(item => item.key === key))
    .map(key => ({ key, value: contexts[key] }));

  return {
    id: event.id || null,
    type: event.type || 'inquiry',
    text: event.body && event.body.text ? event.body.text : '',
    language: event.body && event.body.language ? event.body.language : null,
    createdAt: event.createdAt || null,
    contexts: CONTEXT_KEYS.filter(key => contexts[key]).map(key => ({ key, value: contexts[key] })),
    matchedCriteria: matched,
    differingContexts: differing,
    relationships: normalizeArray(event.relationships).map(relation => ({
      source: relation && typeof relation.source === 'string' ? relation.source : '',
      target: relation && typeof relation.target === 'string' ? relation.target : '',
    })).filter(relation => relation.source || relation.target),
    provenance: normalizeRecord(entry && entry.provenance ? entry.provenance : event.provenance),
    identity: event.identity || null,
  };
}

function createContextExplorationModel(response, options = {}) {
  const criteria = normalizeCriteria(options.criteria);

  if (options.error) {
    return {
      state: VIEW_STATES.ERROR,
      criteria,
      results: [],
      total: 0,
      comparisonKeys: [],
      error: options.error instanceof Error ? options.error.message : String(options.error),
    };
  }

  if (criteria.length === 0) {
    return {
      state: VIEW_STATES.ERROR,
      criteria: [],
      results: [],
      total: 0,
      comparisonKeys: [],
      error: 'At least one context criterion is required',
    };
  }

  const source = normalizeRecord(response);
  const results = normalizeArray(source.results).map(entry => toResultItem(entry, criteria));
  const comparisonKeys = CONTEXT_KEYS.filter(key => results.some(item => item.contexts.some(context => context.key === key)));

  if (results.length === 0) {
    return {
      state: VIEW_STATES.EMPTY,
      criteria,
      results: [],
      total: Number.isInteger(source.total) ? source.total : 0,
      comparisonKeys,
      error: null,
    };
  }

  return {
    state: VIEW_STATES.READY,
    criteria,
    results,
    total: Number.isInteger(source.total) ? source.total : results.length,
    comparisonKeys,
    error: null,
    semantics: {
      identityMerge: false,
      interpretation: 'related-by-context',
    },
  };
}

function createContextLoadingModel(criteria = {}) {
  return {
    state: VIEW_STATES.LOADING,
    criteria: normalizeCriteria(criteria),
    results: [],
    total: 0,
    comparisonKeys: [],
    error: null,
  };
}

module.exports = {
  CONTEXT_KEYS,
  createContextExplorationModel,
  createContextLoadingModel,
  normalizeCriteria,
};
