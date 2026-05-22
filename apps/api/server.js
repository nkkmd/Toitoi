'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createStandardApiService, normalizeIndexSnapshot } = require('./standard_api_service');
const { replayStorage } = require('../../packages/nostr/storage/replay');

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
  const service = createStandardApiService({
    getIndexSnapshot: loadIndexSnapshotFromOptions(options),
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
  const server = createStandardApiServer(options);

  server.listen(port, () => {
    console.log(`Toitoi Standard API listening on http://127.0.0.1:${port}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createStandardApiServer,
  loadIndexSnapshotFromOptions,
  startServer,
};
