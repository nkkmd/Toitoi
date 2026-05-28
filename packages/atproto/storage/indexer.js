'use strict';

const { buildDerivedIndex } = require('./replay');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function cloneEvent(event) {
  if (!event || typeof event !== 'object') {
    return null;
  }

  return JSON.parse(JSON.stringify(event));
}

function resolveIndexableIds(indexSnapshot) {
  if (!indexSnapshot || typeof indexSnapshot !== 'object') {
    return [];
  }

  if (Array.isArray(indexSnapshot.orderedIds)) {
    return indexSnapshot.orderedIds.slice();
  }

  const byId = indexSnapshot.byId && typeof indexSnapshot.byId === 'object'
    ? indexSnapshot.byId
    : {};
  return Object.keys(byId);
}

function lookupEvent(indexSnapshot, eventId) {
  if (!isNonEmptyString(eventId) || !indexSnapshot || typeof indexSnapshot !== 'object') {
    return null;
  }

  const byId = indexSnapshot.byId && typeof indexSnapshot.byId === 'object'
    ? indexSnapshot.byId
    : {};
  if (byId[eventId]) {
    return byId[eventId];
  }

  const sourceIdIndex = indexSnapshot.sourceIdIndex && typeof indexSnapshot.sourceIdIndex === 'object'
    ? indexSnapshot.sourceIdIndex
    : {};
  const canonicalId = sourceIdIndex[eventId];
  if (isNonEmptyString(canonicalId) && byId[canonicalId]) {
    return byId[canonicalId];
  }

  return null;
}

function applyWindow(items, options = {}) {
  const offset = Number.isInteger(options.offset) && options.offset > 0 ? options.offset : 0;
  const limit = Number.isInteger(options.limit) && options.limit >= 0 ? options.limit : 20;

  return {
    offset,
    limit,
    items: limit === 0 ? [] : items.slice(offset, offset + limit),
  };
}

function listEvents(indexSnapshot, options = {}) {
  const ids = resolveIndexableIds(indexSnapshot);
  const order = options.order === 'asc' ? 'asc' : 'desc';
  const byId = indexSnapshot && typeof indexSnapshot === 'object' && indexSnapshot.byId && typeof indexSnapshot.byId === 'object'
    ? indexSnapshot.byId
    : {};

  const filtered = [];
  const since = Number.isInteger(options.since) ? options.since : null;
  const until = Number.isInteger(options.until) ? options.until : null;
  const type = isNonEmptyString(options.type) ? options.type.trim() : null;

  const orderedIds = order === 'asc' ? ids : ids.slice().reverse();
  for (const id of orderedIds) {
    const event = byId[id];
    if (!event) {
      continue;
    }

    if (type && event.type !== type) {
      continue;
    }

    const timestamp = Date.parse(event.createdAt);
    if (since !== null && Number.isFinite(timestamp) && timestamp < since * 1000) {
      continue;
    }
    if (until !== null && Number.isFinite(timestamp) && timestamp > until * 1000) {
      continue;
    }

    filtered.push(event);
  }

  const windowed = applyWindow(filtered, options);
  return {
    total: filtered.length,
    limit: windowed.limit,
    offset: windowed.offset,
    results: windowed.items,
  };
}

function eventSearchableText(event) {
  if (!event || typeof event !== 'object') {
    return '';
  }

  const parts = [
    event.id,
    event.type,
    event.createdAt,
    event.phase,
    event.body && typeof event.body.text === 'string' ? event.body.text : '',
  ];

  const labels = Array.isArray(event.labels) ? event.labels : [];
  parts.push(...labels);

  const contexts = event.contexts && typeof event.contexts === 'object' ? event.contexts : {};
  for (const [key, value] of Object.entries(contexts)) {
    parts.push(key, value);
  }

  const relationships = Array.isArray(event.relationships) ? event.relationships : [];
  for (const relation of relationships) {
    if (!relation || typeof relation !== 'object') {
      continue;
    }
    parts.push(relation.source, relation.target);
  }

  if (event.trigger && typeof event.trigger === 'object') {
    parts.push(event.trigger.category, event.trigger.value);
  }

  const lineage = Array.isArray(event.lineage) ? event.lineage : [];
  for (const edge of lineage) {
    if (edge && typeof edge.target === 'string') {
      parts.push(edge.target);
    }
  }

  const dslModels = event.dsl && Array.isArray(event.dsl.models) ? event.dsl.models : [];
  for (const model of dslModels) {
    if (!model || typeof model !== 'object') {
      continue;
    }

    parts.push(model.id, model.name);

    const variables = Array.isArray(model.variables) ? model.variables : [];
    for (const variable of variables) {
      if (!variable || typeof variable !== 'object') {
        continue;
      }
      parts.push(variable.name, variable.role);
    }

    const relations = Array.isArray(model.relations) ? model.relations : [];
    for (const relation of relations) {
      if (!relation || typeof relation !== 'object') {
        continue;
      }
      parts.push(relation.source, relation.target);
    }

    const meta = model.meta && typeof model.meta === 'object' ? model.meta : {};
    for (const [key, value] of Object.entries(meta)) {
      parts.push(key, value);
    }
  }

  return parts
    .filter(isNonEmptyString)
    .map(value => value.trim().toLowerCase())
    .join(' ');
}

