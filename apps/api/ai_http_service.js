'use strict';

const { URL } = require('url');

function buildJsonResponse(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8' }, body };
}

function parseBody(body) {
  if (body == null) return {};
  if (typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  try { return JSON.parse(String(body)); } catch (error) {
    throw new TypeError(`request body must be valid JSON: ${error.message}`);
  }
}

function createAiHttpService({ inspectionService, reviewService = null }) {
  if (!inspectionService || typeof inspectionService.listJobs !== 'function') {
    throw new TypeError('inspectionService is required');
  }

  function handleRequest(request = {}) {
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET';
    const parsedUrl = new URL(request.url || '/', 'http://localhost');
    const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
    if (!pathname.startsWith('/api/v1/ai/')) return null;

    try {
      const reviewMatch = pathname.match(/^\/api\/v1\/ai\/annotations\/([^/]+)\/(accept|edit|reject)$/);
      if (reviewMatch) {
        if (method !== 'POST') return buildJsonResponse(405, { message: 'Method not allowed' });
        if (!reviewService) return buildJsonResponse(503, { message: 'AI review mutations are not configured' });
        const id = decodeURIComponent(reviewMatch[1]);
        const action = reviewMatch[2];
        return buildJsonResponse(200, reviewService[action](id, parseBody(request.body)));
      }

      if (method !== 'GET') return buildJsonResponse(405, { message: 'Method not allowed' });
      if (pathname === '/api/v1/ai/jobs') {
        return buildJsonResponse(200, { results: inspectionService.listJobs({
          state: parsedUrl.searchParams.get('state'), eventId: parsedUrl.searchParams.get('event_id'),
        }) });
      }
      const jobMatch = pathname.match(/^\/api\/v1\/ai\/jobs\/([^/]+)$/);
      if (jobMatch) {
        const id = decodeURIComponent(jobMatch[1]);
        const job = inspectionService.getJob(id);
        return job ? buildJsonResponse(200, job) : buildJsonResponse(404, { message: 'AI job not found', id });
      }
      if (pathname === '/api/v1/ai/annotations') {
        return buildJsonResponse(200, { results: inspectionService.listAnnotations({
          eventId: parsedUrl.searchParams.get('event_id'),
          task: parsedUrl.searchParams.get('task'),
          reviewState: parsedUrl.searchParams.get('review_state'),
        }) });
      }
      const annotationMatch = pathname.match(/^\/api\/v1\/ai\/annotations\/([^/]+)$/);
      if (annotationMatch) {
        const id = decodeURIComponent(annotationMatch[1]);
        const annotation = inspectionService.getAnnotation(id);
        return annotation ? buildJsonResponse(200, annotation)
          : buildJsonResponse(404, { message: 'AI annotation not found', id });
      }
      const eventMatch = pathname.match(/^\/api\/v1\/ai\/events\/([^/]+)$/);
      if (eventMatch) return buildJsonResponse(200, inspectionService.getEventAiView(decodeURIComponent(eventMatch[1])));
      return buildJsonResponse(404, { message: 'Not found', path: pathname });
    } catch (error) {
      const statusCode = /not found/.test(error.message) ? 404 : 400;
      return buildJsonResponse(statusCode, { message: error.message });
    }
  }

  return Object.freeze({ handleRequest });
}

module.exports = { createAiHttpService, parseBody };