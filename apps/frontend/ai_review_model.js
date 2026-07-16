'use strict';

const REVIEW_LABELS = Object.freeze({
  unreviewed: '未確認',
  accepted: '確認済み',
  edited: '修正して採用',
  rejected: '不採用',
});

function createAiReviewViewModel(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { state: 'error', message: 'AI annotation response is invalid.' };
  }

  const annotations = Array.isArray(payload.annotations) ? payload.annotations : [];
  if (annotations.length === 0) {
    return {
      state: 'empty',
      eventId: payload.eventId || null,
      message: 'この問いにはAIによる注釈がありません。',
      cards: [],
    };
  }

  return {
    state: 'ready',
    eventId: payload.eventId || annotations[0].eventId || null,
    cards: annotations.map(projectAnnotation),
  };
}

function projectAnnotation(annotation) {
  const reviewState = REVIEW_LABELS[annotation.reviewState]
    ? annotation.reviewState
    : 'unreviewed';
  const output = annotation.output && typeof annotation.output === 'object'
    ? annotation.output
    : {};

  return {
    id: annotation.id,
    task: annotation.task,
    summary: typeof output.summary === 'string' ? output.summary : null,
    tags: Array.isArray(output.tags) ? output.tags.filter(tag => typeof tag === 'string') : [],
    model: annotation.model || 'unknown',
    promptVersion: annotation.promptVersion || 'unknown',
    reviewState,
    reviewLabel: REVIEW_LABELS[reviewState],
    reviewedAt: annotation.reviewedAt || null,
    reviewNote: annotation.reviewNote || null,
    isHumanReviewed: reviewState !== 'unreviewed',
    canPromoteToDraft: reviewState === 'accepted' || reviewState === 'edited',
    notice: reviewState === 'accepted' || reviewState === 'edited'
      ? 'この注釈はInquiry Draftの材料にできます。公開には別途、人間によるDraft承認が必要です。'
      : 'この注釈は公開済みの問いではありません。',
  };
}

module.exports = { REVIEW_LABELS, createAiReviewViewModel, projectAnnotation };