function searchEvents(indexSnapshot, query, options = {}) {
  const text = isNonEmptyString(query) ? query.trim().toLowerCase() : '';
  if (text === '') {
    return {
      total: 0,
      limit: 0,
      offset: 0,
      results: [],
    };
  }

  const tokens = text.split(/\s+/).filter(Boolean);
  const ids = resolveIndexableIds(indexSnapshot);
  const byId = indexSnapshot && typeof indexSnapshot === 'object' && indexSnapshot.byId && typeof indexSnapshot.byId === 'object'
    ? indexSnapshot.byId
    : {};
  const searchableTextById = indexSnapshot && typeof indexSnapshot === 'object' && indexSnapshot.searchableTextById && typeof indexSnapshot.searchableTextById === 'object'
    ? indexSnapshot.searchableTextById
    : {};

  const matches = [];
  for (const id of ids) {
    const event = byId[id];
    if (!event) {
      continue;
    }

    const haystack = isNonEmptyString(searchableTextById[id])
      ? searchableTextById[id]
      : eventSearchableText(event);

    if (tokens.every(token => haystack.includes(token))) {
      matches.push(event);
    }
  }

  const windowed = applyWindow(matches, options);
  return {
    total: matches.length,
    limit: windowed.limit,
    offset: windowed.offset,
    results: windowed.items,
  };
}

function findEventsByRelationTerm(indexSnapshot, term, options = {}) {
  const normalizedTerm = isNonEmptyString(term) ? term.trim() : '';
  if (normalizedTerm === '') {
    return {
      total: 0,
      limit: 0,
      offset: 0,
      results: [],
    };
  }

  const relationshipIndex = indexSnapshot && typeof indexSnapshot === 'object' && indexSnapshot.relationshipIndex && typeof indexSnapshot.relationshipIndex === 'object'
    ? indexSnapshot.relationshipIndex
    : { byTerm: {} };
  const byTerm = relationshipIndex.byTerm && typeof relationshipIndex.byTerm === 'object'
    ? relationshipIndex.byTerm
    : {};
  const ids = Array.isArray(byTerm[normalizedTerm]) ? byTerm[normalizedTerm] : [];
  const byId = indexSnapshot && typeof indexSnapshot === 'object' && indexSnapshot.byId && typeof indexSnapshot.byId === 'object'
    ? indexSnapshot.byId
    : {};

  const results = [];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const event = byId[id];
    if (event) {
      results.push(event);
    }
  }

  const windowed = applyWindow(results, options);
  return {
    total: results.length,
    limit: windowed.limit,
    offset: windowed.offset,
    results: windowed.items,
  };
}

function getEventReferences(indexSnapshot, eventId) {
  const event = lookupEvent(indexSnapshot, eventId);
  if (!event) {
    return null;
  }

  const lineageParentsBySource = indexSnapshot && typeof indexSnapshot === 'object' && indexSnapshot.lineageParentsBySource && typeof indexSnapshot.lineageParentsBySource === 'object'
    ? indexSnapshot.lineageParentsBySource
    : {};
  const lineageChildrenByTarget = indexSnapshot && typeof indexSnapshot === 'object' && indexSnapshot.lineageChildrenByTarget && typeof indexSnapshot.lineageChildrenByTarget === 'object'
    ? indexSnapshot.lineageChildrenByTarget
    : {};

  return {
    event,
    relationships: Array.isArray(event.relationships) ? event.relationships : [],
    lineage: {
      parents: (lineageParentsBySource[event.id] ?? []).map(parentId => lookupEvent(indexSnapshot, parentId)).filter(Boolean),
      children: (lineageChildrenByTarget[event.id] ?? []).map(childId => lookupEvent(indexSnapshot, childId)).filter(Boolean),
    },
  };
}

function buildLineageTree(indexSnapshot, rootId, options = {}) {
  const rootEvent = lookupEvent(indexSnapshot, rootId);
  if (!rootEvent) {
    return null;
  }

  const lineageChildrenByTarget = indexSnapshot && typeof indexSnapshot === 'object' && indexSnapshot.lineageChildrenByTarget && typeof indexSnapshot.lineageChildrenByTarget === 'object'
    ? indexSnapshot.lineageChildrenByTarget
    : {};
  const visited = options.visited instanceof Set ? options.visited : new Set();

  if (visited.has(rootId)) {
    return null;
  }
  visited.add(rootId);

  const node = cloneEvent(rootEvent);
  node.parent_id = options.parentId ?? null;
  node.children = [];

  const childIds = Array.isArray(lineageChildrenByTarget[node.id]) ? lineageChildrenByTarget[node.id] : [];
  for (const childId of childIds) {
    const childNode = buildLineageTree(indexSnapshot, childId, {
      parentId: node.id,
      visited,
    });
    if (childNode) {
      node.children.push(childNode);
    }
  }

  return node;
}

function buildIndexer(canonicalEvents, options = {}) {
  const indexSnapshot = buildDerivedIndex(canonicalEvents);
  return {
    ...indexSnapshot,
    options: {
      ...options,
    },
  };
}

module.exports = {
  buildIndexer,
  buildLineageTree,
  findEventsByRelationTerm,
  getEventReferences,
  listEvents,
  lookupEvent,
  searchEvents,
};
