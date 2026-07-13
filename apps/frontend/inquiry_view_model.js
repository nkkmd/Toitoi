'use strict';

const VIEW_STATES = Object.freeze({
  LOADING: 'loading',
  EMPTY: 'empty',
  READY: 'ready',
  ERROR: 'error',
});

function normalizeRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toContextItems(contexts) {
  return Object.entries(normalizeRecord(contexts)).map(([key, value]) => ({ key, value }));
}

function toRelationshipItems(relationships) {
  return normalizeArray(relationships).map(relation => ({
    source: relation && typeof relation.source === 'string' ? relation.source : '',
    target: relation && typeof relation.target === 'string' ? relation.target : '',
  })).filter(relation => relation.source || relation.target);
}

function toReferenceItems(events) {
  return normalizeArray(events).map(event => ({
    id: event.id,
    text: event.body && event.body.text ? event.body.text : '',
    type: event.type || 'inquiry',
    createdAt: event.createdAt || null,
  }));
}

function toProvenanceModel(provenance) {
  const source = normalizeRecord(provenance);
  return {
    sourceCount: Number.isInteger(source.sourceCount) ? source.sourceCount : 0,
    protocols: normalizeArray(source.sourceProtocols).slice(),
    sourceIds: normalizeArray(source.sourceIds).slice(),
    rawRef: source.rawRef || null,
  };
}

function createInquiryDetailModel(detailResponse) {
  if (!detailResponse || typeof detailResponse !== 'object' || !detailResponse.event) {
    return { state: VIEW_STATES.EMPTY, inquiry: null, error: null };
  }

  const event = detailResponse.event;
  const references = normalizeRecord(detailResponse.references);

  return {
    state: VIEW_STATES.READY,
    error: null,
    inquiry: {
      id: event.id,
      type: event.type || 'inquiry',
      text: event.body && event.body.text ? event.body.text : '',
      language: event.body && event.body.language ? event.body.language : null,
      createdAt: event.createdAt || null,
      phase: event.phase || null,
      contexts: toContextItems(event.contexts),
      relationships: toRelationshipItems(event.relationships),
      trigger: event.trigger || null,
      provenance: toProvenanceModel(event.provenance),
      parents: toReferenceItems(references.parents),
      children: toReferenceItems(references.children),
      identity: event.identity || null,
    },
  };
}

function createLineageTreeModel(treeResponse) {
  if (!treeResponse || typeof treeResponse !== 'object' || !treeResponse.id) {
    return { state: VIEW_STATES.EMPTY, tree: null, error: null };
  }

  function visit(node, depth) {
    return {
      id: node.id,
      depth,
      text: node.body && node.body.text ? node.body.text : '',
      type: node.type || 'inquiry',
      children: normalizeArray(node.children).map(child => visit(child, depth + 1)),
    };
  }

  return { state: VIEW_STATES.READY, tree: visit(treeResponse, 0), error: null };
}

function createLoadingModel() {
  return { state: VIEW_STATES.LOADING, inquiry: null, error: null };
}

function createErrorModel(error) {
  return {
    state: VIEW_STATES.ERROR,
    inquiry: null,
    error: error instanceof Error ? error.message : String(error || 'Unknown error'),
  };
}

module.exports = {
  VIEW_STATES,
  createErrorModel,
  createInquiryDetailModel,
  createLineageTreeModel,
  createLoadingModel,
};
