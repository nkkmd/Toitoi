'use strict';

const assert = require('node:assert/strict');
const { createGenealogyViewModel } = require('./genealogy_view_model');
const { renderGenealogyView } = require('./genealogy_view_renderer');

function run() {
  const source = {
    id: 'tt:evt:source-1', type: 'inquiry', body: { text: 'Source inquiry', language: 'en' },
    createdAt: '2026-07-21T00:00:00.000Z', provenance: { sources: [{ protocol: 'nostr', sourceId: 'raw-source' }] },
    children: [],
  };
  const derived = {
    id: 'tt:evt:derived-1', type: 'inquiry', body: { text: 'Derived inquiry', language: 'en' },
    createdAt: '2026-07-21T01:00:00.000Z', contexts: { soil_type: 'clay' },
    lineage: [{ type: 'contrasts_with', target: source.id }],
    provenance: { sources: [{ protocol: 'lingonberry', sourceId: 'object-1' }] },
    identity: { canonicalId: 'tt:evt:derived-1', claims: [] },
    meta: { publication: { derivation: {
      relationType: 'contrasts_with', sourceInquiryIds: [source.id], relationConfirmedByHuman: true,
      ai: { suggestedRelationType: 'reframes', model: 'deterministic' },
    }, humanReview: { decision: 'approved', reviewerId: 'human:reviewer' } } },
    children: [],
  };
  source.children.push(derived);

  const detailResponse = { event: derived, references: { parents: [source], children: [] } };
  const model = createGenealogyViewModel({ detailResponse, treeResponse: source, selectedId: derived.id });
  assert.equal(model.state, 'ready');
  assert.equal(model.distinctions.semanticRelation.type, 'contrasts_with');
  assert.equal(model.distinctions.semanticRelation.confirmedByHuman, true);
  assert.equal(model.distinctions.contextSimilarity.isIdentityEvidence, false);
  assert.equal(model.review.aiSuggestion.suggestedRelationType, 'reframes');
  assert.equal(model.review.humanReview.reviewerId, 'human:reviewer');
  assert.ok(model.review.provenance.protocols.includes('lingonberry'));

  const html = renderGenealogyView(model);
  assert.match(html, /Canonical identity/);
  assert.match(html, /Semantic relation/);
  assert.match(html, /Context similarity/);
  assert.match(html, /identity evidenceではありません/);
  assert.match(html, /contrasts_with/);
  console.log('v0.7.0 integrated genealogy view passed');
}

try { run(); } catch (error) { console.error(error); process.exitCode = 1; }
