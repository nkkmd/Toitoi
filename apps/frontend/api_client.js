'use strict';

function createApiClient({ baseUrl = '', fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch is not available');
  async function request(path, options) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      headers: { 'content-type': 'application/json', ...(options && options.headers) },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.error || `API request failed (${response.status})`);
    return payload;
  }
  const post = (path, body = {}) => request(path, { method: 'POST', body: JSON.stringify(body) });
  return {
    publishObservation(payload) { return post('/api/v1/observations', payload); },
    listAnnotations(eventId) { return request(`/api/v1/ai/events/${encodeURIComponent(eventId)}`); },
    reviewAnnotation(annotationId, action, body = {}) {
      if (!['accept', 'edit', 'reject'].includes(action)) throw new Error('Invalid review action');
      return post(`/api/v1/ai/annotations/${encodeURIComponent(annotationId)}/${action}`, body);
    },
    promoteAnnotation(annotationId, body = {}) {
      return post(`/api/v1/ai/annotations/${encodeURIComponent(annotationId)}/promote`, body);
    },
    getDraft(draftId) { return request(`/api/v1/inquiry-drafts/${encodeURIComponent(draftId)}`); },
    submitDraft(draftId, body = {}) { return post(`/api/v1/inquiry-drafts/${encodeURIComponent(draftId)}/submit`, body); },
    approveDraft(draftId, body = {}) { return post(`/api/v1/inquiry-drafts/${encodeURIComponent(draftId)}/approve`, body); },
    rejectDraft(draftId, body = {}) { return post(`/api/v1/inquiry-drafts/${encodeURIComponent(draftId)}/reject`, body); },
    publishDraft(draftId, body = {}) { return post(`/api/v1/inquiry-drafts/${encodeURIComponent(draftId)}/publish`, body); },
    getPublication(eventId) { return request(`/api/v1/publications/${encodeURIComponent(eventId)}`); },
    inquiryDetail(eventId) { return request(`/api/v1/inquiries/${encodeURIComponent(eventId)}/detail`); },
  };
}

const exported = { createApiClient };
if (typeof module !== 'undefined' && module.exports) module.exports = exported;
if (typeof globalThis !== 'undefined') globalThis.Toitoi = Object.assign(globalThis.Toitoi || {}, exported);
