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

function inferRelationToParent(node, parentId) {
  if (!parentId) {
    return null;
  }

  const relation = toRelationshipItems(node && node.relationships)
    .find(item => item.target === parentId);
  return relation ? relation.source || null : null;
}

function createLineageTreeModel(treeResponse, options = {}) {
  if (!treeResponse || typeof treeResponse !== 'object' || !treeResponse.id) {
    return { state: VIEW_STATES.EMPTY, tree: null, nodes: [], selectedId: null, warnings: [], error: null };
  }

  const selectedId = typeof options.selectedId === 'string' ? options.selectedId : treeResponse.id;
  const warnings = [];
  const flatNodes = [];

  function visit(node, depth, parentId, path) {
    if (!node || typeof node !== 'object' || typeof node.id !== 'string' || !node.id) {
      const missing = {
        id: null,
        parentId,
        depth,
        role: depth === 0 ? 'root' : 'missing',
        relationToParent: null,
        text: '',
        type: 'inquiry',
        createdAt: null,
        provenance: toProvenanceModel(null),
        selected: false,
        status: 'missing',
        children: [],
      };
      warnings.push({ type: 'missing-reference', parentId });
      flatNodes.push(missing);
      return missing;
    }

    if (path.has(node.id)) {
      const cyclic = {
        id: node.id,
        parentId,
        depth,
        role: 'cycle',
        relationToParent: inferRelationToParent(node, parentId),
        text: node.body && node.body.text ? node.body.text : '',
        type: node.type || 'inquiry',
        createdAt: node.createdAt || null,
        provenance: toProvenanceModel(node.provenance),
        selected: node.id === selectedId,
        status: 'cycle',
        children: [],
      };
      warnings.push({ type: 'cycle', id: node.id, parentId });
      flatNodes.push(cyclic);
      return cyclic;
    }

    const nextPath = new Set(path);
    nextPath.add(node.id);
    const children = normalizeArray(node.children);
    const model = {
      id: node.id,
      parentId,
      depth,
      role: depth === 0 ? 'root' : children.length > 0 ? 'branch' : 'leaf',
      relationToParent: inferRelationToParent(node, parentId),
      text: node.body && node.body.text ? node.body.text : '',
      type: node.type || 'inquiry',
      createdAt: node.createdAt || null,
      provenance: toProvenanceModel(node.provenance),
      selected: node.id === selectedId,
      status: 'available',
      children: [],
    };
    flatNodes.push(model);
    model.children = children.map(child => visit(child, depth + 1, node.id, nextPath));
    return model;
  }

  const tree = visit(treeResponse, 0, null, new Set());
  const resolvedSelectedId = flatNodes.some(node => node.id === selectedId) ? selectedId : tree.id;
  for (const node of flatNodes) {
    node.selected = node.id === resolvedSelectedId;
  }

  return {
    state: VIEW_STATES.READY,
    tree,
    nodes: flatNodes,
    selectedId: resolvedSelectedId,
    warnings,
    error: null,
  };
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