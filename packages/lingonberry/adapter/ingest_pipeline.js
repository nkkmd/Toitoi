'use strict';

const { classifyEvent, dedupeKey, sortByTransportOrder } = require('./lingonberry_adapter');

function ingestLingonberryEvents(rawEvents, options = {}) {
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
      const item = { status: 'invalid', rawEvent, ...classified };
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
        verification: classified.verification,
        ordering: classified.ordering,
      };
      duplicates.push(item);
      processedEvents.push(item);
      continue;
    }
    if (key) {
      seenKeys.add(key);
    }

    const status = classified.status === 'unverified' ? 'unverified' : 'accepted';
    const item = {
      status,
      rawEvent,
      normalizedEvent: classified.normalizedEvent,
      canonicalEvent: classified.canonicalEvent,
      warnings: classified.warnings,
      verification: classified.verification,
      dedupeKey: key,
      ordering: classified.ordering,
      errors: classified.errors,
    };
    if (status === 'unverified') {
      unverified.push(item);
    }
    accepted.push(item);
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
  ingestLingonberryEvents,
};
