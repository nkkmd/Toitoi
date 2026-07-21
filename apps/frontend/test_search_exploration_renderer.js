'use strict';

const assert = require('assert');
const { renderSearchExploration } = require('./search_exploration_renderer');

function run() {
  const html = renderSearchExploration({
    state: 'ready',
    total: 2,
    results: [
      {
        id: 'q-explicit',
        classification: 'explicit_relation',
        identityMerged: false,
        context: ['Shikoku', 'warm-temperate', 'loam'],
        transport: 'nostr',
        reviewState: 'approved',
        provenance: 'nostr:q-explicit',
      },
      {
        id: '<q-candidate>',
        classification: 'related_candidate',
        identityMerged: false,
        context: [],
      },
    ],
  });

  assert.match(html, /data-view="search-exploration"/);
  assert.match(html, /明示的な関係/);
  assert.match(html, /関連候補/);
  assert.match(html, /同一性を自動統合しません/);
  assert.match(html, /Shikoku \/ warm-temperate \/ loam/);
  assert.ok(!html.includes('<q-candidate>'));
  assert.match(html, /%3Cq-candidate%3E/);

  assert.match(renderSearchExploration({ state: 'loading' }), /aria-busy="true"/);
  assert.match(renderSearchExploration({ state: 'empty', results: [] }), /一致する問いはありません/);
  assert.match(renderSearchExploration({ state: 'error', error: '<failed>' }), /&lt;failed&gt;/);

  console.log('search exploration renderer tests passed');
}

run();
