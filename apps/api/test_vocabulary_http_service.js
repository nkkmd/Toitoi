'use strict';

const assert = require('assert');
const { createVocabularyHttpService } = require('./vocabulary_http_service');
const { createToitoiApiService } = require('./toitoi_api_service');

function run() {
  const vocabularyService = createVocabularyHttpService({
    terms: [
      { id: 'core:weed', layer: 'core', label: 'weed', language: 'en' },
      { id: 'local:hiyoko-gusa', layer: 'local', label: 'hiyoko-gusa', language: 'ja-Latn', locality: 'Shikoku' },
    ],
    mappings: [
      {
        id: 'map:1',
        sourceTermId: 'local:hiyoko-gusa',
        targetTermId: 'core:weed',
        relation: 'close_match',
        status: 'mapping_candidate',
      },
    ],
  });
  const standardService = {
    handleRequest() {
      return { statusCode: 404, headers: {}, body: { message: 'fallback' } };
    },
  };
  const service = createToitoiApiService({ vocabularyService, standardService });

  const localTerms = service.handleRequest({
    method: 'GET',
    url: '/api/v1/vocabulary/terms?layer=local&locality=Shikoku',
  });
  assert.strictEqual(localTerms.statusCode, 200);
  assert.strictEqual(localTerms.body.total, 1);
  assert.strictEqual(localTerms.body.results[0].id, 'local:hiyoko-gusa');

  const mappings = service.handleRequest({
    method: 'GET',
    url: '/api/v1/vocabulary/mappings?status=mapping_candidate',
  });
  assert.strictEqual(mappings.statusCode, 200);
  assert.strictEqual(mappings.body.total, 1);
  assert.match(mappings.body.identityPolicy, /never merge/);

  console.log('vocabulary HTTP service tests passed');
}

run();
