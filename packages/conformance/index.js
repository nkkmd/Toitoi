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

function validateCanonicalEvent(event) {
  const errors = [];
  if (!isObject(event)) return { valid: false, errors: [{ path: '$', code: 'type', message: 'Canonical Event must be an object.' }] };
  for (const field of ['id', 'type', 'createdAt', 'content', 'provenance']) {
    if (!(field in event)) errors.push({ path: `$.${field}`, code: 'required', message: `${field} is required.` });
  }
  if ('id' in event && (typeof event.id !== 'string' || event.id.trim() === '')) errors.push({ path: '$.id', code: 'type', message: 'id must be a non-empty string.' });
  if ('type' in event && (typeof event.type !== 'string' || event.type.trim() === '')) errors.push({ path: '$.type', code: 'type', message: 'type must be a non-empty string.' });
  if ('createdAt' in event && Number.isNaN(Date.parse(event.createdAt))) errors.push({ path: '$.createdAt', code: 'format', message: 'createdAt must be an ISO-compatible timestamp.' });
  if ('content' in event && !isObject(event.content)) errors.push({ path: '$.content', code: 'type', message: 'content must be an object.' });
  if ('provenance' in event && !isObject(event.provenance)) errors.push({ path: '$.provenance', code: 'type', message: 'provenance must be an object.' });
  if ('schemaVersion' in event && typeof event.schemaVersion !== 'string') errors.push({ path: '$.schemaVersion', code: 'type', message: 'schemaVersion must be a string.' });
  if (isObject(event.provenance) && 'rawRef' in event.provenance && typeof event.provenance.rawRef !== 'string') {
    errors.push({ path: '$.provenance.rawRef', code: 'type', message: 'rawRef must be a string when present.' });
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
  if ('raw' in provenance) return { passed: false, reason: 'embedded_raw_payload' };
  return { passed: typeof provenance.rawRef === 'string' || Array.isArray(provenance.sources), reason: null };
}

function semanticProjection(event) {
  return {
    id: event.id,
    type: event.type,
    content: event.content,
    contexts: event.contexts || {},
    relationships: event.relationships || [],
    phase: event.phase || null,
    provenance: event.provenance || {},
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
  return { passed: canonicalDigest(expected) === canonicalDigest(actual), expectedDigest: canonicalDigest(expected), actualDigest: canonicalDigest(actual) };
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
    conformanceVersion: '0.9.0',
    passed: checks.every(check => check.passed === true),
    totals: { checks: checks.length, passed: checks.filter(check => check.passed === true).length, failed: checks.filter(check => check.passed !== true).length },
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
