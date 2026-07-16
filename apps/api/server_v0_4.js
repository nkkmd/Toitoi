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
} = require('@toitoi/ai');
const { createStandardApiService } = require('./standard_api_service');
const { createToitoiApiService } = require('./toitoi_api_service');
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

function createAiInspectionServiceFromOptions(options = {}) {
  if (options.aiInspectionService) return options.aiInspectionService;

  const storageDir = typeof options.aiStorageDir === 'string' && options.aiStorageDir.trim() !== ''
    ? options.aiStorageDir
    : process.env.TOITOI_AI_STORAGE_DIR;
  if (typeof storageDir !== 'string' || storageDir.trim() === '') return null;

  const store = createAiJsonlStore({ directory: path.resolve(storageDir) });
  return createAiInspectionService({ store });
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
  const standardService = createStandardApiService({
    getIndexSnapshot: loadIndexSnapshotFromOptions({
      ...runtimeOptions,
      protocolRuntime,
      protocolStorageRuntime,
    }),
    protocolRuntime,
    protocolStorageRuntime,
    describeProtocolStorage,
    storageModule,
  });
  const service = createToitoiApiService({
    standardService,
    aiInspectionService: createAiInspectionServiceFromOptions(options),
  });

  return http.createServer((request, response) => {
    const result = service.handleRequest({
      method: request.method,
      url: request.url,
      headers: request.headers,
    });
    response.statusCode = result.statusCode;
    for (const [key, value] of Object.entries(result.headers || {})) response.setHeader(key, value);
    response.end(JSON.stringify(result.body));
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
    console.log(`Toitoi API listening on http://127.0.0.1:${port} (${aiStatus})`);
  });
  return server;
}

if (require.main === module) startServer();

module.exports = {
  createAiInspectionServiceFromOptions,
  createToitoiApiServer,
  resolveProtocolName,
  startServer,
};