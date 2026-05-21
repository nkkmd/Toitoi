'use strict';

const {
  classifyEvent,
  dedupeKey,
  sortByTransportOrder,
} = require('./nostr_adapter');

function ingestNostrEvents(rawEvents, options = {}) {
  if (!Array.isArray(rawEvents)) {
    throw new TypeError('rawEvents must be an array');
  }

  const orderedEvents = sortByTransportOrder(rawEvents);
  const seenKeys = new Set();
  const accepted = [];
  const invalid = [];
  const duplicates = [];
  const unverified = [];

  for (const rawEvent of orderedEvents) {
    const classified = classifyEvent(rawEvent, options);

    if (classified.status === 'invalid') {
      invalid.push({
        rawEvent,
        errors: classified.errors,
        warnings: classified.warnings,
      });
      continue;
    }

    const key = dedupeKey(rawEvent);
    if (key && seenKeys.has(key)) {
      duplicates.push({
        rawEvent,
        dedupeKey: key,
      });
      continue;
    }

    if (key) {
      seenKeys.add(key);
    }

    if (classified.status === 'unverified') {
      unverified.push({
        rawEvent,
        normalizedEvent: classified.normalizedEvent,
        canonicalEvent: classified.canonicalEvent,
        warnings: classified.warnings,
      });
    }

    accepted.push({
      rawEvent,
      normalizedEvent: classified.normalizedEvent,
      canonicalEvent: classified.canonicalEvent,
      warnings: classified.warnings,
      verification: classified.verification,
    });
  }

  return {
    accepted,
    invalid,
    duplicates,
    unverified,
    orderedEvents,
  };
}

module.exports = {
  ingestNostrEvents,
};
