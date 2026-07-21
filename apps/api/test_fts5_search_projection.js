'use strict';

const assert = require('assert');
const {
  buildFtsQuery,
  createFts5SearchProjection,
  projectSearchDocument,
} = require('./fts5_search_projection');

function buildFixtures() {
  return [
    {
      id: 'inquiry-east-weeds',
      type: 'inquiry',
      createdAt: '2026-07-22T00:00:00.000Z',
      body: {
        text: 'Why are weed species different on the east side of the field?',
        observation: 'The east side contains more moisture-loving weeds.',
      },
      labels: ['weeds', 'field-edge'],
      contexts: {
        region: 'Shikoku',
        climate_zone: 'warm-temperate',
        soil_type: 'volcanic-ash',
        crop_family: 'rice',
        season: 'summer',
      },
      provenance: {
        sources: [
          {
            protocol: 'nostr',
            sourceId: 'nostr:one',
            authorId: 'human:farmer-a',
          },
        ],
      },
      meta: {
        publication: {
          humanReview: { decision: 'approved' },
        },
      },
    },
    {
      id: 'inquiry-north-soil',
      type: 'inquiry',
      createdAt: '2026-07-21T00:00:00.000Z',
      body: {
        text: 'How does compacted soil change crop growth in the north plot?',
        summary: 'Compaction and drainage may explain the growth difference.',
      },
      tags: ['soil', 'compaction'],
      contexts: {
        region: 'Tohoku',
        climate_zone: 'cool-temperate',
        soil_type: 'clay',
        crop_family: 'soybean',
        season: 'spring',
      },
      lineage: [{ relation: 'contrasts_with', target: 'inquiry-east-weeds' }],
      provenance: {
        sourceProtocol: 'lingonberry',
        sourceId: 'lingonberry:two',
      },
      reviewState: 'in_review',
    },
  ];
}

function projectionContract() {
  assert.strictEqual(buildFtsQuery('east weeds'), '"east" AND "weeds"');
  const projected = projectSearchDocument(buildFixtures()[0]);
  assert.strictEqual(projected.id, 'inquiry-east-weeds');
  assert.strictEqual(projected.region, 'Shikoku');
  assert.strictEqual(projected.climate, 'warm-temperate');
  assert.strictEqual(projected.transport, 'nostr');
  assert.strictEqual(projected.reviewState, 'approved');
  assert.match(projected.provenance, /nostr:one/);
  assert.match(projected.provenance, /human:farmer-a/);
  assert.match(projected.tagsText, /weeds/);
}

function primarySearchContract() {
  const projection = createFts5SearchProjection();
  try {
    assert.deepStrictEqual(projection.rebuild(buildFixtures()), { indexed: 2 });
    const textResult = projection.search({ q: 'moisture weeds' });
    assert.strictEqual(textResult.total, 1);
    assert.strictEqual(textResult.results[0].id, 'inquiry-east-weeds');
    assert.strictEqual(textResult.results[0].classification, 'related_candidate');
    assert.strictEqual(textResult.results[0].signals.lexical, true);
  } finally {
    projection.close();
  }
}

function summarySearchContract() {
  const projection = createFts5SearchProjection();
  try {
    projection.rebuild(buildFixtures());
    const summaryResult = projection.search({ q: 'drainage compaction' });
    assert.strictEqual(summaryResult.total, 1);
    assert.strictEqual(summaryResult.results[0].id, 'inquiry-north-soil');
  } finally {
    projection.close();
  }
}

function filterFacetContract() {
  const projection = createFts5SearchProjection();
  try {
    projection.rebuild(buildFixtures());
    const filtered = projection.search({
      climate_zone: 'warm-temperate',
      soil_type: 'volcanic-ash',
      crop_family: 'rice',
      transport: 'nostr',
      review_state: 'approved',
    });
    assert.strictEqual(filtered.total, 1);
    assert.strictEqual(filtered.results[0].id, 'inquiry-east-weeds');
    assert.strictEqual(filtered.results[0].signals.structuredFilters, true);
    assert.deepStrictEqual(projection.facets('transport'), [
      { value: 'lingonberry', count: 1 },
      { value: 'nostr', count: 1 },
    ]);
    assert.deepStrictEqual(projection.facets('review_state'), [
      { value: 'approved', count: 1 },
      { value: 'in_review', count: 1 },
    ]);
    assert.deepStrictEqual(projection.facets('region'), [
      { value: 'Shikoku', count: 1 },
      { value: 'Tohoku', count: 1 },
    ]);
    assert.throws(() => projection.facets('identity'), /Unsupported facet dimension/);
  } finally {
    projection.close();
  }
}

function upsertContract() {
  const projection = createFts5SearchProjection();
  try {
    projection.rebuild(buildFixtures());
    projection.upsert({
      ...buildFixtures()[0],
      body: { text: 'Why do sedges dominate the wet eastern edge?' },
    });
    assert.strictEqual(projection.search({ q: 'sedges' }).total, 1);
    assert.strictEqual(projection.search({ q: 'species' }).total, 0);
  } finally {
    projection.close();
  }
}

const scenarios = {
  projection: projectionContract,
  'search-primary': primarySearchContract,
  'search-summary': summarySearchContract,
  filters: filterFacetContract,
  upsert: upsertContract,
};

function run(selected = process.argv[2]) {
  if (selected) {
    if (!scenarios[selected]) throw new RangeError(`Unknown FTS5 test scenario: ${selected}`);
    scenarios[selected]();
    console.log(`FTS5 ${selected} contract passed`);
    return;
  }
  for (const scenario of Object.values(scenarios)) scenario();
  console.log('FTS5 search projection tests passed');
}

if (require.main === module) run();

module.exports = { buildFixtures, run, scenarios };
