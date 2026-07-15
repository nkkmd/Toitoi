'use strict';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCriteria(criteria) {
  return criteria.map(item => `<li><strong>${escapeHtml(item.key)}</strong>: ${escapeHtml(item.value)}</li>`).join('');
}

function renderContextCells(result, keys) {
  const map = new Map(result.contexts.map(item => [item.key, item.value]));
  return keys.map(key => `<td data-context-key="${escapeHtml(key)}">${escapeHtml(map.get(key) || '—')}</td>`).join('');
}

function renderContextExploration(model, options = {}) {
  const detailBasePath = typeof options.detailBasePath === 'string' ? options.detailBasePath : '/inquiries';

  if (!model || model.state === 'loading') {
    return '<section data-view="context-exploration" data-state="loading" aria-busy="true"><p>文脈を検索しています。</p></section>';
  }

  if (model.state === 'error') {
    return `<section data-view="context-exploration" data-state="error" role="alert"><p>${escapeHtml(model.error || '検索条件を確認してください。')}</p></section>`;
  }

  const criteria = `<ul aria-label="選択中の文脈条件">${renderCriteria(model.criteria || [])}</ul>`;

  if (model.state === 'empty') {
    return `<section data-view="context-exploration" data-state="empty"><h2>文脈探索</h2>${criteria}<p>一致する問いはありません。</p></section>`;
  }

  const keys = model.comparisonKeys || [];
  const header = keys.map(key => `<th scope="col">${escapeHtml(key)}</th>`).join('');
  const rows = (model.results || []).map(result => {
    const href = `${detailBasePath}/${encodeURIComponent(result.id)}/detail`;
    return `<tr data-inquiry-id="${escapeHtml(result.id)}"><th scope="row"><a href="${escapeHtml(href)}">${escapeHtml(result.text || result.id)}</a></th>${renderContextCells(result, keys)}<td>${escapeHtml(result.provenance.sourceProtocols?.join(', ') || '')}</td></tr>`;
  }).join('');

  return `<section data-view="context-exploration" data-state="ready"><h2>文脈探索</h2>${criteria}<p>${escapeHtml(model.total)}件の関連する問い</p><p class="context-semantics">文脈上の関連候補であり、同一の問いとして自動統合しません。</p><div role="region" aria-label="文脈比較結果" tabindex="0"><table><thead><tr><th scope="col">問い</th>${header}<th scope="col">取得元</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

module.exports = {
  escapeHtml,
  renderContextExploration,
};
