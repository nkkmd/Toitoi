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

assert.strictEqual(validateCanonicalEvent(event).valid, true);
assert.strictEqual(validateCanonicalEvent({}).valid, false);
assert.strictEqual(validateCanonicalEvent({ ...event, id: 'legacy-id' }).valid, false);
assert.strictEqual(checkCanonicalIdPreserved(event, { ...event }).passed, true);
assert.strictEqual(checkCanonicalIdPreserved(event, { ...event, id: 'tt:evt:changed' }).passed, false);
assert.strictEqual(checkProvenanceRawBoundary(event).passed, true);
assert.deepStrictEqual(checkProvenanceRawBoundary({ ...event, provenance: { ...event.provenance, raw: { secret: true } } }), {
  passed: false,
  reason: 'embedded_raw_payload',
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
