'use strict';

const http = require('http');
const path = require('path');
const {
  createProtocolRuntime,
  createProtocolStorageRuntime,
} = require('@toitoi/protocol');
const {
  createAiInspectionService,
  createAiJsonlStore,
  createAiReviewService,
} = require('@toitoi/ai');
const { createStandardApiService } = require('./standard_api_service');
const { createSearchHttpService } = require('./search_http_service');
const { createVocabularyHttpService } = require('./vocabulary_http_service');
const { createRelatedInquiryHttpService } = require('./related_inquiry_http_service');
const { createToitoiApiService } = require('./toitoi_api_service');
const { createMemoryWorkflowService } = require('./workflow_http_service');
const { createCanonicalPublisher } = require('./canonical_publisher');
const {
  createMultiTransportStorageRuntime,
  describeProtocolStorage,
  loadIndexSnapshotFromOptions,
  loadStorageModule,
  loadTransportSourcesFromOptions,
} = require('./server');

function resolveProtocolName(options = {}) {
  return options.protocol || process.env.TOITOI_PROTOCOL;
}

function resolveStorageDir(options = {}) {
  const value = typeof options.storageDir === 'string' && options.storageDir.trim() !== ''
    ? options.storageDir
    : process.env.TOITOI_STORAGE_DIR;
  return typeof value === 'string' && value.trim() !== '' ? path.resolve(value) : null;
}

function resolveSearchIndexFile(options = {}) {
  const value = typeof options.searchIndexFile === 'string' && options.searchIndexFile.trim() !== ''
    ? options.searchIndexFile
    : process.env.TOITOI_SEARCH_INDEX_FILE;
  return typeof value === 'string' && value.trim() !== '' ? path.resolve(value) : ':memory:';
}

function createAiRuntimeFromOptions(options = {}) {
  if (options.aiInspectionService) {
    return {
      inspectionService: options.aiInspectionService,
      reviewService: options.aiReviewService || null,
    };
  }
  const storageDir = typeof options.aiStorageDir === 'string' && options.aiStorageDir.trim() !== ''
    ? options.aiStorageDir
    : process.env.TOITOI_AI_STORAGE_DIR;
  if (typeof storageDir !== 'string' || storageDir.trim() === '') {
    return { inspectionService: null, reviewService: null };
  }
  const store = createAiJsonlStore({ directory: path.resolve(storageDir) });
  return {
    inspectionService: createAiInspectionService({ store }),
    reviewService: createAiReviewService({ store }),
  };
}

function createAiInspectionServiceFromOptions(options = {}) {
  return createAiRuntimeFromOptions(options).inspectionService;
}

function readRequestBody(request, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('request body is too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(chunks.length ? Buffer.concat(chunks).toString('utf8') : null));
    request.on('error', reject);
  });
}

