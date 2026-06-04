'use strict';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeIdentityMapping(input) {
  if (!input) {
    return {};
  }

  const mapping = isPlainObject(input.bySourceId)
    ? input.bySourceId
    : input;

  const normalized = {};
  if (!isPlainObject(mapping)) {
    return normalized;
  }

  for (const [sourceId, canonicalId] of Object.entries(mapping)) {
    if (!isNonEmptyString(sourceId) || !isNonEmptyString(canonicalId)) {
      continue;
    }
    normalized[sourceId.trim()] = canonicalId.trim();
  }

  return normalized;
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of Array.isArray(values) ? values : []) {
    if (!isNonEmptyString(value)) {
      continue;
    }

    const normalized = value.trim();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function collectSourceIds(event) {
  const ids = [];

  if (event && typeof event === 'object') {
    if (event.rawRef && isNonEmptyString(event.rawRef.sourceId)) {
      ids.push(event.rawRef.sourceId);
    }

    const sources = event.provenance && Array.isArray(event.provenance.sources)
      ? event.provenance.sources
      : [];
    for (const source of sources) {
      if (source && isNonEmptyString(source.sourceId)) {
        ids.push(source.sourceId);
      }
    }
  }

  return uniqueStrings(ids);
}

function collectIdentityAliases(event) {
  const aliases = [];

  if (event && typeof event === 'object') {
    if (isNonEmptyString(event.id)) {
      aliases.push(event.id);
    }

    aliases.push(...collectSourceIds(event));
  }

  return uniqueStrings(aliases);
}

function mergeProvenanceSources(existingSources, incomingSources) {
  const merged = [];
  const seen = new Set();

  for (const source of [...(Array.isArray(existingSources) ? existingSources : []), ...(Array.isArray(incomingSources) ? incomingSources : [])]) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    const key = JSON.stringify(source);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(cloneJson(source));
  }

  return merged;
}

function inheritMissingFields(target, incoming) {
  const scalarFields = ['schemaVersion', 'type', 'createdAt', 'phase'];
  const objectFields = ['body', 'contexts', 'trigger', 'dsl', 'meta'];
  const arrayFields = ['labels', 'relationships', 'lineage'];

  for (const field of scalarFields) {
    if ((target[field] === undefined || target[field] === null || target[field] === '') && incoming[field] !== undefined) {
      target[field] = cloneJson(incoming[field]);
    }
  }

  for (const field of objectFields) {
    if (target[field] === undefined && incoming[field] !== undefined) {
      target[field] = cloneJson(incoming[field]);
    }
  }

  for (const field of arrayFields) {
    if (!Array.isArray(target[field]) && Array.isArray(incoming[field])) {
      target[field] = cloneJson(incoming[field]);
    }
  }

  if (!target.provenance || typeof target.provenance !== 'object' || Array.isArray(target.provenance)) {
    target.provenance = { sources: [] };
  }
  if (!Array.isArray(target.provenance.sources)) {
    target.provenance.sources = [];
  }
  target.provenance.sources = mergeProvenanceSources(
    target.provenance.sources,
    incoming.provenance && Array.isArray(incoming.provenance.sources) ? incoming.provenance.sources : []
  );

  if (!target.rawRef && incoming.rawRef) {
    target.rawRef = cloneJson(incoming.rawRef);
  }
}

function registerIdentityAliases(identityIndex, canonicalId, aliases) {
  if (!isNonEmptyString(canonicalId)) {
    return;
  }

  if (!identityIndex.byCanonicalId[canonicalId]) {
    identityIndex.byCanonicalId[canonicalId] = [];
  }

  for (const alias of uniqueStrings(aliases)) {
    if (!identityIndex.bySourceId[alias]) {
      identityIndex.bySourceId[alias] = canonicalId;
    }

    if (!identityIndex.byCanonicalId[canonicalId].includes(alias)) {
      identityIndex.byCanonicalId[canonicalId].push(alias);
    }
  }
}

function resolveIdentityMapping(identityIndex, sourceId) {
  if (!isNonEmptyString(sourceId)) {
    return null;
  }

  if (identityIndex && identityIndex.bySourceId && isNonEmptyString(identityIndex.bySourceId[sourceId])) {
    return identityIndex.bySourceId[sourceId];
  }

  return null;
}

