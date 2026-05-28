'use strict';

const fs = require('fs');
const path = require('path');
const { ingestAtProtoEvents } = require('../adapter/ingest_pipeline');
const {
  loadPersistedCanonicalRecords,
  loadPersistedRawRecords,
  resolveStoragePaths,
  writeIndexSnapshot,
  readIndexSnapshot,
} = require('./persistence');

function buildDerivedIndex(canonicalEvents) {
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

  for (const event of canonicalEvents) {
    if (!event || typeof event !== 'object') {
      continue;
    }

    const eventId = typeof event.id === 'string' ? event.id : null;
    if (!eventId) {
      continue;
    }

    byId[eventId] = event;

    const type = typeof event.type === 'string' ? event.type : 'unknown';
    if (!Array.isArray(byType[type])) {
      byType[type] = [];
    }
    byType[type].push(eventId);

    const day = typeof event.createdAt === 'string' && event.createdAt.length >= 10
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
      if (typeof relation.source === 'string' && relation.source !== '') {
        relationshipTerms.push(relation.source);
      }
      if (typeof relation.target === 'string' && relation.target !== '') {
        relationshipTerms.push(relation.target);
      }
    }
    searchableParts.push(...relationshipTerms);

    if (event.trigger && typeof event.trigger === 'object') {
      if (typeof event.trigger.category === 'string') {
        searchableParts.push(event.trigger.category);
      }
      if (typeof event.trigger.value === 'string') {
        searchableParts.push(event.trigger.value);
      }
    }

    const lineage = Array.isArray(event.lineage) ? event.lineage : [];
    for (const edge of lineage) {
      if (edge && typeof edge.target === 'string' && edge.target !== '') {
        searchableParts.push(edge.target);
      }
    }

    const dslModels = event.dsl && Array.isArray(event.dsl.models) ? event.dsl.models : [];
    for (const model of dslModels) {
      if (!model || typeof model !== 'object') {
        continue;
      }
      if (typeof model.id === 'string') {
        searchableParts.push(model.id);
      }
      if (typeof model.name === 'string') {
        searchableParts.push(model.name);
      }
      const variables = Array.isArray(model.variables) ? model.variables : [];
      for (const variable of variables) {
        if (!variable || typeof variable !== 'object') {
          continue;
        }
        if (typeof variable.name === 'string') {
          searchableParts.push(variable.name);
        }
        if (typeof variable.role === 'string') {
          searchableParts.push(variable.role);
        }
      }
      const relations = Array.isArray(model.relations) ? model.relations : [];
      for (const relation of relations) {
        if (!relation || typeof relation !== 'object') {
          continue;
        }
        if (typeof relation.source === 'string') {
          searchableParts.push(relation.source);
        }
        if (typeof relation.target === 'string') {
          searchableParts.push(relation.target);
        }
      }
      const meta = model.meta && typeof model.meta === 'object' ? model.meta : {};
      for (const [key, value] of Object.entries(meta)) {
        searchableParts.push(key, value);
      }
    }

    searchableTextById[eventId] = searchableParts
      .filter(value => typeof value === 'string' && value.trim() !== '')
      .map(value => value.trim().toLowerCase())
      .join(' ');

    const sources = event.provenance && Array.isArray(event.provenance.sources)
      ? event.provenance.sources
      : [];
    for (const source of sources) {
      if (source && typeof source.sourceId === 'string' && source.sourceId !== '') {
        if (!sourceIdIndex[source.sourceId]) {
          sourceIdIndex[source.sourceId] = eventId;
        }
        if (!Array.isArray(provenanceIndex[source.sourceId])) {
          provenanceIndex[source.sourceId] = [];
        }
        provenanceIndex[source.sourceId].push(eventId);
      }
    }

    for (const edge of lineage) {
      if (!edge || typeof edge.target !== 'string' || edge.target === '') {
        continue;
      }
      pendingLineageEdges.push({
        source: eventId,
        target: edge.target,
        type: typeof edge.type === 'string' ? edge.type : 'derived_from',
      });
    }

    const relationshipBuckets = [];
    for (const relation of relationships) {
      if (!relation || typeof relation !== 'object') {
        continue;
      }
      const source = typeof relation.source === 'string' ? relation.source : '';
      const target = typeof relation.target === 'string' ? relation.target : '';
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
        relationshipIndex.byTerm[term].push(eventId);
      }
    }
    if (relationshipBuckets.length > 0) {
      relationshipIndex.byEventId[eventId] = relationshipBuckets;
    }
  }

  for (const edge of pendingLineageEdges) {
    const resolvedTargetId = sourceIdIndex[edge.target] ?? edge.target;
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

  const orderedIds = canonicalEvents
    .filter(event => event && typeof event === 'object' && typeof event.id === 'string' && event.id !== '')
    .map(event => event.id)
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
    total: canonicalEvents.length,
    byId,
    orderedIds,
    byType,
    byDay,
    provenanceIndex,
    sourceIdIndex,
    lineageEdges,
    lineageChildrenByTarget,
    lineageParentsBySource,
    relationshipIndex,
    searchableTextById,
  };
}

function replayStorage(storageDir, options = {}) {
  const paths = resolveStoragePaths(storageDir);
  const rawRecords = loadPersistedRawRecords(storageDir);
  const canonicalRecords = loadPersistedCanonicalRecords(storageDir);

  let ingestResult;
  if (rawRecords.length > 0) {
    const rawEvents = rawRecords
      .map(record => record && record.rawEvent)
      .filter(Boolean);
    ingestResult = ingestAtProtoEvents(rawEvents, {
      skipVerify: options.skipVerify !== undefined ? Boolean(options.skipVerify) : true,
    });
  } else {
    const canonicalEvents = canonicalRecords
      .map(record => record && record.canonicalEvent)
      .filter(Boolean);
    ingestResult = {
      accepted: canonicalEvents.map(canonicalEvent => ({
        rawEvent: null,
        normalizedEvent: null,
        canonicalEvent,
        warnings: [],
        verification: null,
      })),
      invalid: [],
      duplicates: [],
      unverified: [],
      processedEvents: canonicalEvents.map(canonicalEvent => ({
        status: 'accepted',
        rawEvent: null,
        normalizedEvent: null,
        canonicalEvent,
        warnings: [],
        verification: null,
        dedupeKey: null,
        ordering: null,
        errors: [],
      })),
      orderedEvents: [],
    };
  }

  const canonicalEvents = ingestResult.accepted
    .map(item => item.canonicalEvent)
    .filter(Boolean);
  const indexSnapshot = buildDerivedIndex(canonicalEvents);

  if (options.persistIndex !== false) {
    writeIndexSnapshot(storageDir, indexSnapshot);
  }

  return {
    ...paths,
    rawRecords,
    canonicalRecords,
    ingestResult,
    indexSnapshot,
  };
}

function loadPersistedIndexSnapshot(storageDir) {
  const { indexSnapshotPath } = resolveStoragePaths(storageDir);
  if (!fs.existsSync(indexSnapshotPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(path.resolve(indexSnapshotPath), 'utf8'));
}

module.exports = {
  buildDerivedIndex,
  loadPersistedIndexSnapshot,
  replayStorage,
  readIndexSnapshot,
};
