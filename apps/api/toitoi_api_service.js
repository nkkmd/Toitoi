'use strict';

const { createAiHttpService } = require('./ai_http_service');
const { createStandardApiService } = require('./standard_api_service');
const { createWorkflowHttpService } = require('./workflow_http_service');

function createToitoiApiService(options = {}) {
  const standardService = options.standardService || createStandardApiService(options);
  const aiService = options.aiInspectionService
    ? createAiHttpService({
      inspectionService: options.aiInspectionService,
      reviewService: options.aiReviewService || null,
    })
    : null;
  const workflowService = options.workflowService
    ? createWorkflowHttpService({ workflowService: options.workflowService })
    : null;

  async function handleRequest(request = {}) {
    if (workflowService) {
      const workflowResult = await workflowService.handleRequest(request);
      if (workflowResult) return workflowResult;
    }
    if (aiService) {
      const aiResult = aiService.handleRequest(request);
      if (aiResult) return aiResult;
    }
    return standardService.handleRequest(request);
  }

  return Object.freeze({
    handleRequest,
    standardService,
    aiService,
    workflowService,
  });
}

module.exports = { createToitoiApiService };
