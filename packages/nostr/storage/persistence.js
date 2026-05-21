'use strict';

const fs = require('fs');
const path = require('path');
const {
  appendJsonlRecord,
  cloneJson,
  createStorageId,
  ensureDirectoryForFile,
  readJsonlRecords,
} = require('./append_only_log');

function resolveStoragePaths(storageDir) {
  if (typeof storageDir !== 'string' || storageDir.trim() === '') {
    throw new TypeError('storageDir must be a non-empty string');
  }

  const resolvedDir = path.resolve(storageDir);
  return {
    storageDir: resolvedDir,
    rawLogPath: path.join(resolvedDir, 'raw-events.jsonl'),
    canonicalLogPath: path.join(resolvedDir, 'canonical-events.jsonl'),
    ingestLogPath: path.join(resolvedDir, 'ingest-log.jsonl'),
    indexSnapshotPath: path.join(resolvedDir, 'index-snapshot.json'),
  };
}

function sanitizeVerification(verification) {
  if (!verification || typeof verification !== 'object') {
    return null;
  }

  return {
    ok: Boolean(verification.ok),
    verified: Boolean(verification.verified),
    skipped: Boolean(verification.skipped),
    reason: typeof verification.reason === 'string' ? verification.reason : '',
  };
}

function enrichCanonicalEvent(canonicalEvent, rawStorageRecord) {
  const copy = cloneJson(canonicalEvent);
  if (!copy || typeof copy !== 'object') {
    return copy;
  }

  const rawRef = copy.rawRef && typeof copy.rawRef === 'object' && !Array.isArray(copy.rawRef)
    ? copy.rawRef
    : {};

  if (rawStorageRecord?.source?.protocol && !rawRef.protocol) {
    rawRef.protocol = rawStorageRecord.source.protocol;
  }
  if (rawStorageRecord?.source?.sourceId && !rawRef.sourceId) {
    rawRef.sourceId = rawStorageRecord.source.sourceId;
  }
  if (typeof rawStorageRecord?.source?.relay === 'string' && rawStorageRecord.source.relay !== '') {
    rawRef.relay = rawStorageRecord.source.relay;
  }
  rawRef.storage = 'append-log';
  rawRef.storageId = rawStorageRecord.storageId;

  copy.rawRef = rawRef;
  return copy;
}

function persistIngestResult(storageDir, ingestResult, options = {}) {
  if (typeof storageDir !== 'string' || storageDir.trim() === '') {
    throw new TypeError('storageDir must be a non-empty string');
  }
  if (!ingestResult || typeof ingestResult !== 'object') {
    throw new TypeError('ingestResult must be an object');
  }

  const paths = resolveStoragePaths(storageDir);
  const source = typeof options.source === 'string' && options.source.trim() !== ''
    ? options.source.trim()
    : 'unknown';
  const sourceLabel = typeof options.sourceLabel === 'string' ? options.sourceLabel : '';
  const batchId = typeof options.batchId === 'string' && options.batchId.trim() !== ''
    ? options.batchId.trim()
    : createStorageId('batch');
  const processedEvents = Array.isArray(ingestResult.processedEvents)
    ? ingestResult.processedEvents
    : [];

  const rawRecordIds = [];
  const canonicalRecordIds = [];

  processedEvents.forEach((item, index) => {
    const rawStorageId = createStorageId('raw');
    const rawRecord = {
      recordType: 'raw-event',
      storage: 'append-log',
      storageId: rawStorageId,
      batchId,
      source,
      sourceLabel,
      position: index,
      status: item.status,
      dedupeKey: item.dedupeKey ?? null,
      warnings: Array.isArray(item.warnings) ? item.warnings : [],
      errors: Array.isArray(item.errors) ? item.errors : [],
      verification: sanitizeVerification(item.verification),
      rawEvent: cloneJson(item.rawEvent),
    };
    appendJsonlRecord(paths.rawLogPath, rawRecord);
    rawRecordIds.push(rawStorageId);

    if (!item.canonicalEvent) {
      return;
    }

    const canonicalStorageId = createStorageId('canonical');
    const canonicalRecord = {
      recordType: 'canonical-event',
      storage: 'append-log',
      storageId: canonicalStorageId,
      batchId,
      source,
      sourceLabel,
      position: index,
      rawStorageId,
      canonicalEvent: enrichCanonicalEvent(item.canonicalEvent, rawRecord),
    };
    appendJsonlRecord(paths.canonicalLogPath, canonicalRecord);
    canonicalRecordIds.push(canonicalStorageId);
  });

  const ingestRecord = {
    recordType: 'ingest-batch',
    storage: 'append-log',
    storageId: createStorageId('ingest'),
    batchId,
    source,
    sourceLabel,
    createdAt: new Date().toISOString(),
    counts: {
      received: Array.isArray(ingestResult.orderedEvents) ? ingestResult.orderedEvents.length : 0,
      accepted: Array.isArray(ingestResult.accepted) ? ingestResult.accepted.length : 0,
      invalid: Array.isArray(ingestResult.invalid) ? ingestResult.invalid.length : 0,
      duplicates: Array.isArray(ingestResult.duplicates) ? ingestResult.duplicates.length : 0,
      unverified: Array.isArray(ingestResult.unverified) ? ingestResult.unverified.length : 0,
    },
    rawLogPath: paths.rawLogPath,
    canonicalLogPath: paths.canonicalLogPath,
    rawRecordIds,
    canonicalRecordIds,
  };

  appendJsonlRecord(paths.ingestLogPath, ingestRecord);

  return {
    ...paths,
    batchId,
    ingestRecord,
    rawRecordIds,
    canonicalRecordIds,
  };
}

function loadPersistedRawRecords(storageDir) {
  return readJsonlRecords(resolveStoragePaths(storageDir).rawLogPath);
}

function loadPersistedCanonicalRecords(storageDir) {
  return readJsonlRecords(resolveStoragePaths(storageDir).canonicalLogPath);
}

function loadPersistedIngestRecords(storageDir) {
  return readJsonlRecords(resolveStoragePaths(storageDir).ingestLogPath);
}

function writeIndexSnapshot(storageDir, indexSnapshot) {
  const { indexSnapshotPath } = resolveStoragePaths(storageDir);
  ensureDirectoryForFile(indexSnapshotPath);
  fs.writeFileSync(indexSnapshotPath, `${JSON.stringify(indexSnapshot, null, 2)}\n`, 'utf8');
  return indexSnapshotPath;
}

function readIndexSnapshot(storageDir) {
  const { indexSnapshotPath } = resolveStoragePaths(storageDir);
  if (!fs.existsSync(indexSnapshotPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(path.resolve(indexSnapshotPath), 'utf8'));
}

module.exports = {
  enrichCanonicalEvent,
  loadPersistedCanonicalRecords,
  loadPersistedIngestRecords,
  loadPersistedRawRecords,
  persistIngestResult,
  readIndexSnapshot,
  resolveStoragePaths,
  sanitizeVerification,
  writeIndexSnapshot,
};
