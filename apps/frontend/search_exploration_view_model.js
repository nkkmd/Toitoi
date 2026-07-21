'use strict';

function buildSearchRequest(state = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({
    q: state.query,
    region: state.region,
    climate_zone: state.climate,
    soil_type: state.soil,
    crop_family: state.crop,
    season: state.season,
    transport: state.transport,
    review_state: state.reviewState,
  })) {
    if (typeof value === 'string' && value.trim()) params.set(key, value.trim());
  }
  return `/api/v1/search?${params.toString()}`;
}

function toResultCard(result = {}) {
  return Object.freeze({
    id: result.id || '',
    classification: result.classification || 'related_candidate',
    identityMerged: result.identityMerged === true,
    context: [result.region, result.climate, result.soil, result.crop, result.season].filter(Boolean),
    provenance: result.provenance || '',
    transport: result.transport || '',
    reviewState: result.reviewState || '',
  });
}

function createSearchExplorationViewModel(options = {}) {
  const fetchJson = options.fetchJson;
  if (typeof fetchJson !== 'function') throw new TypeError('fetchJson must be a function');

  async function search(state = {}) {
    const response = await fetchJson(buildSearchRequest(state));
    return Object.freeze({
      total: Number(response.total || 0),
      results: Array.isArray(response.results) ? response.results.map(toResultCard) : [],
      filters: Object.freeze({ ...state }),
    });
  }

  async function contexts(dimension) {
    const response = await fetchJson(`/api/v1/search/contexts?dimension=${encodeURIComponent(dimension)}`);
    return Array.isArray(response.facets) ? response.facets.slice() : [];
  }

  async function related(inquiryId) {
    const response = await fetchJson(`/api/v1/inquiries/${encodeURIComponent(inquiryId)}/related`);
    return Object.freeze({
      inquiryId: response.inquiryId,
      identityMerged: response.identityMerged === true,
      results: Array.isArray(response.results) ? response.results.map(toResultCard) : [],
    });
  }

  return Object.freeze({ buildSearchRequest, contexts, related, search });
}

module.exports = { buildSearchRequest, createSearchExplorationViewModel, toResultCard };
