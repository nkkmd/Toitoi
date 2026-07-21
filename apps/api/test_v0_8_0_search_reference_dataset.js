'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createFts5SearchProjection } = require('./fts5_search_projection');

function run() {
  const fixturePath = path.resolve(__dirname, '../../fixtures/search/v0.8.0-reference-dataset.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const projection = createFts5SearchProjection();
  try {
    projection.rebuild(fixture.events);
    for (const query of fixture.queries) {
      const result = projection.search(query.options);
      assert.deepStrictEqual(
        result.results.map(item => item.id),
        query.expectedIds,
        `reference query failed: ${query.name}`,
      );
      assert.ok(result.results.every(item => item.classification === 'related_candidate'));
    }
    console.log('v0.8.0 search reference dataset tests passed');
  } finally {
    projection.close();
  }
}

run();