function mergeCanonicalEventsByIdentity(canonicalEvents, options = {}) {
  const list = Array.isArray(canonicalEvents) ? canonicalEvents : [];
  const identityMapping = normalizeIdentityMapping(options.identityMapping);
  const mergedById = new Map();
  const orderedIds = [];
  const identityIndex = {
    bySourceId: {},
    byCanonicalId: {},
  };

  for (const event of list) {
    if (!event || typeof event !== 'object') {
      continue;
    }

    const copy = cloneJson(event);
    if (!copy || typeof copy !== 'object') {
      continue;
    }

    const aliases = collectIdentityAliases(copy);
    const mappedTargetId = aliases
      .map(alias => identityMapping[alias])
      .find(isNonEmptyString);
    const targetId = isNonEmptyString(mappedTargetId)
      ? mappedTargetId
      : (isNonEmptyString(copy.id) ? copy.id.trim() : '');

    if (!isNonEmptyString(targetId)) {
      continue;
    }

    copy.id = targetId;

    const existing = mergedById.get(targetId);
    if (!existing) {
      mergedById.set(targetId, copy);
      orderedIds.push(targetId);
    } else {
      inheritMissingFields(existing, copy);
    }

    registerIdentityAliases(identityIndex, targetId, aliases);
  }

  const canonicalEventsResult = orderedIds
    .map(id => mergedById.get(id))
    .filter(Boolean);

  return {
    canonicalEvents: canonicalEventsResult,
    identityIndex,
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

function buildDerivedIndexFromCanonicalEvents(canonicalEvents, options = {}) {
  const list = Array.isArray(canonicalEvents) ? canonicalEvents : [];
  const identityIndex = isPlainObject(options.identityIndex)
    ? {
        bySourceId: isPlainObject(options.identityIndex.bySourceId) ? { ...options.identityIndex.bySourceId } : {},
        byCanonicalId: isPlainObject(options.identityIndex.byCanonicalId) ? { ...options.identityIndex.byCanonicalId } : {},
      }
    : { bySourceId: {}, byCanonicalId: {} };

  const byId = {};
  const byType = {};
  const byDay = {};
  const provenanceIndex = {};
  const sourceIdIndex = {};
  const lineageEdges = [];
  const pendingLineageEdges = [];
  const lineageChildrenByTarget = {};
  const lineageParentsBySource = {};
  const relationshipIndex = {
    byTerm: {},
    byEventId: {},
  };
  const searchableTextById = {};

  for (const event of list) {
    if (!event || typeof event !== 'object') {
      continue;
    }

    const eventId = isNonEmptyString(event.id) ? event.id.trim() : null;
    if (!eventId) {
      continue;
    }

    byId[eventId] = event;

    const type = isNonEmptyString(event.type) ? event.type.trim() : 'unknown';
    if (!Array.isArray(byType[type])) {
      byType[type] = [];
    }
    byType[type].push(eventId);

    const day = isNonEmptyString(event.createdAt) && event.createdAt.length >= 10
      ? event.createdAt.slice(0, 10)
      : 'unknown';
    if (!Array.isArray(byDay[day])) {
      byDay[day] = [];
    }
    byDay[day].push(eventId);

    const searchableParts = [
      event.id,
      event.type,
      event.createdAt,
      event.body && typeof event.body.text === 'string' ? event.body.text : '',
      event.phase,
    ];
    const labels = Array.isArray(event.labels) ? event.labels : [];
    searchableParts.push(...labels);

    const contexts = event.contexts && typeof event.contexts === 'object' ? event.contexts : {};
    for (const [key, value] of Object.entries(contexts)) {
      searchableParts.push(key, value);
    }

    const relationships = Array.isArray(event.relationships) ? event.relationships : [];
    const relationshipTerms = [];
    for (const relation of relationships) {
      if (!relation || typeof relation !== 'object') {
        continue;
      }
      if (isNonEmptyString(relation.source)) {
        relationshipTerms.push(relation.source);
      }
      if (isNonEmptyString(relation.target)) {
        relationshipTerms.push(relation.target);
      }
    }
    searchableParts.push(...relationshipTerms);

    if (event.trigger && typeof event.trigger === 'object') {
      if (isNonEmptyString(event.trigger.category)) {
        searchableParts.push(event.trigger.category);
      }
      if (isNonEmptyString(event.trigger.value)) {
        searchableParts.push(event.trigger.value);
      }
    }

    const lineage = Array.isArray(event.lineage) ? event.lineage : [];
    for (const edge of lineage) {
      if (edge && isNonEmptyString(edge.target)) {
        searchableParts.push(edge.target);
      }
    }

    const dslModels = event.dsl && Array.isArray(event.dsl.models) ? event.dsl.models : [];
    for (const model of dslModels) {
      if (!model || typeof model !== 'object') {
        continue;
      }
      if (isNonEmptyString(model.id)) {
        searchableParts.push(model.id);
      }
      if (isNonEmptyString(model.name)) {
        searchableParts.push(model.name);
      }
      const variables = Array.isArray(model.variables) ? model.variables : [];
      for (const variable of variables) {
        if (!variable || typeof variable !== 'object') {
          continue;
        }
        if (isNonEmptyString(variable.name)) {
          searchableParts.push(variable.name);
        }
        if (isNonEmptyString(variable.role)) {
          searchableParts.push(variable.role);
        }
      }
      const relations = Array.isArray(model.relations) ? model.relations : [];
      for (const relation of relations) {
        if (!relation || typeof relation !== 'object') {
          continue;
        }
        if (isNonEmptyString(relation.source)) {
          searchableParts.push(relation.source);
        }
        if (isNonEmptyString(relation.target)) {
          searchableParts.push(relation.target);
        }
      }
      const meta = model.meta && typeof model.meta === 'object' ? model.meta : {};
      for (const [key, value] of Object.entries(meta)) {
        searchableParts.push(key, value);
      }
    }

    searchableTextById[eventId] = searchableParts
      .filter(isNonEmptyString)
      .map(value => value.trim().toLowerCase())
      .join(' ');

    const sourceIds = collectSourceIds(event);
    const aliases = collectIdentityAliases(event);
    const resolvedCanonicalId = resolveIdentityMapping(identityIndex, eventId) || eventId;

    registerIdentityAliases(identityIndex, resolvedCanonicalId, aliases);

    for (const sourceId of sourceIds) {
      const canonicalId = resolveIdentityMapping(identityIndex, sourceId) || resolvedCanonicalId;
      if (!sourceIdIndex[sourceId]) {
        sourceIdIndex[sourceId] = canonicalId;
      }
      if (!Array.isArray(provenanceIndex[sourceId])) {
        provenanceIndex[sourceId] = [];
      }
      provenanceIndex[sourceId].push(resolvedCanonicalId);
    }

    for (const edge of lineage) {
      if (!edge || !isNonEmptyString(edge.target)) {
        continue;
      }
      pendingLineageEdges.push({
        source: resolvedCanonicalId,
        target: edge.target.trim(),
        type: isNonEmptyString(edge.type) ? edge.type.trim() : 'relation',
      });
    }

    const relationshipBuckets = [];
    for (const relation of relationships) {
      if (!relation || typeof relation !== 'object') {
        continue;
      }
      const source = isNonEmptyString(relation.source) ? relation.source.trim() : '';
      const target = isNonEmptyString(relation.target) ? relation.target.trim() : '';
      if (source === '' && target === '') {
        continue;
      }

      relationshipBuckets.push({ source, target });
      for (const term of [source, target]) {
        if (term === '') {
          continue;
        }
        if (!Array.isArray(relationshipIndex.byTerm[term])) {
          relationshipIndex.byTerm[term] = [];
        }
        relationshipIndex.byTerm[term].push(resolvedCanonicalId);
      }
    }
    if (relationshipBuckets.length > 0) {
      relationshipIndex.byEventId[resolvedCanonicalId] = relationshipBuckets;
    }
  }

  for (const edge of pendingLineageEdges) {
    const resolvedTargetId = resolveIdentityMapping(identityIndex, edge.target)
      || sourceIdIndex[edge.target]
      || edge.target;
    lineageEdges.push({
      source: edge.source,
      target: resolvedTargetId,
      type: edge.type,
    });
    if (!Array.isArray(lineageChildrenByTarget[resolvedTargetId])) {
      lineageChildrenByTarget[resolvedTargetId] = [];
    }
    lineageChildrenByTarget[resolvedTargetId].push(edge.source);
    if (!Array.isArray(lineageParentsBySource[edge.source])) {
      lineageParentsBySource[edge.source] = [];
    }
    lineageParentsBySource[edge.source].push(resolvedTargetId);
  }

  const orderedIds = list
    .filter(event => event && typeof event === 'object' && isNonEmptyString(event.id))
    .map(event => event.id.trim())
    .sort((leftId, rightId) => {
      const left = byId[leftId];
      const right = byId[rightId];
      const leftCreatedAt = Date.parse(left && typeof left.createdAt === 'string' ? left.createdAt : '');
      const rightCreatedAt = Date.parse(right && typeof right.createdAt === 'string' ? right.createdAt : '');

      const normalizedLeft = Number.isFinite(leftCreatedAt) ? leftCreatedAt : 0;
      const normalizedRight = Number.isFinite(rightCreatedAt) ? rightCreatedAt : 0;

      if (normalizedLeft !== normalizedRight) {
        return normalizedLeft - normalizedRight;
      }

      return leftId.localeCompare(rightId);
    });

  return {
    total: list.length,
    byId,
    orderedIds,
    byType,
    byDay,
    provenanceIndex,
    sourceIdIndex,
    canonicalIdentityIndex: identityIndex,
    lineageEdges,
    lineageChildrenByTarget,
    lineageParentsBySource,
    relationshipIndex,
    searchableTextById,
  };
}

function composeMultiTransportIndexSnapshot(canonicalEvents, options = {}) {
  const merged = mergeCanonicalEventsByIdentity(canonicalEvents, options);
  const indexSnapshot = buildDerivedIndexFromCanonicalEvents(merged.canonicalEvents, {
    identityIndex: merged.identityIndex,
  });

  return {
    canonicalEvents: merged.canonicalEvents,
    identityIndex: merged.identityIndex,
    indexSnapshot,
  };
}

module.exports = {
  buildDerivedIndexFromCanonicalEvents,
  collectIdentityAliases,
  collectSourceIds,
  composeMultiTransportIndexSnapshot,
  mergeCanonicalEventsByIdentity,
  normalizeIdentityMapping,
};
