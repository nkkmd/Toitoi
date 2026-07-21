'use strict';

const { URL } = require('url');
const { createFts5SearchProjection } = require('./fts5_search_projection');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body,
  };
}

function parseInteger(searchParams, name, fallback) {
  const raw = searchParams.get(name);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) ? value : fallback;
}

function snapshotEvents(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const byId = snapshot.byId && typeof snapshot.byId === 'object' ? snapshot.byId : {};
  const orderedIds = Array.isArray(snapshot.orderedIds) ? snapshot.orderedIds : Object.keys(byId);
  return orderedIds.map(id => byId[id]).filter(Boolean);
}

function createSearchHttpService(options = {}) {
  const projection = options.projection || createFts5SearchProjection({
    filename: options.filename || ':memory:',
  });
  const getIndexSnapshot = typeof options.getIndexSnapshot === 'function'
    ? options.getIndexSnapshot
    : () => options.indexSnapshot || { byId: {}, orderedIds: [] };
  let indexedSignature = null;

  function ensureCurrent() {
    const snapshot = getIndexSnapshot();
    const events = snapshotEvents(snapshot);
    const signature = events.map(event => `${event.id}:${event.createdAt || ''}`).join('|');
    if (signature !== indexedSignature) {
      projection.rebuild(events);
      indexedSignature = signature;
    }
    return events;
  }

  function handleSearch(searchParams) {
    ensureCurrent();
    return json(200, projection.search({
      q: searchParams.get('q'),
      type: searchParams.get('type'),
      region: searchParams.get('region'),
      climate_zone: searchParams.get('climate_zone'),
      soil_type: searchParams.get('soil_type'),
      crop_family: searchParams.get('crop_family'),
      season: searchParams.get('season'),
      transport: searchParams.get('transport'),
      provenance: searchParams.get('provenance'),
      review_state: searchParams.get('review_state'),
      limit: parseInteger(searchParams, 'limit', 20),
      offset: parseInteger(searchParams, 'offset', 0),
    }));
  }

  function handleContexts(searchParams) {
    ensureCurrent();
    const dimension = searchParams.get('dimension') || 'region';
    try {
      return json(200, {
        dimension,
        facets: projection.facets(dimension),
      });
    } catch (error) {
      return json(400, {
        message: error.message,
        supportedDimensions: ['region', 'climate', 'soil', 'crop', 'season', 'transport', 'review_state'],
      });
    }
  }

  function handleRequest(request = {}) {
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET';
    if (method !== 'GET') return null;
    const parsed = new URL(request.url || '/', 'http://localhost');
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    if (pathname === '/api/v1/search') return handleSearch(parsed.searchParams);
    if (pathname === '/api/v1/search/contexts') return handleContexts(parsed.searchParams);
    return null;
  }

  return Object.freeze({
    ensureCurrent,
    handleContexts,
    handleRequest,
    handleSearch,
    projection,
  });
}

module.exports = {
  createSearchHttpService,
  snapshotEvents,
};
