'use strict';

const { createAiHttpService } = require('./ai_http_service');
const { createStandardApiService } = require('./standard_api_service');

function createToitoiApiService(options = {}) {
  const standardService = options.standardService || createStandardApiService(options);
  const aiService = options.aiInspectionService
    ? createAiHttpService({ inspectionService: options.aiInspectionService })
    : null;

  function handleRequest(request = {}) {
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
  });
}

module.exports = { createToitoiApiService };
