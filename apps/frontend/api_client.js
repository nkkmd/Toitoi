'use strict';

function createApiClient({ baseUrl = '', fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch is not available');
  async function request(path, options) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      headers: { 'content-type': 'application/json', ...(options && options.headers) },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `API request failed (${response.status})`);
    return payload;
  }
  return {
    publishObservation(payload) { return request('/api/v1/observations', { method: 'POST', body: JSON.stringify(payload) }); },
    listAnnotations(eventId) { return request(`/api/v1/ai/events/${encodeURIComponent(eventId)}`); },
    reviewAnnotation(annotationId, action, body = {}) {
      if (!['accept', 'edit', 'reject'].includes(action)) throw new Error('Invalid review action');
      return request(`/api/v1/ai/annotations/${encodeURIComponent(annotationId)}/${action}`, { method: 'POST', body: JSON.stringify(body) });
    },
    inquiryDetail(eventId) { return request(`/api/v1/inquiries/${encodeURIComponent(eventId)}/detail`); },
  };
}

const exported = { createApiClient };
if (typeof module !== 'undefined' && module.exports) module.exports = exported;
if (typeof globalThis !== 'undefined') globalThis.Toitoi = Object.assign(globalThis.Toitoi || {}, exported);
