'use strict';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeProtocolName(value) {
  return isNonEmptyString(value) ? value.trim().toLowerCase() : '';
}

function createProtocolStorageRuntime(options = {}) {
  const protocol = normalizeProtocolName(options.protocol) || 'nostr';
  const loadReplayModule = typeof options.loadReplayModule === 'function'
    ? options.loadReplayModule
    : null;
  const replayModule = loadReplayModule ? loadReplayModule(protocol) : null;

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
  normalizeProtocolName,
};
