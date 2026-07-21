'use strict';

const { VIEW_STATES } = require('./inquiry_view_model');
const { escapeHtml, renderLineageTree } = require('./lineage_tree_renderer');

function renderJson(value) {
  return `<pre>${escapeHtml(JSON.stringify(value == null ? null : value, null, 2))}</pre>`;
}

function renderGenealogyView(model) {
  if (!model || model.state === VIEW_STATES.EMPTY) {
    return '<section class="genealogy-view"><p>表示できる系譜情報はありません。</p></section>';
  }
  if (model.state === VIEW_STATES.ERROR) {
    return `<section class="genealogy-view" role="alert"><p>${escapeHtml(model.error || '系譜情報を表示できません。')}</p></section>`;
  }

  const relation = model.distinctions.semanticRelation;
  const context = model.distinctions.contextSimilarity;
  return [
    '<section class="genealogy-view" aria-labelledby="genealogy-view-title">',
    '<h2 id="genealogy-view-title">問いの系譜・文脈・来歴</h2>',
    `<article class="card"><h3>問い</h3><p>${escapeHtml(model.inquiry.text)}</p><p class="meta">${escapeHtml(model.inquiry.id)}</p></article>`,
    '<div class="genealogy-grid">',
    `<article class="card"><h3>Canonical identity</h3>${renderJson(model.distinctions.canonicalIdentity)}<p>同一性は明示的なidentity情報で判断します。</p></article>`,
    `<article class="card"><h3>Semantic relation</h3>${renderJson(relation)}<p>派生関係は同一性の統合を意味しません。</p></article>`,
    `<article class="card"><h3>Context similarity</h3>${renderJson(context.contexts)}<p>文脈の類似は関連候補であり、identity evidenceではありません。</p></article>`,
    '</div>',
    renderLineageTree(model.lineage),
    `<article class="card"><h3>Provenance / review</h3>${renderJson(model.review)}</article>`,
    '</section>',
  ].join('');
}

module.exports = { renderGenealogyView };
