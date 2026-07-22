'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const fixturePath = path.resolve(
  __dirname,
  '../../fixtures/reference/v1.0.0/east-side-weed-scenario.json',
);

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function assertCanonicalEvent(event) {
  assert.match(event.id, /^tt:evt:\S+$/);
  assert.strictEqual(event.schemaVersion, '0.1.0');
  assert.ok(['inquiry', 'observation', 'annotation', 'response', 'synthesis'].includes(event.type));
  assert.ok(!Number.isNaN(Date.parse(event.createdAt)));
  assert.strictEqual(typeof event.body.text, 'string');
  assert.ok(event.body.text.length > 0);
  assert.strictEqual(typeof event.body.language, 'string');
  assert.ok(Array.isArray(event.provenance.sources));
  assert.ok(event.provenance.sources.length > 0);
  for (const source of event.provenance.sources) {
    assert.strictEqual(typeof source.protocol, 'string');
    assert.ok(source.protocol.length > 0);
    assert.strictEqual(typeof source.sourceId, 'string');
    assert.ok(source.sourceId.length > 0);
  }
}

function run() {
  const fixture = loadFixture();

  assert.strictEqual(fixture.fixtureVersion, '1.0.0');
  assert.strictEqual(fixture.scenarioId, 'toitoi-v1-east-side-weed');

  const canonicalEvents = [
    fixture.observation,
    fixture.publishedInquiry,
    fixture.relatedInquiry,
    fixture.derivedInquiry,
  ];

  canonicalEvents.forEach(assertCanonicalEvent);

  const ids = new Set(canonicalEvents.map(event => event.id));
  assert.strictEqual(ids.size, canonicalEvents.length, 'canonical IDs must be unique');

  assert.strictEqual(
    fixture.annotation.inputEventId,
    fixture.observation.id,
    'annotation must retain its source observation',
  );
  assert.strictEqual(
    fixture.inquiryDraft.sourceObservationId,
    fixture.observation.id,
    'draft must retain its source observation',
  );
  assert.strictEqual(
    fixture.inquiryDraft.sourceAnnotationId,
    fixture.annotation.id,
    'draft must retain its reviewed annotation',
  );
  assert.notStrictEqual(
    fixture.annotation.review.status,
    fixture.inquiryDraft.reviewState,
    'annotation review and publication review must remain distinct states',
  );

  const publishedTargets = fixture.publishedInquiry.lineage.map(edge => edge.target);
  assert.deepStrictEqual(publishedTargets, [fixture.observation.id]);

  const derivedTargets = new Set(fixture.derivedInquiry.lineage.map(edge => edge.target));
  assert.deepStrictEqual(
    derivedTargets,
    new Set([fixture.publishedInquiry.id, fixture.relatedInquiry.id]),
  );
  assert.ok(fixture.derivedInquiry.lineage.every(edge => edge.type === 'synthesizes'));

  assert.strictEqual(fixture.transportProjections.nostr.status, 'delivered');
  assert.strictEqual(fixture.transportProjections.lingonberry.status, 'delivered');
  assert.strictEqual(fixture.transportProjections.atproto.status, 'quarantined');
  for (const projection of Object.values(fixture.transportProjections)) {
    assert.strictEqual(projection.canonicalEventId, fixture.publishedInquiry.id);
  }

  assert.ok(
    fixture.vocabularyMappings.some(
      mapping => mapping.localTerm === '東べり' && mapping.sharedConcept === 'field-edge',
    ),
  );
  assert.ok(
    fixture.vocabularyMappings.every(mapping => mapping.reviewState.startsWith('confirmed')),
  );

  assert.deepStrictEqual(
    new Set(fixture.recoveryExpectations.canonicalEventIds),
    ids,
    'recovery manifest must cover every canonical event in the fixture',
  );
  assert.ok(fixture.recoveryExpectations.durableState.includes('canonical-storage'));
  assert.ok(fixture.recoveryExpectations.rebuildableDerivedState.includes('search-index'));

  console.log('v1.0.0 reference fixture contract tests passed');
}

run();
