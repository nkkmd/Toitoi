'use strict';

const assert = require('assert');
const { createFts5SearchProjection } = require('./fts5_search_projection');
const { createSearchHttpService } = require('./search_http_service');
const { createRelatedInquiryHttpService } = require('./related_inquiry_http_service');
const { createToitoiApiService } = require('./toitoi_api_service');

const events = [
  {
    id: 'source',
    type: 'inquiry',
    createdAt: '2026-07-22T00:00:00.000Z',
    body: { text: 'weed moisture field edge' },
    relationships: [{ relation: 'observed_alongside', target: 'explicit' }],
  },
  {
    id: 'explicit',
    type: 'inquiry',
    createdAt: '2026-07-21T00:00:00.000Z',
    body: { text: 'different words' },
  },
  {
    id: 'derived-child',
    type: 'inquiry',
    createdAt: '2026-07-21T12:00:00.000Z',
    body: { text: 'different child wording' },
    lineage: [{ relation: 'derived_from', target: 'source' }],
  },
  {
    id: 'lexical',
    type: 'inquiry',
    createdAt: '2026-07-20T00:00:00.000Z',
    body: { text: 'weed moisture field edge' },
  },
];
const snapshot = {
  orderedIds: events.map(event => event.id),
  byId: Object.fromEntries(events.map(event => [event.id, event])),
};
const projection = createFts5SearchProjection();
const searchService = createSearchHttpService({ projection, indexSnapshot: snapshot });
searchService.ensureCurrent();
const relatedInquiryService = createRelatedInquiryHttpService({ indexSnapshot: snapshot, searchService });
const service = createToitoiApiService({
  searchService,
  relatedInquiryService,
  standardService: { handleRequest: () => ({ statusCode: 404, headers: {}, body: {} }) },
});

const response = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/source/related' });
assert.strictEqual(response.statusCode, 200);
assert.strictEqual(response.body.identityMerged, false);
assert.deepStrictEqual(
  response.body.results.map(result => result.id),
  ['explicit', 'derived-child', 'lexical'],
);
assert.strictEqual(response.body.results[0].classification, 'explicit_relation');
assert.strictEqual(response.body.results[0].relation, 'observed_alongside');
assert.strictEqual(response.body.results[1].classification, 'explicit_relation');
assert.strictEqual(response.body.results[1].relation, 'derived_from');
assert.strictEqual(response.body.results[2].classification, 'related_candidate');
assert.ok(response.body.results.every(result => result.identityMerged === false));

projection.close();
console.log('related inquiry API tests passed');