function createToitoiApiServer(options = {}) {
  const protocol = resolveProtocolName(options);
  const runtimeOptions = { ...options, protocol };
  const protocolRuntime = options.protocolRuntime || createProtocolRuntime({
    protocol,
    registry: options.protocolRegistry,
    defaultProtocol: options.defaultProtocol,
  });
  const transportSources = loadTransportSourcesFromOptions(runtimeOptions);
  const protocolStorageRuntime = options.protocolStorageRuntime || (transportSources.length > 0
    ? createMultiTransportStorageRuntime(transportSources)
    : createProtocolStorageRuntime({
      protocol: protocolRuntime.selectedProtocol || protocol,
      registry: protocolRuntime.registry,
      selectionSource: protocolRuntime.selectionSource,
      loadReplayModule(selectedProtocol) {
        if (selectedProtocol === 'nostr') return require('@toitoi/nostr/storage/replay');
        if (selectedProtocol === 'atproto') return require('@toitoi/atproto/storage/replay');
        if (selectedProtocol === 'lingonberry') return require('@toitoi/lingonberry/storage/replay');
        return null;
      },
    }));
  const storageModule = options.storageModule
    || loadStorageModule(protocolRuntime.selectedProtocol || protocol)
    || loadStorageModule('nostr');
  const storageDir = resolveStorageDir(options);
  const getIndexSnapshot = loadIndexSnapshotFromOptions({
    ...runtimeOptions,
    protocolRuntime,
    protocolStorageRuntime,
  });
  const standardService = createStandardApiService({
    getIndexSnapshot,
    protocolRuntime,
    protocolStorageRuntime,
    describeProtocolStorage,
    storageModule,
  });
  const searchService = options.searchService || createSearchHttpService({
    getIndexSnapshot,
    filename: resolveSearchIndexFile(options),
  });
  const vocabularyService = options.vocabularyService || createVocabularyHttpService({
    terms: options.vocabularyTerms || [],
    mappings: options.vocabularyMappings || [],
  });
  const relatedInquiryService = options.relatedInquiryService || createRelatedInquiryHttpService({
    getIndexSnapshot,
    searchService,
  });
  const aiRuntime = createAiRuntimeFromOptions(options);
  const canonicalPublisher = options.canonicalPublisher || (storageDir
    ? createCanonicalPublisher({
      storageDir,
      storageModule,
      protocolRuntime,
      protocols: options.publishProtocols,
      outboundOptions: options.outboundOptions || {},
      deliver: options.deliverCanonicalEvent,
    })
    : null);
  const workflowService = options.workflowService || (canonicalPublisher
    ? createMemoryWorkflowService({
      annotationService: aiRuntime.inspectionService,
      canonicalPublisher,
    })
    : null);
  const service = createToitoiApiService({
    standardService,
    searchService,
    vocabularyService,
    relatedInquiryService,
    aiInspectionService: aiRuntime.inspectionService,
    aiReviewService: aiRuntime.reviewService,
    workflowService,
    operationsEnabled: true,
    operationsBoundary: options.operationsBoundary,
    authenticationRequired: options.authenticationRequired === true
      || process.env.TOITOI_AUTH_REQUIRED === 'true',
    rateLimit: options.rateLimit,
    rateWindowMs: options.rateWindowMs,
    workflowRequired: Boolean(storageDir),
    searchRequired: true,
  });

  return http.createServer(async (request, response) => {
    try {
      const body = ['POST', 'PUT', 'PATCH'].includes(request.method) ? await readRequestBody(request) : null;
      const result = await service.handleRequest({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body,
      });
      response.statusCode = result.statusCode;
      for (const [key, value] of Object.entries(result.headers || {})) response.setHeader(key, value);
      response.end(JSON.stringify(result.body));
    } catch (error) {
      response.statusCode = /too large/.test(error.message) ? 413 : 500;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ message: error.message }));
    }
  });
}

function startServer(options = {}) {
  const port = Number.isInteger(options.port)
    ? options.port
    : Number.parseInt(process.env.PORT || '3000', 10);
  const server = createToitoiApiServer(options);
  server.listen(port, () => {
    const aiStatus = options.aiInspectionService || options.aiStorageDir || process.env.TOITOI_AI_STORAGE_DIR
      ? 'ai-inspection:enabled'
      : 'ai-inspection:disabled';
    const workflowStatus = resolveStorageDir(options) ? 'workflow:enabled' : 'workflow:disabled';
    const searchStatus = resolveSearchIndexFile(options) === ':memory:' ? 'search:memory' : 'search:persistent';
    const authStatus = options.authenticationRequired === true || process.env.TOITOI_AUTH_REQUIRED === 'true'
      ? 'auth:required'
      : 'auth:development';
    console.log(`Toitoi API listening on http://127.0.0.1:${port} (${aiStatus}, ${workflowStatus}, ${searchStatus}, ${authStatus}, vocabulary:enabled, related:enabled)`);
  });
  return server;
}

if (require.main === module) startServer();

module.exports = {
  createAiInspectionServiceFromOptions,
  createAiRuntimeFromOptions,
  createToitoiApiServer,
  readRequestBody,
  resolveProtocolName,
  resolveSearchIndexFile,
  resolveStorageDir,
  startServer,
};
