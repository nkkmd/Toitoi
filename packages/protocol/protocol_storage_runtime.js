'use strict';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeProtocolName(value) {
  return isNonEmptyString(value) ? value.trim().toLowerCase() : '';
}

function loadProtocolCatalog() {
  return require('./protocol_catalog');
}

function resolveRegistry(options = {}) {
  if (options.registry && typeof options.registry === 'object') {
    return options.registry;
  }

  return loadProtocolCatalog().createDefaultProtocolRegistry();
}

function createProtocolStorageRuntime(options = {}) {
  const protocol = normalizeProtocolName(options.protocol) || 'nostr';
  const registry = resolveRegistry(options);
  const knownProtocols = registry.list().map(descriptor => descriptor.protocol);

  if (!registry.has(protocol)) {
    throw new Error(`Unknown protocol: ${protocol}. Available protocols: ${knownProtocols.join(', ')}`);
  }

  const loadReplayModule = typeof options.loadReplayModule === 'function'
    ? options.loadReplayModule
    : null;
  const replayModule = loadReplayModule ? loadReplayModule(protocol) : null;
  const selectionSource = isNonEmptyString(options.selectionSource)
    ? options.selectionSource.trim()
    : 'protocol';

  return {
    protocol,
    selectionSource,
    replayModule,
    isSupported: replayModule !== null,
    availableProtocols: knownProtocols,
    resolveReplayStorage() {
      if (!replayModule || typeof replayModule.replayStorage !== 'function') {
        throw new Error(
          `Protocol ${protocol} is registered, but does not expose a replayStorage implementation`
        );
      }
      return replayModule.replayStorage;
    },
    describe() {
      return {
        protocol,
        supported: replayModule !== null,
        moduleName: replayModule ? 'replay' : null,
        selectionSource,
        availableProtocols: knownProtocols,
        unsupportedReason: replayModule ? null : 'replayStorage not implemented',
      };
    },
  };
}

module.exports = {
  createProtocolStorageRuntime,
  normalizeProtocolName,
};
