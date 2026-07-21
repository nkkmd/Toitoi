'use strict';

const { createAiHttpService } = require('./ai_http_service');
const { createStandardApiService } = require('./standard_api_service');
const { createWorkflowHttpService } = require('./workflow_http_service');

function createToitoiApiService(options = {}) {
  const standardService = options.standardService || createStandardApiService(options);
  const searchService = options.searchService || null;
  const vocabularyService = options.vocabularyService || null;
  const relatedInquiryService = options.relatedInquiryService || null;
  const aiService = options.aiInspectionService
    ? createAiHttpService({
      inspectionService: options.aiInspectionService,
      reviewService: options.aiReviewService || null,
    })
    : null;
  const workflowService = options.workflowService
    ? createWorkflowHttpService({ workflowService: options.workflowService })
    : null;

  function fallback(request) {
    if (relatedInquiryService) {
      const relatedResult = relatedInquiryService.handleRequest(request);
      if (relatedResult) return relatedResult;
    }
    if (searchService) {
      const searchResult = searchService.handleRequest(request);
      if (searchResult) return searchResult;
    }
    if (vocabularyService) {
      const vocabularyResult = vocabularyService.handleRequest(request);
      if (vocabularyResult) return vocabularyResult;
    }
    if (aiService) {
      const aiResult = aiService.handleRequest(request);
      if (aiResult) return aiResult;
    }
    return standardService.handleRequest(request);
  }

  function handleRequest(request = {}) {
    if (!workflowService) return fallback(request);
    const workflowResult = workflowService.handleRequest(request);
    if (workflowResult && typeof workflowResult.then === 'function') {
      return workflowResult.then((resolved) => resolved || fallback(request));
    }
    return workflowResult || fallback(request);
  }

  return Object.freeze({
    handleRequest,
    standardService,
    searchService,
    vocabularyService,
    relatedInquiryService,
    aiService,
    workflowService,
  });
}

module.exports = { createToitoiApiService };
