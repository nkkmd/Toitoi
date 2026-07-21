'use strict';

const { VIEW_STATES, createInquiryDetailModel, createLineageTreeModel } = require('./inquiry_view_model');

function normalizeRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function createGenealogyViewModel({ detailResponse, treeResponse, selectedId } = {}) {
  const detail = createInquiryDetailModel(detailResponse);
  const lineage = createLineageTreeModel(treeResponse, { selectedId });
  if (detail.state !== VIEW_STATES.READY || lineage.state !== VIEW_STATES.READY) {
    return {
      state: detail.state === VIEW_STATES.ERROR || lineage.state === VIEW_STATES.ERROR
        ? VIEW_STATES.ERROR
        : VIEW_STATES.EMPTY,
      inquiry: null,
      lineage,
      distinctions: null,
      review: null,
      error: detail.error || lineage.error || null,
    };
  }

  const event = detailResponse.event;
  const publication = normalizeRecord(normalizeRecord(event.meta).publication);
  const derivation = normalizeRecord(publication.derivation);
  const ai = derivation.ai || publication.ai || null;
  const humanReview = publication.humanReview || (publication.approvedBy ? {
    reviewerId: publication.approvedBy,
    reviewedAt: publication.approvedAt,
    decision: 'approved',
  } : null);

  return {
    state: VIEW_STATES.READY,
    error: null,
    inquiry: detail.inquiry,
    lineage,
    distinctions: {
      canonicalIdentity: detail.inquiry.identity || { canonicalId: detail.inquiry.id },
      semanticRelation: {
        type: derivation.relationType || publication.relationType || null,
        sourceInquiryIds: derivation.sourceInquiryIds || publication.sourceInquiryIds || detail.inquiry.parents.map(item => item.id),
        confirmedByHuman: derivation.relationConfirmedByHuman === true
          || publication.relationConfirmedByHuman === true,
      },
      contextSimilarity: {
        contexts: detail.inquiry.contexts,
        isIdentityEvidence: false,
      },
    },
    review: {
      aiSuggestion: ai,
      humanReview,
      provenance: detail.inquiry.provenance,
    },
  };
}

module.exports = { createGenealogyViewModel };
