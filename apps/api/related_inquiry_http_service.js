'use strict';

const { URL } = require('url');
const { classifySearchResult } = require('@toitoi/protocol');

function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8' }, body };
}

function snapshotEvents(snapshot) {
  const byId = snapshot && snapshot.byId && typeof snapshot.byId === 'object' ? snapshot.byId : {};
  const orderedIds = snapshot && Array.isArray(snapshot.orderedIds) ? snapshot.orderedIds : Object.keys(byId);
  return orderedIds.map(id => byId[id]).filter(Boolean);
}

function relationTargets(event) {
  const edges = [...(Array.isArray(event.relationships) ? event.relationships : []), ...(Array.isArray(event.lineage) ? event.lineage : [])];
  return edges.map(edge => ({
    id: edge && (edge.target || edge.targetId || edge.source || edge.sourceId),
    relation: edge && (edge.relation || edge.type),
  })).filter(edge => typeof edge.id === 'string' && edge.id !== event.id);
}

function createRelatedInquiryHttpService(options = {}) {
  const getIndexSnapshot = typeof options.getIndexSnapshot === 'function'
    ? options.getIndexSnapshot
    : () => options.indexSnapshot || { byId: {}, orderedIds: [] };
  const searchService = options.searchService || null;

  function handleRequest(request = {}) {
    if (String(request.method || 'GET').toUpperCase() !== 'GET') return null;
    const parsed = new URL(request.url || '/', 'http://localhost');
    const match = parsed.pathname.match(/^\/api\/v1\/inquiries\/([^/]+)\/related$/);
    if (!match) return null;
    const inquiryId = decodeURIComponent(match[1]);
    const snapshot = getIndexSnapshot();
    const events = snapshotEvents(snapshot);
    const source = events.find(event => event.id === inquiryId);
    if (!source) return json(404, { message: 'Inquiry not found', inquiryId });

    const explicit = relationTargets(source).map(edge => ({
      id: edge.id,
      relation: edge.relation || '',
      ...classifySearchResult({ explicitRelation: true }),
    }));
    const explicitIds = new Set(explicit.map(item => item.id));
    let candidates = [];
    if (searchService && source.body && typeof source.body.text === 'string') {
      const result = searchService.projection.search({ q: source.body.text, limit: 20 });
      candidates = result.results
        .filter(item => item.id !== inquiryId && !explicitIds.has(item.id))
        .map(item => ({ ...item, ...classifySearchResult({ lexical: true }) }));
    }
    return json(200, {
      inquiryId,
      ordering: ['explicit_relation', 'related_candidate'],
      identityMerged: false,
      results: [...explicit, ...candidates],
    });
  }

  return Object.freeze({ handleRequest });
}

module.exports = { createRelatedInquiryHttpService, relationTargets, snapshotEvents };
