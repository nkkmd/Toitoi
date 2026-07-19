'use strict';

const { createDerivedInquiryDraft } = require('@toitoi/protocol/derived_inquiry');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function promoteAcceptedAnnotationsToInquiryDraft({
  id, eventId, candidate, annotations, createdAt, authorId, relationType = 'derived_from',
}) {
  if (!isNonEmptyString(eventId)) throw new TypeError('eventId must be a non-empty string');
  if (!Array.isArray(annotations) || annotations.length === 0) {
    throw new TypeError('annotations must be a non-empty array');
  }

  const annotationRefs = annotations.map((annotation) => {
    if (!annotation || typeof annotation !== 'object' || Array.isArray(annotation)) {
      throw new TypeError('annotations[] must be an object');
    }
    if (!isNonEmptyString(annotation.id)) throw new TypeError('annotations[].id must be a non-empty string');
    if (annotation.eventId !== eventId) throw new Error(`annotation ${annotation.id} belongs to a different event`);
    if (!['accepted', 'edited'].includes(annotation.reviewState)) {
      throw new Error(`annotation ${annotation.id} must be accepted or edited before promotion`);
    }

    return {
      annotationId: annotation.id,
      eventId: annotation.eventId,
      task: annotation.task,
      model: annotation.model,
      modelVersion: annotation.modelVersion || null,
      promptVersion: annotation.promptVersion,
      createdAt: annotation.createdAt,
      generatedAt: annotation.generatedAt || annotation.createdAt,
      reviewState: annotation.reviewState,
      reviewedAt: annotation.reviewedAt || null,
      reviewedBy: annotation.reviewedBy || null,
    };
  });

  const promotedCandidate = clone(candidate);
  promotedCandidate.meta = promotedCandidate.meta && typeof promotedCandidate.meta === 'object'
    ? promotedCandidate.meta : {};
  promotedCandidate.meta.aiPromotion = {
    sourceEventId: eventId,
    annotationRefs,
    requiresHumanReview: true,
  };

  return createDerivedInquiryDraft({
    id,
    sourceInquiryId: eventId,
    relationType,
    candidate: promotedCandidate,
    createdAt,
    authorId,
    ai: { involved: true, operation: 'annotation-promotion', annotationRefs },
  });
}

function promoteInquiryCandidate({ annotation, candidateIndex = 0, ...draftInput }) {
  if (!annotation || annotation.task !== 'generate_inquiries') {
    throw new TypeError('annotation must be a generate_inquiries annotation');
  }
  const generated = annotation.output?.candidates?.[candidateIndex];
  if (!generated) throw new RangeError(`inquiry candidate not found: ${candidateIndex}`);
  const candidate = {
    type: 'inquiry',
    content: generated.inquiry,
    context: generated.context,
    tags: generated.tags,
    meta: {
      observation: generated.observation,
      relationship: generated.relationship,
      uncertainty: generated.uncertainty,
      sourceRefs: generated.source_refs,
    },
  };
  return promoteAcceptedAnnotationsToInquiryDraft({
    ...draftInput,
    eventId: annotation.eventId,
    candidate,
    annotations: [annotation],
  });
}

module.exports = { promoteAcceptedAnnotationsToInquiryDraft, promoteInquiryCandidate };