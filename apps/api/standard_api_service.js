'use strict';

const { URL } = require('url');
const {
  findEventsByRelationTerm,
  listEvents,
  searchEvents,
} = require('@toitoi/nostr/storage/indexer');
const {
  buildDerivedIndex,
} = require('@toitoi/nostr/storage/replay');
const {
  projectCanonicalEvent,
  projectEventDetailView,
  projectEventLookupView,
  projectLineageView,
  projectRelationView,
} = require('@toitoi/nostr/storage/standard_api_views');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeIndexSnapshot(indexSnapshot) {
  if (typeof indexSnapshot === 'function') {
    return normalizeIndexSnapshot(indexSnapshot());
  }

  if (indexSnapshot && typeof indexSnapshot === 'object') {
    return indexSnapshot;
  }

  return buildDerivedIndex([]);
}

function buildJsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
    body,
  };
}

function parseIntegerParam(searchParams, name, fallback = null) {
  const raw = searchParams.get(name);
  if (!isNonEmptyString(raw)) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) ? value : fallback;
}

function parseStringParam(searchParams, name) {
  const raw = searchParams.get(name);
  return isNonEmptyString(raw) ? raw.trim() : null;
}

function readCommonWindowOptions(searchParams) {
  return {
    limit: parseIntegerParam(searchParams, 'limit', 20),
    offset: parseIntegerParam(searchParams, 'offset', 0),
    order: parseStringParam(searchParams, 'order') === 'asc' ? 'asc' : 'desc',
  };
}

function readListFilters(searchParams) {
  return {
    ...readCommonWindowOptions(searchParams),
    q: parseStringParam(searchParams, 'q'),
    climate_zone: parseStringParam(searchParams, 'climate_zone'),
    soil_type: parseStringParam(searchParams, 'soil_type'),
    farming_context: parseStringParam(searchParams, 'farming_context'),
    crop_family: parseStringParam(searchParams, 'crop_family'),
    relationship: parseStringParam(searchParams, 'relationship'),
    type: parseStringParam(searchParams, 'type'),
    phase: parseStringParam(searchParams, 'phase'),
    dsl_model: parseStringParam(searchParams, 'dsl_model'),
    dsl_var: parseStringParam(searchParams, 'dsl_var'),
    dsl_role: parseStringParam(searchParams, 'dsl_role'),
    since: parseIntegerParam(searchParams, 'since', null),
    until: parseIntegerParam(searchParams, 'until', null),
  };
}

function hasQuerySignals(searchParams) {
  return [
    'q',
    'climate_zone',
    'soil_type',
    'farming_context',
    'crop_family',
    'relationship',
    'type',
    'phase',
    'dsl_model',
    'dsl_var',
    'dsl_role',
    'since',
    'until',
  ].some(name => isNonEmptyString(searchParams.get(name)));
}

function collectIdSet(events) {
  const ids = new Set();
  for (const event of events) {
    if (event && typeof event.id === 'string' && event.id !== '') {
      ids.add(event.id);
    }
  }
  return ids;
}

function matchesContextFilters(event, filters) {
  const contexts = event && event.contexts && typeof event.contexts === 'object'
    ? event.contexts
    : {};

  for (const [key, value] of Object.entries({
    climate_zone: filters.climate_zone,
    soil_type: filters.soil_type,
    farming_context: filters.farming_context,
    crop_family: filters.crop_family,
  })) {
    if (isNonEmptyString(value) && contexts[key] !== value) {
      return false;
    }
  }

  return true;
}

