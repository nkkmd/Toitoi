'use strict';

const crypto = require('crypto');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeCanonicalEventId(value) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const normalized = value.trim();
  if (normalized.startsWith('tt:evt:')) {
    return normalized;
  }

  if (normalized.startsWith('tt:')) {
    return null;
  }

  return `tt:evt:${normalized}`;
}

function createUuidV4() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function createCanonicalEventId() {
  return `tt:evt:${createUuidV4()}`;
}

function normalizeCanonicalIdMapping(input) {
  if (!input) {
    return null;
  }

  if (input instanceof Map) {
    return input;
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    if (input.bySourceId && typeof input.bySourceId === 'object' && !Array.isArray(input.bySourceId)) {
      return new Map(Object.entries(input.bySourceId));
    }
    return new Map(Object.entries(input));
  }

  return null;
}

function resolveCanonicalEventId(sourceId, options = {}) {
  const explicitId = normalizeCanonicalEventId(options.id);
  if (explicitId) {
    return explicitId;
  }

  const mapping = normalizeCanonicalIdMapping(options.canonicalIdMap);
  const normalizedSourceId = isNonEmptyString(sourceId) ? sourceId.trim() : '';
  if (mapping && normalizedSourceId && mapping.has(normalizedSourceId)) {
    const mapped = normalizeCanonicalEventId(mapping.get(normalizedSourceId));
    if (mapped) {
      return mapped;
    }
  }

  return createCanonicalEventId();
}

module.exports = {
  createCanonicalEventId,
  normalizeCanonicalEventId,
  resolveCanonicalEventId,
};
