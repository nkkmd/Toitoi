'use strict';

const { executeOutboundFanOutPlan } = require('@toitoi/protocol');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createCanonicalPublisher({
  storageDir,
  storageModule,
  protocolRuntime,
  protocols,
  outboundOptions = {},
  deliver = executeOutboundFanOutPlan,
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof storageDir !== 'string' || storageDir.trim() === '') {
    throw new TypeError('storageDir is required for canonical publication');
  }
  if (!storageModule || typeof storageModule.persistIngestResult !== 'function') {
    throw new TypeError('storageModule.persistIngestResult is required');
  }
  if (typeof deliver !== 'function') throw new TypeError('deliver must be a function');

  return async function publishCanonicalEvent(canonicalEvent, context = {}) {
    const delivery = await deliver(canonicalEvent, {
      protocolRuntime,
      protocols,
      ...outboundOptions,
    });
    const publishedAt = context.publishedAt || now();
    const enriched = clone(canonicalEvent);
    enriched.meta = enriched.meta && typeof enriched.meta === 'object' ? enriched.meta : {};
    enriched.meta.publication = {
      ...(enriched.meta.publication || {}),
      publishedAt,
      delivery: {
        delivered: delivery.delivered.map((entry) => ({ protocol: entry.protocol, attempts: entry.attempts })),
        skipped: delivery.skipped.map((entry) => ({ protocol: entry.protocol, reason: entry.reason })),
        quarantined: delivery.quarantined.map((entry) => ({ protocol: entry.protocol, reason: entry.reason })),
      },
    };

    const persisted = storageModule.persistIngestResult(storageDir, {
      orderedEvents: [enriched],
      accepted: [enriched],
      invalid: [],
      duplicates: [],
      unverified: [],
      processedEvents: [{
        status: 'accepted',
        dedupeKey: enriched.id,
        warnings: delivery.skipped.map((entry) => `${entry.protocol}: ${entry.reason}`),
        errors: delivery.quarantined.map((entry) => `${entry.protocol}: ${entry.reason}`),
        verification: { ok: true, verified: true, skipped: false, reason: 'human-approved canonical publication' },
        rawEvent: {
          publicationRequest: true,
          draftId: context.draftId || enriched.meta.publication?.draftId || null,
          canonicalEventId: enriched.id,
        },
        canonicalEvent: enriched,
      }],
    }, {
      source: 'canonical-publication',
      sourceLabel: context.draftId || enriched.meta.publication?.draftId || '',
      batchId: context.batchId,
    });

    return {
      canonicalEvent: enriched,
      storage: {
        batchId: persisted.batchId,
        canonicalRecordIds: persisted.canonicalRecordIds,
        rawRecordIds: persisted.rawRecordIds,
      },
      delivery,
    };
  };
}

module.exports = { createCanonicalPublisher };
