'use strict';

const assert = require('node:assert/strict');
const { createMemoryWorkflowService, createWorkflowHttpService } = require('./workflow_http_service');

const annotation = {
  id: 'annotation-1',
  eventId: 'tt:evt:observation-1',
  task: 'generate_inquiries',
  model: 'deterministic',
  modelVersion: '1',
  promptVersion: 'inquiry-generation-v0.1.0',
  createdAt: '2026-07-20T00:01:00.000Z',
  generatedAt: '2026-07-20T00:01:00.000Z',
  reviewState: 'accepted',
  reviewedAt: '2026-07-20T00:02:00.000Z',
  reviewedBy: 'human:field-worker',
  output: {
    candidates: [{
      inquiry: '土壌水分と葉のしおれ方にはどのような関係があるか？',
      context: { language: 'ja', crop_family: 'solanaceae' },
      observation: '午後に葉がしおれた',
      relationship: 'derived_from',
      uncertainty: '土壌水分は未計測',
      tags: ['soil-moisture'],
      source_refs: ['tt:evt:observation-1'],
    }],
  },
};

function request(service, method, url, body) {
  return service.handleRequest({ method, url, body });
}

function run() {
  const timestamps = [
    '2026-07-20T00:00:00.000Z',
    '2026-07-20T00:03:00.000Z',
    '2026-07-20T00:04:00.000Z',
    '2026-07-20T00:05:00.000Z',
    '2026-07-20T00:06:00.000Z',
  ];
  const workflow = createMemoryWorkflowService({
    annotationService: { getAnnotation: (id) => id === annotation.id ? annotation : null },
    now: () => timestamps.shift() || '2026-07-20T00:07:00.000Z',
  });
  const http = createWorkflowHttpService({ workflowService: workflow });

  const observation = request(http, 'POST', '/api/v1/observations', {
    text: '午後にトマトの葉がしおれた', language: 'ja', sensitive: { location: true },
  });
  assert.equal(observation.statusCode, 201);
  assert.equal(observation.body.meta.visibility, 'private');
  assert.equal(observation.body.meta.localOnly, true);

  const promoted = request(http, 'POST', '/api/v1/ai/annotations/annotation-1/promote', {
    authorId: 'human:field-worker', candidateIndex: 0,
  });
  assert.equal(promoted.statusCode, 201);
  assert.equal(promoted.body.status, 'draft');
  assert.equal(promoted.body.derivation.sourceInquiryId, 'tt:evt:observation-1');

  const draftId = promoted.body.id;
  const earlyPublish = request(http, 'POST', `/api/v1/inquiry-drafts/${encodeURIComponent(draftId)}/publish`, {});
  assert.equal(earlyPublish.statusCode, 409);

  const submitted = request(http, 'POST', `/api/v1/inquiry-drafts/${encodeURIComponent(draftId)}/submit`, {});
  assert.equal(submitted.body.status, 'in_review');

  const approved = request(http, 'POST', `/api/v1/inquiry-drafts/${encodeURIComponent(draftId)}/approve`, {
    reviewerId: 'human:reviewer', note: '公開対象を確認した',
  });
  assert.equal(approved.body.status, 'approved');
  assert.equal(approved.body.review.reviewerId, 'human:reviewer');

  const published = request(http, 'POST', `/api/v1/inquiry-drafts/${encodeURIComponent(draftId)}/publish`, {});
  assert.equal(published.statusCode, 201);
  assert.equal(published.body.type, 'inquiry');
  assert.equal(published.body.meta.publication.draftId, draftId);
  assert.equal(published.body.lineage[0].sourceId, 'tt:evt:observation-1');

  const fetched = request(http, 'GET', `/api/v1/publications/${encodeURIComponent(published.body.id)}`);
  assert.deepEqual(fetched.body, published.body);

  const missing = request(http, 'POST', '/api/v1/ai/annotations/missing/promote', {});
  assert.equal(missing.statusCode, 404);

  console.log('v0.6.0 workflow HTTP service passed');
}

run();
