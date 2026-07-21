'use strict';

const { URL } = require('url');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body,
  };
}

function createVocabularyHttpService(options = {}) {
  const terms = Array.isArray(options.terms) ? options.terms.slice() : [];
  const mappings = Array.isArray(options.mappings) ? options.mappings.slice() : [];

  function handleRequest(request = {}) {
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET';
    if (method !== 'GET') return null;
    const parsed = new URL(request.url || '/', 'http://localhost');
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';

    if (pathname === '/api/v1/vocabulary/terms') {
      const layer = parsed.searchParams.get('layer');
      const language = parsed.searchParams.get('language');
      const locality = parsed.searchParams.get('locality');
      const results = terms.filter(term => {
        if (layer && term.layer !== layer) return false;
        if (language && term.language !== language) return false;
        if (locality && term.locality !== locality) return false;
        return true;
      });
      return json(200, { total: results.length, results });
    }

    if (pathname === '/api/v1/vocabulary/mappings') {
      const source = parsed.searchParams.get('source');
      const target = parsed.searchParams.get('target');
      const status = parsed.searchParams.get('status');
      const results = mappings.filter(mapping => {
        if (source && mapping.sourceTermId !== source) return false;
        if (target && mapping.targetTermId !== target) return false;
        if (status && mapping.status !== status) return false;
        return true;
      });
      return json(200, {
        total: results.length,
        results,
        identityPolicy: 'vocabulary mappings never merge Canonical Event identity',
      });
    }

    return null;
  }

  return Object.freeze({ handleRequest, mappings, terms });
}

module.exports = { createVocabularyHttpService };
