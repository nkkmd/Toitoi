'use strict';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderAiReview(model) {
  if (!model || model.state === 'error') {
    return '<section aria-label="AI annotations"><p>AI注釈を表示できません。</p></section>';
  }
  if (model.state === 'empty') {
    return `<section aria-label="AI annotations"><p>${escapeHtml(model.message)}</p></section>`;
  }

  const cards = model.cards.map(card => {
    const content = card.summary
      ? `<p>${escapeHtml(card.summary)}</p>`
      : `<ul>${card.tags.map(tag => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>`;
    return `<article data-annotation-id="${escapeHtml(card.id)}">
  <h3>${escapeHtml(card.task === 'summarize' ? 'AI要約' : 'AIタグ候補')}</h3>
  ${content}
  <dl>
    <dt>確認状態</dt><dd>${escapeHtml(card.reviewLabel)}</dd>
    <dt>モデル</dt><dd>${escapeHtml(card.model)}</dd>
    <dt>プロンプト版</dt><dd>${escapeHtml(card.promptVersion)}</dd>
  </dl>
  <p>${escapeHtml(card.notice)}</p>
</article>`;
  }).join('');

  return `<section aria-label="AI annotations"><h2>AIによる注釈</h2>${cards}</section>`;
}

module.exports = { escapeHtml, renderAiReview };
