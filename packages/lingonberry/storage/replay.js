'use strict';

const fs = require('fs');
const path = require('path');
const { ingestLingonberryEvents } = require('../adapter/ingest_pipeline');
const { composeMultiTransportIndexSnapshot } = require('../../protocol');
const {
  loadPersistedCanonicalRecords,
  loadPersistedRawRecords,
  resolveStoragePaths,
  writeIndexSnapshot,
  readIndexSnapshot,
} = require('./persistence');

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function getKnowledgeObject(rawEvent) {
  if (isPlainObject(rawEvent?.object) && isPlainObject(rawEvent?.publisher)) {
    return rawEvent.object;
  }
  return rawEvent;
}

function sourceIdFromRawEvent(rawEvent) {
  const object = getKnowledgeObject(rawEvent);
  if (isNonEmptyString(object?.rawRef?.sourceId)) {
    return object.rawRef.sourceId.trim();
  }
  if (isNonEmptyString(object?.id)) {
    return object.id.trim();
  }
  return null;
}

function buildCanonicalIdMapFromRawRecords(rawRecords) {
  const canonicalIdMap = new Map();

  for (const record of rawRecords) {
    if (!record || typeof record !== 'object') {
      continue;
    }

    const canonicalEventId = isNonEmptyString(record.canonicalEventId)
      ? record.canonicalEventId.trim()
      : null;
    const rawEvent = isPlainObject(record.rawEvent) ? record.rawEvent : null;
    const sourceId = rawEvent ? sourceIdFromRawEvent(rawEvent) : null;

    if (canonicalEventId && sourceId && !canonicalIdMap.has(sourceId)) {
      canonicalIdMap.set(sourceId, canonicalEventId);
    }
  }

  return canonicalIdMap;
}

function ingestResultFromCanonicalRecords(canonicalRecords) {
  const canonicalEvents = canonicalRecords
    .map(record => record && record.canonicalEvent)
    .filter(Boolean);

  return {
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

function replayStorage(storageDir, options = {}) {
  const paths = resolveStoragePaths(storageDir);
  const rawRecords = loadPersistedRawRecords(storageDir);
  const canonicalRecords = loadPersistedCanonicalRecords(storageDir);
  const canonicalIdMap = buildCanonicalIdMapFromRawRecords(rawRecords);

  let ingestResult;
  if (rawRecords.length > 0 && canonicalIdMap.size > 0) {
    const rawEvents = rawRecords
      .map(record => record && record.rawEvent)
      .filter(Boolean);
    ingestResult = ingestLingonberryEvents(rawEvents, {
      skipVerify: options.skipVerify !== undefined ? Boolean(options.skipVerify) : true,
      canonicalIdMap,
    });
  } else {
    ingestResult = ingestResultFromCanonicalRecords(canonicalRecords);
  }

  const canonicalEvents = ingestResult.accepted
    .map(item => item.canonicalEvent)
    .filter(Boolean);
  const merged = composeMultiTransportIndexSnapshot(canonicalEvents, {
    identityMapping: options.identityMapping,
  });
  const indexSnapshot = merged.indexSnapshot;

  if (options.persistIndex !== false) {
    writeIndexSnapshot(storageDir, indexSnapshot);
  }

  return {
    ...paths,
    rawRecords,
    canonicalRecords,
    ingestResult,
    canonicalEvents: merged.canonicalEvents,
    identityIndex: merged.identityIndex,
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
  buildCanonicalIdMapFromRawRecords,
  loadPersistedIndexSnapshot,
  readIndexSnapshot,
  replayStorage,
  sourceIdFromRawEvent,
};
