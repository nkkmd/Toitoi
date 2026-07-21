'use strict';

const assert = require('assert');
const { buildSearchRequest, createSearchExplorationViewModel } = require('./search_exploration_view_model');

async function run() {
  assert.strictEqual(
    buildSearchRequest({ query: 'soil moisture', region: 'Shikoku', reviewState: 'approved' }),
    '/api/v1/search?q=soil+moisture&region=Shikoku&review_state=approved',
  );

  const requested = [];
  const viewModel = createSearchExplorationViewModel({
    async fetchJson(url) {
      requested.push(url);
      if (url.startsWith('/api/v1/search/contexts')) return { facets: [{ value: 'Shikoku', count: 2 }] };
      if (url.endsWith('/related')) return {
        inquiryId: 'q1',
        identityMerged: false,
        results: [{ id: 'q2', classification: 'explicit_relation', region: 'Shikoku' }],
      };
      return {
        total: 1,
        results: [{ id: 'q1', classification: 'related_candidate', region: 'Shikoku', identityMerged: false }],
      };
    },
  });

  const search = await viewModel.search({ query: 'soil', region: 'Shikoku' });
  assert.strictEqual(search.total, 1);
  assert.deepStrictEqual(search.results[0].context, ['Shikoku']);
  assert.strictEqual(search.results[0].identityMerged, false);

  assert.deepStrictEqual(await viewModel.contexts('region'), [{ value: 'Shikoku', count: 2 }]);
  const related = await viewModel.related('q1');
  assert.strictEqual(related.results[0].classification, 'explicit_relation');
  assert.strictEqual(related.identityMerged, false);
  assert.strictEqual(requested.length, 3);

  console.log('search exploration view model tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
