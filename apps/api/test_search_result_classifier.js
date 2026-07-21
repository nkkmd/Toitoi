'use strict';

const assert = require('assert');
const { classifySearchResult } = require('./search_result_classifier');

function run() {
  assert.deepStrictEqual(
    classifySearchResult({ requestedId: 'q-1', event: { id: 'q-1' } }),
    {
      classification: 'exact_identity',
      reason: 'canonical_id_match',
      identityMerged: false,
    },
  );

  assert.deepStrictEqual(
    classifySearchResult({
      relatedTo: 'q-1',
      event: {
        id: 'q-2',
        lineage: [{ relation: 'reframes', target: 'q-1' }],
      },
    }),
    {
      classification: 'explicit_relation',
      reason: 'declared_semantic_edge',
      identityMerged: false,
    },
  );

  assert.deepStrictEqual(
    classifySearchResult({ lexical: true, event: { id: 'q-3' } }),
    {
      classification: 'related_candidate',
      reason: 'lexical_similarity',
      identityMerged: false,
    },
  );

  console.log('search result classifier tests passed');
}

run();
