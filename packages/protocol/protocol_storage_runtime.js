'use strict';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeProtocolName(value) {
  return isNonEmptyString(value) ? value.trim().toLowerCase() : '';
}

function loadStorageReplayModule(protocol) {
  const normalized = normalizeProtocolName(protocol) || 'nostr';

  if (normalized === 'nostr') {
    return require('@toitoi/nostr/storage/replay');
  }

  if (normalized === 'atproto') {
    return require('@toitoi/atproto/storage/replay');
  }

  if (normalized === 'localfs') {
    return null;
  }

  return null;
}

function createProtocolStorageRuntime(options = {}) {
  const protocol = normalizeProtocolName(options.protocol) || 'nostr';
  const replayModule = loadStorageReplayModule(protocol);

  return {
    protocol,
    replayModule,
    isSupported: replayModule !== null,
    resolveReplayStorage() {
      if (!replayModule || typeof replayModule.replayStorage !== 'function') {
        throw new Error(`Protocol ${protocol} does not expose a replayStorage implementation`);
      }
      return replayModule.replayStorage;
    },
    describe() {
      return {
        protocol,
        supported: replayModule !== null,
        moduleName: replayModule ? 'replay' : null,
      };
    },
  };
}

module.exports = {
  createProtocolStorageRuntime,
  loadStorageReplayModule,
};
