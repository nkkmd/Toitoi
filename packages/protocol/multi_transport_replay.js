'use strict';

const {
  composeMultiTransportIndexSnapshot,
} = require('./multi_transport');

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function collectCanonicalEvents(replayResult) {
  if (!replayResult || typeof replayResult !== 'object') {
    return [];
  }

  const accepted = Array.isArray(replayResult.ingestResult?.accepted)
    ? replayResult.ingestResult.accepted
    : [];

  return accepted
    .map(item => item && item.canonicalEvent)
    .filter(Boolean);
}

function replayMultiTransportStorage(sources, options = {}) {
  if (!Array.isArray(sources)) {
    throw new TypeError('sources must be an array');
  }

  const replayResults = [];
  const canonicalEvents = [];

  for (const source of sources) {
    if (!isPlainObject(source)) {
      continue;
    }

    const protocol = isNonEmptyString(source.protocol) ? source.protocol.trim() : '';
    const storageDir = isNonEmptyString(source.storageDir) ? source.storageDir.trim() : '';
    const replayStorage = typeof source.replayStorage === 'function' ? source.replayStorage : null;
    const replayOptions = isPlainObject(source.replayOptions) ? source.replayOptions : {};
    const replayResult = isPlainObject(source.replayResult)
      ? source.replayResult
      : null;

    if (!replayResult && (!replayStorage || !storageDir)) {
      throw new Error('Each source must provide replayResult or replayStorage + storageDir');
    }

    const result = replayResult || replayStorage(storageDir, {
      persistIndex: false,
      ...replayOptions,
      identityMapping: options.identityMapping,
    });

    replayResults.push({
      protocol: protocol || result?.protocol || null,
      storageDir: storageDir || result?.storageDir || null,
      replayResult: result,
    });

    canonicalEvents.push(...collectCanonicalEvents(result));
  }

  const merged = composeMultiTransportIndexSnapshot(canonicalEvents, {
    identityMapping: options.identityMapping,
  });

  return {
    replayResults,
    canonicalEvents: merged.canonicalEvents,
    identityIndex: merged.identityIndex,
    indexSnapshot: merged.indexSnapshot,
  };
}

module.exports = {
  collectCanonicalEvents,
  replayMultiTransportStorage,
};
