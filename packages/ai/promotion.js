'use strict';

const { createInquiryDraft } = require('@toitoi/protocol/inquiry_draft');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function promoteAcceptedAnnotationsToInquiryDraft({
  id,
  eventId,
  candidate,
  annotations,
  createdAt,
}) {
  if (!isNonEmptyString(eventId)) {
    throw new TypeError('eventId must be a non-empty string');
  }
  if (!Array.isArray(annotations) || annotations.length === 0) {
    throw new TypeError('annotations must be a non-empty array');
  }

  const annotationRefs = annotations.map((annotation) => {
    if (!annotation || typeof annotation !== 'object' || Array.isArray(annotation)) {
      throw new TypeError('annotations[] must be an object');
    }
    if (!isNonEmptyString(annotation.id)) {
      throw new TypeError('annotations[].id must be a non-empty string');
    }
    if (annotation.eventId !== eventId) {
      throw new Error(`annotation ${annotation.id} belongs to a different event`);
    }
    if (annotation.reviewState !== 'accepted') {
      throw new Error(`annotation ${annotation.id} must be accepted before promotion`);
    }

    return {
      annotationId: annotation.id,
      eventId: annotation.eventId,
      task: annotation.task,
      model: annotation.model,
      promptVersion: annotation.promptVersion,
      createdAt: annotation.createdAt,
      reviewState: annotation.reviewState,
      reviewedAt: annotation.reviewedAt || null,
    };
  });

  const promotedCandidate = clone(candidate);
  promotedCandidate.meta = promotedCandidate.meta && typeof promotedCandidate.meta === 'object'
    ? promotedCandidate.meta
    : {};
  promotedCandidate.meta.aiPromotion = {
    sourceEventId: eventId,
    annotationRefs,
    requiresHumanReview: true,
  };

  return createInquiryDraft({
    id,
    candidate: promotedCandidate,
    createdAt,
  });
}

module.exports = { promoteAcceptedAnnotationsToInquiryDraft };
