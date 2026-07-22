'use strict';

const crypto = require('crypto');

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canonicalDigest(value) {
  const normalize = input => {
    if (Array.isArray(input)) return input.map(normalize);
    if (isObject(input)) {
      return Object.fromEntries(Object.keys(input).sort().map(key => [key, normalize(input[key])]));
    }
    return input;
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex');
}

function semanticBody(event) {
  if (isObject(event?.body)) return event.body;
  if (isObject(event?.content)) return event.content;
  return null;
}

function validateCanonicalEvent(event) {
  const errors = [];
  if (!isObject(event)) {
    return {
      valid: false,
      errors: [{ path: '$', code: 'type', message: 'Canonical Event must be an object.' }],
    };
  }

  for (const field of ['id', 'schemaVersion', 'type', 'createdAt', 'provenance']) {
    if (!(field in event)) {
      errors.push({ path: `$.${field}`, code: 'required', message: `${field} is required.` });
    }
  }
  if (!('body' in event) && !('content' in event)) {
    errors.push({ path: '$.body', code: 'required', message: 'body is required; content is accepted only as a legacy compatibility alias.' });
  }

  if ('id' in event && (typeof event.id !== 'string' || !/^tt:evt:\S+$/.test(event.id))) {
    errors.push({ path: '$.id', code: 'format', message: 'id must use the tt:evt:<opaque-id> form.' });
  }
  if ('schemaVersion' in event && (typeof event.schemaVersion !== 'string' || event.schemaVersion.trim() === '')) {
    errors.push({ path: '$.schemaVersion', code: 'type', message: 'schemaVersion must be a non-empty string.' });
  }
  if ('type' in event && (typeof event.type !== 'string' || event.type.trim() === '')) {
    errors.push({ path: '$.type', code: 'type', message: 'type must be a non-empty string.' });
  }
  if ('createdAt' in event && Number.isNaN(Date.parse(event.createdAt))) {
    errors.push({ path: '$.createdAt', code: 'format', message: 'createdAt must be an ISO-compatible timestamp.' });
  }

  const body = semanticBody(event);
  if (!isObject(body)) {
    errors.push({ path: '$.body', code: 'type', message: 'body must be an object.' });
  } else if ('body' in event) {
    if (typeof body.text !== 'string' || body.text.trim() === '') {
      errors.push({ path: '$.body.text', code: 'required', message: 'body.text must be a non-empty string.' });
    }
    if (typeof body.language !== 'string' || body.language.trim() === '') {
      errors.push({ path: '$.body.language', code: 'required', message: 'body.language must be a non-empty language tag.' });
    }
  }

  if ('provenance' in event && !isObject(event.provenance)) {
    errors.push({ path: '$.provenance', code: 'type', message: 'provenance must be an object.' });
  } else if (isObject(event.provenance)) {
    const sources = event.provenance.sources;
    if (!Array.isArray(sources) || sources.length === 0) {
      errors.push({ path: '$.provenance.sources', code: 'required', message: 'provenance.sources must contain at least one source.' });
    }
  }

  return { valid: errors.length === 0, errors };
}

function checkCanonicalIdPreserved(before, after) {
  return {
    passed: Boolean(before && after && before.id && before.id === after.id),
    expected: before && before.id ? before.id : null,
    actual: after && after.id ? after.id : null,
  };
}

function checkProvenanceRawBoundary(event) {
  const provenance = event && event.provenance;
  if (!isObject(provenance)) return { passed: false, reason: 'missing_provenance' };
  if ('raw' in provenance || 'raw' in (event || {})) return { passed: false, reason: 'embedded_raw_payload' };

  const topLevelRawRef = isObject(event?.rawRef)
    && typeof event.rawRef.protocol === 'string'
    && typeof event.rawRef.sourceId === 'string';
  const legacyRawRef = typeof provenance.rawRef === 'string';
  const sources = Array.isArray(provenance.sources) && provenance.sources.length > 0;

  return {
    passed: topLevelRawRef || legacyRawRef || sources,
    reason: topLevelRawRef || legacyRawRef || sources ? null : 'missing_raw_reference_or_sources',
  };
}

function semanticProjection(event) {
  return {
    id: event.id,
    schemaVersion: event.schemaVersion,
    type: event.type,
    body: semanticBody(event),
    contexts: event.contexts || {},
    relationships: event.relationships || [],
    lineage: event.lineage || [],
    phase: event.phase || null,
    provenance: event.provenance || {},
    rawRef: event.rawRef || null,
  };
}

function checkSemanticRoundTrip(original, restored) {
  const expected = semanticProjection(original);
  const actual = semanticProjection(restored);
  return { passed: canonicalDigest(expected) === canonicalDigest(actual), expected, actual };
}

function checkReplayEquivalence(liveEvents, replayedEvents) {
  const project = events => (Array.isArray(events) ? events : [])
    .map(semanticProjection)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const expected = project(liveEvents);
  const actual = project(replayedEvents);
  return {
    passed: canonicalDigest(expected) === canonicalDigest(actual),
    expectedDigest: canonicalDigest(expected),
    actualDigest: canonicalDigest(actual),
  };
}

function runConformanceSuite({ events = [], roundTrips = [], replay = null } = {}) {
  const checks = [];
  for (const event of events) {
    const result = validateCanonicalEvent(event);
    checks.push({ name: `canonical:${event && event.id ? event.id : 'unknown'}`, passed: result.valid, details: result });
    checks.push({ name: `raw-boundary:${event && event.id ? event.id : 'unknown'}`, ...checkProvenanceRawBoundary(event) });
  }
  for (const roundTrip of roundTrips) {
    checks.push({ name: `round-trip:${roundTrip.name || 'unnamed'}`, ...checkSemanticRoundTrip(roundTrip.original, roundTrip.restored) });
  }
  if (replay) checks.push({ name: 'replay-equivalence', ...checkReplayEquivalence(replay.live, replay.replayed) });
  return {
    conformanceVersion: '1.0.0',
    passed: checks.every(check => check.passed === true),
    totals: {
      checks: checks.length,
      passed: checks.filter(check => check.passed === true).length,
      failed: checks.filter(check => check.passed !== true).length,
    },
    checks,
  };
}

module.exports = {
  canonicalDigest,
  validateCanonicalEvent,
  checkCanonicalIdPreserved,
  checkProvenanceRawBoundary,
  semanticProjection,
  checkSemanticRoundTrip,
  checkReplayEquivalence,
  runConformanceSuite,
};
