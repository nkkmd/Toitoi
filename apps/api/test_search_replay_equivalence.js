'use strict';

const assert = require('assert');
const { replayMultiTransportStorage } = require('@toitoi/protocol');
const { createFts5SearchProjection } = require('./fts5_search_projection');

function canonicalEvents() {
  return [
    {
      id: 'q-replay-1',
      type: 'inquiry',
      createdAt: '2026-07-22T00:00:00.000Z',
      body: { text: 'How does soil moisture change after summer rain?' },
      contexts: { region: 'Shikoku', climate_zone: 'warm-temperate', soil_type: 'loam', season: 'summer' },
      provenance: { sourceProtocol: 'nostr', sourceId: 'nostr:q-replay-1' },
      review: { state: 'approved' },
    },
    {
      id: 'q-replay-2',
      type: 'inquiry',
      createdAt: '2026-07-22T01:00:00.000Z',
      body: { text: 'Which winter cover crop protects volcanic ash soil?' },
      contexts: { region: 'Tohoku', climate_zone: 'cool-temperate', soil_type: 'volcanic-ash', crop_family: 'legume', season: 'winter' },
      provenance: { sourceProtocol: 'atproto', sourceId: 'atproto:q-replay-2' },
      review: { state: 'reviewed' },
    },
  ];
}

function replaySnapshot(events) {
  return replayMultiTransportStorage([
    {
      protocol: 'nostr',
      replayResult: {
        ingestResult: {
          accepted: events.map(canonicalEvent => ({ canonicalEvent })),
        },
      },
    },
  ]).indexSnapshot;
}

function resultIds(projection, options) {
  return projection.search(options).results.map(result => result.id);
}

function run() {
  const events = canonicalEvents();
  const direct = createFts5SearchProjection();
  const replayed = createFts5SearchProjection();
  try {
    direct.rebuild(events);
    const snapshot = replaySnapshot(events);
    replayed.rebuild(snapshot.orderedIds.map(id => snapshot.byId[id]));

    assert.deepStrictEqual(resultIds(replayed, { q: 'soil' }), resultIds(direct, { q: 'soil' }));
    assert.deepStrictEqual(resultIds(replayed, { region: 'Shikoku' }), resultIds(direct, { region: 'Shikoku' }));
    assert.deepStrictEqual(replayed.facets('season'), direct.facets('season'));
    assert.strictEqual(snapshot.orderedIds.length, events.length);
  } finally {
    direct.close();
    replayed.close();
  }

  console.log('search replay equivalence tests passed');
}

run();
