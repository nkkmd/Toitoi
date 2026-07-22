'use strict';

const assert = require('assert');
const {
  validateCanonicalEvent,
  checkCanonicalIdPreserved,
  checkProvenanceRawBoundary,
  checkSemanticRoundTrip,
  checkReplayEquivalence,
  runConformanceSuite,
} = require('./index');

const event = {
  id: 'canonical-1',
  schemaVersion: '1.0.0',
  type: 'inquiry',
  createdAt: '2026-07-22T00:00:00.000Z',
  content: { inquiry: 'Why does weed composition differ on the eastern side?' },
  contexts: { region: 'test-region', soil_type: 'volcanic_ash' },
  relationships: [{ type: 'derived_from', target: 'observation-1' }],
  provenance: { rawRef: 'raw:1', sources: [{ transport: 'nostr' }] },
};

assert.strictEqual(validateCanonicalEvent(event).valid, true);
assert.strictEqual(validateCanonicalEvent({}).valid, false);
assert.strictEqual(checkCanonicalIdPreserved(event, { ...event }).passed, true);
assert.strictEqual(checkCanonicalIdPreserved(event, { ...event, id: 'changed' }).passed, false);
assert.strictEqual(checkProvenanceRawBoundary(event).passed, true);
assert.deepStrictEqual(checkProvenanceRawBoundary({ ...event, provenance: { raw: { secret: true } } }), {
  passed: false,
  reason: 'embedded_raw_payload',
});

const restored = JSON.parse(JSON.stringify(event));
restored.transportMetadata = { relay: 'ignored-by-semantic-contract' };
assert.strictEqual(checkSemanticRoundTrip(event, restored).passed, true);
assert.strictEqual(checkReplayEquivalence([event], [restored]).passed, true);

const report = runConformanceSuite({
  events: [event],
  roundTrips: [{ name: 'nostr', original: event, restored }],
  replay: { live: [event], replayed: [restored] },
});
assert.strictEqual(report.passed, true);
assert.strictEqual(report.conformanceVersion, '0.9.0');
assert.strictEqual(report.totals.failed, 0);

console.log('conformance suite: ok');
