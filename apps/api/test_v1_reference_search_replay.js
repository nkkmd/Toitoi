'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createFts5SearchProjection } = require('./fts5_search_projection');

const fixturePath = path.resolve(
  __dirname,
  '../../fixtures/reference/v1.0.0/east-side-weed-scenario.json',
);

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function canonicalEvents(fixture) {
  return [
    fixture.observation,
    fixture.publishedInquiry,
    fixture.relatedInquiry,
    fixture.derivedInquiry,
  ];
}

function normalizeReferenceQuery(query) {
  if (query.relation) {
    return { q: query.relation, type: 'inquiry' };
  }
  return { ...query };
}

function resultIds(result) {
  return result.results.map(item => item.id);
}

function assertExpectedIdsPresent(actualIds, expectedIds, name) {
  for (const expectedId of expectedIds) {
    assert.ok(
      actualIds.includes(expectedId),
      `${name}: expected ${expectedId} in ${JSON.stringify(actualIds)}`,
    );
  }
}

function run() {
  const fixture = loadFixture();
  const events = canonicalEvents(fixture);
  const projection = createFts5SearchProjection();

  try {
    const firstRebuild = projection.rebuild(events);
    assert.deepStrictEqual(firstRebuild, { indexed: events.length });

    const firstResults = new Map();
    for (const expectation of fixture.searchExpectations) {
      const result = projection.search(normalizeReferenceQuery(expectation.query));
      const ids = resultIds(result);
      assertExpectedIdsPresent(ids, expectation.expectedIds, expectation.name);
      assert.ok(result.results.every(item => item.classification === 'related_candidate'));
      firstResults.set(expectation.name, ids);
    }

    const regions = projection.facets('region');
    assert.ok(regions.some(facet => facet.value === 'reference-region-a' && facet.count === 2));
    assert.ok(regions.some(facet => facet.value === 'reference-region-b' && facet.count === 1));

    const secondRebuild = projection.rebuild([...events].reverse());
    assert.deepStrictEqual(secondRebuild, { indexed: events.length });

    for (const expectation of fixture.searchExpectations) {
      const replayed = resultIds(
        projection.search(normalizeReferenceQuery(expectation.query)),
      );
      assert.deepStrictEqual(
        replayed,
        firstResults.get(expectation.name),
        `${expectation.name}: search results changed after replay rebuild`,
      );
    }

    const relatedRegion = projection.search({
      type: 'inquiry',
      region: 'reference-region-b',
    });
    assert.deepStrictEqual(resultIds(relatedRegion), [fixture.relatedInquiry.id]);

    console.log('v1.0.0 reference search and replay tests passed');
  } finally {
    projection.close();
  }
}

run();
