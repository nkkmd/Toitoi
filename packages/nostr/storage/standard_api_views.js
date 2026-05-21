'use strict';

const {
  buildLineageTree,
  findEventsByRelationTerm,
  getEventReferences,
  listEvents,
  lookupEvent,
  searchEvents,
} = require('./indexer');

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function summarizeProvenance(event) {
  if (!event || typeof event !== 'object') {
    return null;
  }

  const sources = event.provenance && Array.isArray(event.provenance.sources)
    ? event.provenance.sources
    : [];
  const sourceProtocols = [];
  const sourceIds = [];

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }
    if (typeof source.protocol === 'string' && !sourceProtocols.includes(source.protocol)) {
      sourceProtocols.push(source.protocol);
    }
    if (typeof source.sourceId === 'string' && source.sourceId !== '') {
      sourceIds.push(source.sourceId);
    }
  }

  return {
    sourceCount: sources.length,
    sourceProtocols,
    sourceIds,
    rawRef: event.rawRef ? cloneJson(event.rawRef) : null,
  };
}

function projectCanonicalEvent(event) {
  if (!event || typeof event !== 'object') {
    return null;
  }

  return {
    id: event.id,
    schemaVersion: event.schemaVersion,
    type: event.type,
    createdAt: event.createdAt,
    body: cloneJson(event.body),
    labels: Array.isArray(event.labels) ? event.labels.slice() : undefined,
    contexts: event.contexts ? cloneJson(event.contexts) : undefined,
    relationships: Array.isArray(event.relationships) ? cloneJson(event.relationships) : undefined,
    phase: event.phase,
    trigger: event.trigger ? cloneJson(event.trigger) : undefined,
    lineage: Array.isArray(event.lineage) ? cloneJson(event.lineage) : undefined,
    dsl: event.dsl ? cloneJson(event.dsl) : undefined,
    meta: event.meta ? cloneJson(event.meta) : undefined,
    provenance: summarizeProvenance(event),
    rawRef: event.rawRef ? cloneJson(event.rawRef) : undefined,
  };
}

function projectEventDetailView(indexSnapshot, eventId) {
  const reference = getEventReferences(indexSnapshot, eventId);
  if (!reference) {
    return null;
  }

  return {
    event: projectCanonicalEvent(reference.event),
    references: {
      parents: reference.lineage.parents.map(projectCanonicalEvent),
      children: reference.lineage.children.map(projectCanonicalEvent),
      relationships: Array.isArray(reference.relationships)
        ? cloneJson(reference.relationships)
        : [],
    },
  };
}

function projectEventListView(indexSnapshot, options = {}) {
  const list = listEvents(indexSnapshot, options);
  return {
    total: list.total,
    limit: list.limit,
    offset: list.offset,
    results: list.results.map(event => ({
      event: projectCanonicalEvent(event),
      provenance: summarizeProvenance(event),
    })),
  };
}

function projectRelationView(indexSnapshot, term, options = {}) {
  const result = findEventsByRelationTerm(indexSnapshot, term, options);
  return {
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    results: result.results.map(event => ({
      event: projectCanonicalEvent(event),
      provenance: summarizeProvenance(event),
    })),
  };
}

function projectSearchView(indexSnapshot, query, options = {}) {
  const result = searchEvents(indexSnapshot, query, options);
  return {
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    results: result.results.map(event => ({
      event: projectCanonicalEvent(event),
      provenance: summarizeProvenance(event),
    })),
  };
}

function projectLineageView(indexSnapshot, rootId) {
  const tree = buildLineageTree(indexSnapshot, rootId);
  if (!tree) {
    return null;
  }

  return tree;
}

function projectEventLookupView(indexSnapshot, eventId) {
  const event = lookupEvent(indexSnapshot, eventId);
  return event ? projectCanonicalEvent(event) : null;
}

module.exports = {
  projectCanonicalEvent,
  projectEventDetailView,
  projectEventListView,
  projectEventLookupView,
  projectLineageView,
  projectRelationView,
  projectSearchView,
  summarizeProvenance,
};
