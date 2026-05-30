'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createStandardApiService, normalizeIndexSnapshot } = require('./standard_api_service');
const {
  createProtocolRuntime,
  createProtocolStorageRuntime,
} = require('@toitoi/protocol');
const { replayStorage } = require('@toitoi/nostr/storage/replay');

function loadReplayModule(protocol) {
  if (protocol === 'nostr') {
    return { replayStorage };
  }

  if (protocol === 'atproto') {
    return require('@toitoi/atproto/storage/replay');
  }

  return null;
}

function loadStorageModule(protocol) {
  if (protocol === 'nostr') {
    return require('@toitoi/nostr/storage');
  }

  if (protocol === 'atproto') {
    return require('@toitoi/atproto/storage');
  }

  return null;
}

function describeProtocolStorage(protocol) {
  const protocolStorageRuntime = createProtocolStorageRuntime({
    protocol,
    loadReplayModule,
  });

  return protocolStorageRuntime.describe();
}

function loadIndexSnapshotFromOptions(options = {}) {
  if (typeof options.getIndexSnapshot === 'function') {
    return options.getIndexSnapshot;
  }

  if (options.indexSnapshot) {
    return () => normalizeIndexSnapshot(options.indexSnapshot);
  }

  const storageDir = typeof options.storageDir === 'string' && options.storageDir !== ''
    ? options.storageDir
    : process.env.TOITOI_STORAGE_DIR;

  if (typeof storageDir === 'string' && storageDir !== '') {
    const resolvedStorageDir = path.resolve(storageDir);
    const protocolStorageRuntime = options.protocolStorageRuntime
      || createProtocolStorageRuntime({
        protocol: options.protocolRuntime?.selectedProtocol || options.protocol,
        loadReplayModule,
      });
    const replayStorage = protocolStorageRuntime.resolveReplayStorage();
    return () => {
      if (!fs.existsSync(resolvedStorageDir)) {
        return normalizeIndexSnapshot(null);
      }

      const replayed = replayStorage(resolvedStorageDir, { persistIndex: false });
      return normalizeIndexSnapshot(replayed.indexSnapshot);
    };
  }

  return () => normalizeIndexSnapshot(null);
}

function createStandardApiServer(options = {}) {
  const protocolRuntime = options.protocolRuntime || createProtocolRuntime({
    protocol: options.protocol,
    registry: options.protocolRegistry,
    defaultProtocol: options.defaultProtocol,
  });
  const protocolStorageRuntime = options.protocolStorageRuntime || createProtocolStorageRuntime({
    protocol: protocolRuntime.selectedProtocol || options.protocol,
    loadReplayModule,
  });
  const storageModule = options.storageModule || loadStorageModule(protocolRuntime.selectedProtocol || options.protocol) || loadStorageModule('nostr');
  const service = createStandardApiService({
    getIndexSnapshot: loadIndexSnapshotFromOptions(options),
    protocolRuntime,
    protocolStorageRuntime,
    describeProtocolStorage,
    storageModule,
  });

  return http.createServer((request, response) => {
    const result = service.handleRequest({
      method: request.method,
      url: request.url,
      headers: request.headers,
    });

    response.statusCode = result.statusCode;
    for (const [key, value] of Object.entries(result.headers || {})) {
      response.setHeader(key, value);
    }
    response.end(JSON.stringify(result.body));
  });
}

function startServer(options = {}) {
  const port = Number.isInteger(options.port)
    ? options.port
    : Number.parseInt(process.env.PORT || '3000', 10);
  const protocolRuntime = options.protocolRuntime || createProtocolRuntime({
    protocol: options.protocol || process.env.TOITOI_PROTOCOL,
    registry: options.protocolRegistry,
    defaultProtocol: options.defaultProtocol,
  });
  const protocolStorageRuntime = options.protocolStorageRuntime || createProtocolStorageRuntime({
    protocol: protocolRuntime.selectedProtocol || options.protocol,
    loadReplayModule,
  });
  const server = createStandardApiServer({
    ...options,
    protocolRuntime,
    protocolStorageRuntime,
  });

  server.listen(port, () => {
    const selected = protocolRuntime.selectedProtocol || 'unselected';
    const storage = protocolStorageRuntime.describe();
    const storageStatus = storage.supported ? 'replay:enabled' : 'replay:missing';
    console.log(`Toitoi Standard API listening on http://127.0.0.1:${port} (protocol: ${selected}, ${storageStatus})`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createStandardApiServer,
  describeProtocolStorage,
  loadIndexSnapshotFromOptions,
  loadStorageModule,
  startServer,
};
