'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  validateCanonicalEvent,
  checkCanonicalIdPreserved,
  checkProvenanceRawBoundary,
  checkSemanticRoundTrip,
  checkReplayEquivalence,
  runConformanceSuite,
} = require('./index');

const fixture = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../../fixtures/reference/v1.0.0/east-side-weed-scenario.json'),
  'utf8',
));
const event = fixture.publishedInquiry;

function assertInvalidAt(candidate, expectedPath, message) {
  const validation = validateCanonicalEvent(candidate);
  assert.strictEqual(validation.valid, false, message);
  assert.ok(
    validation.errors.some(error => error.path === expectedPath),
    `${message}: expected an error at ${expectedPath}, got ${JSON.stringify(validation.errors)}`,
  );
}

assert.strictEqual(validateCanonicalEvent(event).valid, true);
assert.strictEqual(validateCanonicalEvent({}).valid, false);
assert.strictEqual(validateCanonicalEvent({ ...event, id: 'legacy-id' }).valid, false);

const { body: nativeBody, ...nativeWithoutBody } = event;
const legacyContentOnlyEvent = {
  ...nativeWithoutBody,
  id: 'legacy-v0.9-event',
  content: nativeBody,
};
assert.strictEqual(
  validateCanonicalEvent(legacyContentOnlyEvent).valid,
  false,
  'native v1 must reject the legacy content alias',
);
assert.strictEqual(
  validateCanonicalEvent(legacyContentOnlyEvent, { compatibilityProfile: 'v0.9.0' }).valid,
  true,
  'the explicit v0.9.0 compatibility profile must accept the legacy content alias',
);

assert.strictEqual(
  validateCanonicalEvent({ ...event, schemaVersion: '1.0.0' }).valid,
  false,
  'native v1 must reject a repository release version used as the wire schema version',
);
assert.strictEqual(
  validateCanonicalEvent({ ...event, type: 'unknown-event-type' }).valid,
  false,
  'native v1 must reject event types outside the Canonical Event enum',
);
assertInvalidAt(
  { ...event, provenance: { sources: [] } },
  '$.provenance.sources',
  'native v1 must reject empty provenance.sources',
);
assertInvalidAt(
  { ...event, provenance: { sources: [{}] } },
  '$.provenance.sources[0].protocol',
  'native v1 must reject a provenance source without protocol',
);
assertInvalidAt(
  { ...event, provenance: { sources: [{ protocol: 'nostr' }] } },
  '$.provenance.sources[0].sourceId',
  'native v1 must reject a provenance source without sourceId',
);
assertInvalidAt(
  { ...event, provenance: { sources: [{ protocol: '   ', sourceId: 'source-1' }] } },
  '$.provenance.sources[0].protocol',
  'native v1 must reject an empty provenance source protocol',
);
assertInvalidAt(
  { ...event, provenance: { sources: [{ protocol: 'nostr', sourceId: '' }] } },
  '$.provenance.sources[0].sourceId',
  'native v1 must reject an empty provenance source sourceId',
);
assertInvalidAt(
  { ...event, provenance: { sources: ['nostr:source-1'] } },
  '$.provenance.sources[0]',
  'native v1 must reject a non-object provenance source',
);

assert.strictEqual(checkCanonicalIdPreserved(event, { ...event }).passed, true);
assert.strictEqual(checkCanonicalIdPreserved(event, { ...event, id: 'tt:evt:changed' }).passed, false);
assert.strictEqual(checkProvenanceRawBoundary(event).passed, true);
assert.deepStrictEqual(checkProvenanceRawBoundary({ ...event, provenance: { ...event.provenance, raw: { secret: true } } }), {
  passed: false,
  reason: 'embedded_raw_payload',
});
assert.deepStrictEqual(checkProvenanceRawBoundary({ ...event, provenance: { sources: [{}] } }), {
  passed: false,
  reason: 'missing_raw_reference_or_sources',
});

const restored = JSON.parse(JSON.stringify(event));
restored.transportMetadata = { relay: 'ignored-by-semantic-contract' };
assert.strictEqual(checkSemanticRoundTrip(event, restored).passed, true);
assert.strictEqual(checkReplayEquivalence([event], [restored]).passed, true);

const report = runConformanceSuite({
  events: [fixture.observation, fixture.publishedInquiry, fixture.relatedInquiry, fixture.derivedInquiry],
  roundTrips: [
    { name: 'nostr', original: event, restored },
    { name: 'lingonberry', original: event, restored },
    { name: 'atproto', original: event, restored },
  ],
  replay: {
    live: [fixture.observation, fixture.publishedInquiry, fixture.relatedInquiry, fixture.derivedInquiry],
    replayed: [fixture.derivedInquiry, fixture.relatedInquiry, fixture.publishedInquiry, fixture.observation],
  },
});
assert.strictEqual(report.passed, true);
assert.strictEqual(report.conformanceVersion, '1.0.0');
assert.strictEqual(report.totals.failed, 0);

console.log('conformance suite: ok');
