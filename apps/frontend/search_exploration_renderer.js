'use strict';

const { escapeHtml } = require('./context_exploration_renderer');

function classificationLabel(value) {
  if (value === 'exact_identity') return '正確なID一致';
  if (value === 'explicit_relation') return '明示的な関係';
  return '関連候補';
}

function renderSearchExploration(model, options = {}) {
  const detailBasePath = typeof options.detailBasePath === 'string' ? options.detailBasePath : '/inquiries';
  if (!model || model.state === 'loading') {
    return '<section data-view="search-exploration" data-state="loading" aria-busy="true"><p>問いを検索しています。</p></section>';
  }
  if (model.state === 'error') {
    return `<section data-view="search-exploration" data-state="error" role="alert"><p>${escapeHtml(model.error || '検索に失敗しました。')}</p></section>`;
  }
  if (model.state === 'empty' || !Array.isArray(model.results) || model.results.length === 0) {
    return '<section data-view="search-exploration" data-state="empty"><h2>問いを探す</h2><p>一致する問いはありません。</p></section>';
  }

  const cards = model.results.map(result => {
    const href = `${detailBasePath}/${encodeURIComponent(result.id)}/detail`;
    const contexts = Array.isArray(result.context) ? result.context.map(escapeHtml).join(' / ') : '';
    return `<article data-inquiry-id="${escapeHtml(result.id)}" data-classification="${escapeHtml(result.classification)}"><h3><a href="${escapeHtml(href)}">${escapeHtml(result.id)}</a></h3><p><strong>${escapeHtml(classificationLabel(result.classification))}</strong></p><p>${contexts || '文脈情報なし'}</p><dl><dt>Transport</dt><dd>${escapeHtml(result.transport || '—')}</dd><dt>Review</dt><dd>${escapeHtml(result.reviewState || '—')}</dd><dt>Provenance</dt><dd>${escapeHtml(result.provenance || '—')}</dd></dl></article>`;
  }).join('');

  return `<section data-view="search-exploration" data-state="ready"><h2>問いを探す</h2><p>${escapeHtml(model.total)}件</p><p class="identity-policy">検索結果・関連候補・語彙対応からCanonical Eventの同一性を自動統合しません。</p><div class="search-results">${cards}</div></section>`;
}

module.exports = { classificationLabel, renderSearchExploration };