function matchesDslFilters(event, filters) {
  const models = event && event.dsl && Array.isArray(event.dsl.models)
    ? event.dsl.models
    : [];

  if (isNonEmptyString(filters.dsl_model)) {
    const hasModel = models.some(model => model && model.name === filters.dsl_model);
    if (!hasModel) {
      return false;
    }
  }

  if (isNonEmptyString(filters.dsl_var) || isNonEmptyString(filters.dsl_role)) {
    const hasVariable = models.some(model => {
      const variables = model && Array.isArray(model.variables) ? model.variables : [];
      return variables.some(variable => {
        if (!variable || typeof variable !== 'object') {
          return false;
        }
        if (isNonEmptyString(filters.dsl_var) && variable.name !== filters.dsl_var) {
          return false;
        }
        if (isNonEmptyString(filters.dsl_role) && variable.role !== filters.dsl_role) {
          return false;
        }
        return true;
      });
    });

    if (!hasVariable) {
      return false;
    }
  }

  return true;
}

function matchesCanonicalFilters(event, filters) {
  if (!event || typeof event !== 'object') {
    return false;
  }

  if (isNonEmptyString(filters.type) && event.type !== filters.type) {
    return false;
  }
  if (isNonEmptyString(filters.phase) && event.phase !== filters.phase) {
    return false;
  }

  const timestamp = Date.parse(event.createdAt);
  if (filters.since !== null && Number.isFinite(timestamp) && timestamp < filters.since * 1000) {
    return false;
  }
  if (filters.until !== null && Number.isFinite(timestamp) && timestamp > filters.until * 1000) {
    return false;
  }

  if (!matchesContextFilters(event, filters)) {
    return false;
  }
  if (!matchesDslFilters(event, filters)) {
    return false;
  }

  return true;
}

function applyCanonicalFilters(indexSnapshot, filters) {
  const ordered = listEvents(indexSnapshot, {
    limit: Number.MAX_SAFE_INTEGER,
    offset: 0,
    order: filters.order,
  }).results;

  const filtered = ordered.filter(event => matchesCanonicalFilters(event, filters));
  return {
    total: filtered.length,
    limit: filters.limit,
    offset: filters.offset,
    results: filtered,
  };
}

function projectRelationListView(indexSnapshot, searchParams) {
  const term = parseStringParam(searchParams, 'relationship');
  const filters = readCommonWindowOptions(searchParams);
  return projectRelationView(indexSnapshot, term, filters);
}

function projectQueryListView(indexSnapshot, searchParams) {
  const filters = readListFilters(searchParams);
  const query = parseStringParam(searchParams, 'q');
  const relationTerm = parseStringParam(searchParams, 'relationship');
  const filtered = applyCanonicalFilters(indexSnapshot, filters);
  let candidateEvents = filtered.results;

  if (query) {
    const searchResults = searchEvents(indexSnapshot, query, {
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    }).results;
    const searchIds = collectIdSet(searchResults);
    candidateEvents = candidateEvents.filter(event => searchIds.has(event.id));
  }

  if (relationTerm) {
    const relationResults = findEventsByRelationTerm(indexSnapshot, relationTerm, {
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    }).results;
    const relationIds = collectIdSet(relationResults);
    candidateEvents = candidateEvents.filter(event => relationIds.has(event.id));
  }

  const total = candidateEvents.length;
  const windowed = candidateEvents.slice(filters.offset, filters.offset + filters.limit);
  return {
    total,
    limit: filters.limit,
    offset: filters.offset,
    results: windowed.map(event => ({
      event: projectCanonicalEvent(event),
      provenance: projectCanonicalEvent(event).provenance,
    })),
  };
}

