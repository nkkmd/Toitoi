'use strict';

const { classifyEvent, dedupeKey, sortByTransportOrder } = require('./atproto_adapter');

function ingestAtProtoEvents(rawEvents, options = {}) {
  if (!Array.isArray(rawEvents)) {
    throw new TypeError('rawEvents must be an array');
  }

  const orderedEvents = sortByTransportOrder(rawEvents);
  const seenKeys = new Set();
  const accepted = [];
  const invalid = [];
  const duplicates = [];
  const unverified = [];
  const processedEvents = [];

  for (const rawEvent of orderedEvents) {
    const classified = classifyEvent(rawEvent, options);

    if (classified.status === 'invalid') {
      const item = {
        status: 'invalid',
        rawEvent,
        errors: classified.errors,
        warnings: classified.warnings,
        normalizedEvent: classified.normalizedEvent,
        canonicalEvent: classified.canonicalEvent,
        verification: classified.verification ?? null,
        dedupeKey: classified.dedupeKey ?? null,
        ordering: classified.ordering ?? null,
      };
      invalid.push(item);
      processedEvents.push(item);
      continue;
    }

    const key = dedupeKey(rawEvent);
    if (key && seenKeys.has(key)) {
      const item = {
        status: 'duplicate',
        rawEvent,
        dedupeKey: key,
        errors: [],
        warnings: classified.warnings,
        normalizedEvent: classified.normalizedEvent,
        canonicalEvent: null,
        verification: classified.verification ?? null,
        ordering: classified.ordering ?? null,
      };
      duplicates.push(item);
      processedEvents.push(item);
      continue;
    }

    if (key) {
      seenKeys.add(key);
    }

    const item = {
      status: classified.status === 'unverified' ? 'unverified' : 'accepted',
      rawEvent,
      normalizedEvent: classified.normalizedEvent,
      canonicalEvent: classified.canonicalEvent,
      warnings: classified.warnings,
      verification: classified.verification,
      dedupeKey: key,
      ordering: classified.ordering,
      errors: [],
    };

    if (classified.status === 'unverified') {
      unverified.push({
        rawEvent,
        normalizedEvent: classified.normalizedEvent,
        canonicalEvent: classified.canonicalEvent,
        warnings: classified.warnings,
        verification: classified.verification,
        status: 'unverified',
        dedupeKey: key,
        ordering: classified.ordering,
      });
    }

    accepted.push({
      rawEvent,
      normalizedEvent: classified.normalizedEvent,
      canonicalEvent: classified.canonicalEvent,
      warnings: classified.warnings,
      verification: classified.verification,
    });
    processedEvents.push(item);
  }

  return {
    accepted,
    invalid,
    duplicates,
    unverified,
    processedEvents,
    orderedEvents,
  };
}

module.exports = {
  ingestAtProtoEvents,
};
