'use strict';

const assert = require('assert');
const { createAiReviewViewModel } = require('./ai_review_model');
const { renderAiReview } = require('./ai_review_renderer');

const payload = {
  eventId: 'tt:evt:field-east-001',
  annotations: [
    {
      id: 'ann-summary-1',
      eventId: 'tt:evt:field-east-001',
      task: 'summarize',
      output: { summary: '東側だけ雑草相が異なる観察。' },
      model: 'fake-local-model',
      promptVersion: 'summary-v1',
      reviewState: 'accepted',
      reviewedAt: '2026-07-16T11:00:00.000Z',
    },
    {
      id: 'ann-tags-1',
      eventId: 'tt:evt:field-east-001',
      task: 'tag',
      output: { tags: ['雑草相', '<microclimate>'] },
      model: 'fake-local-model',
      promptVersion: 'tag-v1',
      reviewState: 'unreviewed',
    },
  ],
};

const model = createAiReviewViewModel(payload);
assert.strictEqual(model.state, 'ready');
assert.strictEqual(model.cards[0].isHumanReviewed, true);
assert.strictEqual(model.cards[0].canPromoteToDraft, true);
assert.strictEqual(model.cards[1].canPromoteToDraft, false);

const html = renderAiReview(model);
assert.ok(html.includes('AIによる注釈'));
assert.ok(html.includes('確認済み'));
assert.ok(html.includes('公開には別途、人間によるDraft承認が必要です'));
assert.ok(html.includes('&lt;microclimate&gt;'));
assert.ok(!html.includes('<microclimate>'));

const empty = createAiReviewViewModel({ eventId: payload.eventId, annotations: [] });
assert.strictEqual(empty.state, 'empty');
assert.ok(renderAiReview(empty).includes('AIによる注釈がありません'));

console.log('PASS AI annotations render as reviewable provenance, not published inquiries');
