'use strict';

const { VIEW_STATES } = require('./inquiry_view_model');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderProvenance(provenance) {
  const protocols = provenance && Array.isArray(provenance.protocols) ? provenance.protocols : [];
  if (protocols.length === 0) {
    return '<span class="lineage-node__provenance">来歴情報なし</span>';
  }
  return `<span class="lineage-node__provenance">${escapeHtml(protocols.join(' / '))}</span>`;
}

function renderNode(node, detailBasePath) {
  const id = node.id || '';
  const label = node.text || '参照できない問い';
  const relation = node.relationToParent
    ? `<span class="lineage-node__relation">${escapeHtml(node.relationToParent)}</span>`
    : '';
  const status = node.status !== 'available'
    ? `<span class="lineage-node__warning">${escapeHtml(node.status)}</span>`
    : '';
  const selected = node.selected ? ' aria-current="true"' : '';
  const href = id ? `${detailBasePath}/${encodeURIComponent(id)}` : '#';
  const disabled = id ? '' : ' aria-disabled="true" tabindex="-1"';
  const children = node.children && node.children.length > 0
    ? `<ul role="group">${node.children.map(child => renderNode(child, detailBasePath)).join('')}</ul>`
    : '';

  return [
    `<li role="treeitem" aria-level="${node.depth + 1}" aria-selected="${node.selected ? 'true' : 'false'}" data-node-id="${escapeHtml(id)}" data-node-role="${escapeHtml(node.role)}">`,
    `<a class="lineage-node${node.selected ? ' lineage-node--selected' : ''}" href="${escapeHtml(href)}"${selected}${disabled}>`,
    `<span class="lineage-node__role">${escapeHtml(node.role)}</span>`,
    relation,
    `<span class="lineage-node__text">${escapeHtml(label)}</span>`,
    renderProvenance(node.provenance),
    status,
    '</a>',
    children,
    '</li>',
  ].join('');
}

function renderLineageTree(model, options = {}) {
  const detailBasePath = typeof options.detailBasePath === 'string'
    ? options.detailBasePath.replace(/\/$/, '')
    : '/inquiries';

  if (!model || model.state === VIEW_STATES.LOADING) {
    return '<section class="lineage-view" aria-busy="true"><p>系統樹を読み込んでいます。</p></section>';
  }
  if (model.state === VIEW_STATES.ERROR) {
    return `<section class="lineage-view" role="alert"><p>${escapeHtml(model.error || '系統樹を表示できません。')}</p></section>`;
  }
  if (model.state === VIEW_STATES.EMPTY || !model.tree) {
    return '<section class="lineage-view"><p>表示できる系譜はありません。</p></section>';
  }

  const warningSummary = model.warnings && model.warnings.length > 0
    ? `<p class="lineage-view__warnings" role="status">${model.warnings.length}件の参照上の問題があります。</p>`
    : '';

  return [
    '<section class="lineage-view" aria-labelledby="lineage-view-title">',
    '<h2 id="lineage-view-title">問いの系統樹</h2>',
    warningSummary,
    `<ul class="lineage-tree" role="tree" aria-label="問いの系統樹">${renderNode(model.tree, detailBasePath)}</ul>`,
    '</section>',
  ].join('');
}

module.exports = {
  escapeHtml,
  renderLineageTree,
};