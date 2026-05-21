'use strict';

const fs = require('fs');
const path = require('path');
const { ingestNostrEvents } = require('../adapter/ingest_pipeline');
const {
  loadPersistedCanonicalRecords,
  loadPersistedRawRecords,
  resolveStoragePaths,
  writeIndexSnapshot,
} = require('./persistence');

function buildDerivedIndex(canonicalEvents) {
  const byId = {};
  const byType = {};
  const byDay = {};
  const provenanceIndex = {};
  const lineageEdges = [];

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

    const sources = event.provenance && Array.isArray(event.provenance.sources)
      ? event.provenance.sources
      : [];
    for (const source of sources) {
      if (source && typeof source.sourceId === 'string' && source.sourceId !== '') {
        if (!Array.isArray(provenanceIndex[source.sourceId])) {
          provenanceIndex[source.sourceId] = [];
        }
        provenanceIndex[source.sourceId].push(eventId);
      }
    }

    const lineage = Array.isArray(event.lineage) ? event.lineage : [];
    for (const edge of lineage) {
      if (!edge || typeof edge.target !== 'string' || edge.target === '') {
        continue;
      }
      lineageEdges.push({
        source: eventId,
        target: edge.target,
        type: typeof edge.type === 'string' ? edge.type : 'relation',
      });
    }
  }

  return {
    total: canonicalEvents.length,
    byId,
    byType,
    byDay,
    provenanceIndex,
    lineageEdges,
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
    ingestResult = ingestNostrEvents(rawEvents, {
      skipVerify: options.skipVerify !== undefined ? Boolean(options.skipVerify) : true,
      verifyFn: options.verifyFn,
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
};
