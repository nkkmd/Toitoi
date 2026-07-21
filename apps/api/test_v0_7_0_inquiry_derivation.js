'use strict';

const assert = require('node:assert/strict');
const { DERIVATION_TYPES, normalizeRelationDetails } = require('@toitoi/protocol');
const { createMemoryWorkflowService, createWorkflowHttpService } = require('./workflow_http_service');

async function run() {
  assert.deepEqual(DERIVATION_TYPES, [
    'derived_from',
    'translated_from',
    'observed_alongside',
    'contrasts_with',
    'synthesizes',
    'reframes',
    'annotates',
    'revises',
  ]);
  assert.throws(() => normalizeRelationDetails('translated_from', {
    sourceLanguage: 'ja', targetLanguage: 'ja',
  }, { strict: true }), /different targetLanguage/);
  assert.throws(() => normalizeRelationDetails('synthesizes', {
    sourceInquiryIds: ['tt:evt:a'],
  }, { strict: true }), /at least two/);

  const workflow = createMemoryWorkflowService({
    now: () => '2026-07-21T00:00:00.000Z',
  });
  const http = createWorkflowHttpService({ workflowService: workflow });
  const response = await http.handleRequest({
    method: 'POST',
    url: '/api/v1/inquiries/tt%3Aevt%3Asource-1/derive',
    body: {
      relationType: 'contrasts_with',
      relationConfirmedByHuman: true,
      relationDetails: { rationale: 'Different soil moisture response' },
      text: 'Why did the same crop respond differently in the drier plot?',
      language: 'en',
      authorId: 'human:field-worker',
      aiSuggestion: { suggestedRelationType: 'reframes', model: 'deterministic' },
    },
  });
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.status, 'draft');
  assert.equal(response.body.derivation.relationType, 'contrasts_with');
  assert.equal(response.body.derivation.relationConfirmedByHuman, true);
  assert.equal(response.body.derivation.ai.suggestedRelationType, 'reframes');
  assert.equal(response.body.candidate.lineage[0].target, 'tt:evt:source-1');

  const invalid = await http.handleRequest({
    method: 'POST',
    url: '/api/v1/inquiries/tt%3Aevt%3Asource-1/derive',
    body: {
      relationType: 'revises',
      relationConfirmedByHuman: true,
      relationDetails: {},
      text: 'Revision without summary',
      language: 'en',
    },
  });
  assert.equal(invalid.statusCode, 400);
  assert.match(invalid.body.message, /revisionSummary/);

  console.log('v0.7.0 inquiry derivation workflow passed');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
