'use strict';

const assert = require('assert');
const { createSearchHttpService } = require('./search_http_service');
const { createToitoiApiService } = require('./toitoi_api_service');

function buildSnapshot() {
  const events = [
    {
      id: 'q-local-term',
      type: 'inquiry',
      createdAt: '2026-07-22T00:00:00.000Z',
      body: { text: 'Why does the local hiyoko-gusa appear after rain?' },
      labels: ['hiyoko-gusa', 'weed'],
      contexts: {
        region: 'Shikoku',
        climate_zone: 'warm-temperate',
        soil_type: 'loam',
        crop_family: 'rice',
        season: 'summer',
      },
      provenance: { sourceProtocol: 'nostr', sourceId: 'nostr:q-local-term' },
      review: { state: 'approved' },
    },
  ];
  return {
    orderedIds: events.map(event => event.id),
    byId: Object.fromEntries(events.map(event => [event.id, event])),
  };
}

function run() {
  const searchService = createSearchHttpService({ indexSnapshot: buildSnapshot() });
  const standardService = {
    handleRequest() {
      return {
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        body: { message: 'standard fallback' },
      };
    },
  };
  const service = createToitoiApiService({ searchService, standardService });

  const search = service.handleRequest({
    method: 'GET',
    url: '/api/v1/search?q=hiyoko&region=Shikoku&review_state=approved',
  });
  assert.strictEqual(search.statusCode, 200);
  assert.strictEqual(search.body.total, 1);
  assert.strictEqual(search.body.results[0].id, 'q-local-term');
  assert.strictEqual(search.body.results[0].classification, 'related_candidate');

  const facets = service.handleRequest({
    method: 'GET',
    url: '/api/v1/search/contexts?dimension=climate',
  });
  assert.strictEqual(facets.statusCode, 200);
  assert.deepStrictEqual(facets.body.facets, [
    { value: 'warm-temperate', count: 1 },
  ]);

  const invalidFacet = service.handleRequest({
    method: 'GET',
    url: '/api/v1/search/contexts?dimension=identity',
  });
  assert.strictEqual(invalidFacet.statusCode, 400);
  assert.ok(invalidFacet.body.supportedDimensions.includes('region'));

  const fallback = service.handleRequest({ method: 'GET', url: '/unknown' });
  assert.strictEqual(fallback.statusCode, 404);
  assert.strictEqual(fallback.body.message, 'standard fallback');

  searchService.projection.close();
  console.log('v0.8.0 search API tests passed');
}

run();