function createStandardApiService(options = {}) {
  const getIndexSnapshot = typeof options.getIndexSnapshot === 'function'
    ? options.getIndexSnapshot
    : () => normalizeIndexSnapshot(options.indexSnapshot);

  function getCurrentIndexSnapshot() {
    return normalizeIndexSnapshot(getIndexSnapshot());
  }

  function handleHealth() {
    return buildJsonResponse(200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  function handleInquiryLookup(eventId) {
    const indexSnapshot = getCurrentIndexSnapshot();
    const result = projectEventLookupView(indexSnapshot, eventId);
    if (!result) {
      return buildJsonResponse(404, {
        message: 'Inquiry not found',
        id: eventId,
      });
    }

    return buildJsonResponse(200, result);
  }

  function handleInquiryDetail(eventId) {
    const indexSnapshot = getCurrentIndexSnapshot();
    const result = projectEventDetailView(indexSnapshot, eventId);
    if (!result) {
      return buildJsonResponse(404, {
        message: 'Inquiry not found',
        id: eventId,
      });
    }

    return buildJsonResponse(200, result);
  }

  function handleInquiryList(searchParams) {
    const indexSnapshot = getCurrentIndexSnapshot();
    return buildJsonResponse(200, projectQueryListView(indexSnapshot, searchParams));
  }

  function handleInquiryRelation(searchParams) {
    const indexSnapshot = getCurrentIndexSnapshot();
    const term = parseStringParam(searchParams, 'relationship');
    if (!term) {
      return buildJsonResponse(400, {
        message: 'Missing relationship term',
        hint: 'Provide relationship=... in the query string.',
      });
    }

    return buildJsonResponse(200, projectRelationListView(indexSnapshot, searchParams));
  }

  function handleInquiryQuery(searchParams) {
    if (!hasQuerySignals(searchParams)) {
      return buildJsonResponse(400, {
        message: 'At least one query parameter is required',
        hint: 'Use /api/v1/inquiries for the full list.',
      });
    }

    const indexSnapshot = getCurrentIndexSnapshot();
    return buildJsonResponse(200, projectQueryListView(indexSnapshot, searchParams));
  }

  function handleInquiryTree(eventId) {
    const indexSnapshot = getCurrentIndexSnapshot();
    const result = projectLineageView(indexSnapshot, eventId);
    if (!result) {
      return buildJsonResponse(404, {
        message: 'Inquiry not found',
        id: eventId,
      });
    }

    return buildJsonResponse(200, result);
  }

  function handleRequest(request = {}) {
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET';
    if (method !== 'GET') {
      return buildJsonResponse(405, {
        message: 'Method not allowed',
      });
    }

    const rawUrl = typeof request.url === 'string' && request.url !== '' ? request.url : '/';
    const parsedUrl = new URL(rawUrl, 'http://localhost');
    const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

    if (pathname === '/health') {
      return handleHealth();
    }

    if (pathname === '/api/v1/inquiries') {
      return handleInquiryList(parsedUrl.searchParams);
    }

    if (pathname === '/api/v1/inquiries/query') {
      return handleInquiryQuery(parsedUrl.searchParams);
    }

    if (pathname === '/api/v1/inquiries/relation') {
      return handleInquiryRelation(parsedUrl.searchParams);
    }

    const treeMatch = pathname.match(/^\/api\/v1\/inquiries\/([^/]+)\/tree$/);
    if (treeMatch) {
      return handleInquiryTree(decodeURIComponent(treeMatch[1]));
    }

    const detailMatch = pathname.match(/^\/api\/v1\/inquiries\/([^/]+)\/detail$/);
    if (detailMatch) {
      return handleInquiryDetail(decodeURIComponent(detailMatch[1]));
    }

    const lookupMatch = pathname.match(/^\/api\/v1\/inquiries\/([^/]+)$/);
    if (lookupMatch) {
      return handleInquiryLookup(decodeURIComponent(lookupMatch[1]));
    }

    return buildJsonResponse(404, {
      message: 'Not found',
      path: pathname,
    });
  }

  return {
    handleHealth,
    handleInquiryDetail,
    handleInquiryList,
    handleInquiryLookup,
    handleInquiryQuery,
    handleInquiryRelation,
    handleInquiryTree,
    handleRequest,
  };
}

module.exports = {
  buildJsonResponse,
  createStandardApiService,
  hasQuerySignals,
  normalizeIndexSnapshot,
  parseIntegerParam,
  parseStringParam,
  projectQueryListView,
  projectRelationListView,
  readCommonWindowOptions,
  readListFilters,
};
