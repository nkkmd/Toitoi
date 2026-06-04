'use strict';

const { finalizeEvent } = require('nostr-tools');
const { convertCanonicalToNostrDraft } = require('../converter/canonical_to_nostr_converter');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function resolveRelayPublisher(options = {}) {
  if (typeof options.publish === 'function') {
    return options.publish;
  }

  if (options.relay && typeof options.relay.publish === 'function') {
    return options.relay.publish.bind(options.relay);
  }

  throw new Error('Nostr publish function or relay instance is required');
}

function resolveSecretKey(options = {}) {
  if (options.secretKey !== undefined) {
    return options.secretKey;
  }

  if (options.secretKeyHex !== undefined) {
    return options.secretKeyHex;
  }

  if (isNonEmptyString(process.env.NOSTR_SECRET_KEY)) {
    return process.env.NOSTR_SECRET_KEY.trim();
  }

  throw new Error('Nostr secret key is required');
}

function resolveRelayUrl(options = {}) {
  if (isNonEmptyString(options.relayUrl)) {
    return options.relayUrl.trim();
  }

  if (isNonEmptyString(process.env.NOSTR_RELAY_URL)) {
    return process.env.NOSTR_RELAY_URL.trim();
  }

  return '';
}

async function publishCanonicalEventToNostrRelay(canonicalEvent, options = {}) {
  const converted = convertCanonicalToNostrDraft(canonicalEvent, options.converterOptions || {});
  const draft = converted && typeof converted === 'object' && !Array.isArray(converted) && converted.output
    ? converted.output
    : converted;
  const warnings = converted && typeof converted === 'object' && Array.isArray(converted.warnings)
    ? converted.warnings.slice()
    : [];
  const publish = resolveRelayPublisher(options);
  const secretKey = resolveSecretKey(options);
  const relayUrl = resolveRelayUrl(options);
  const event = finalizeEvent({
    kind: Number.isInteger(options.kind) ? options.kind : (Number.isInteger(draft.kind) ? draft.kind : 1042),
    created_at: draft.created_at,
    content: draft.content,
    tags: draft.tags,
  }, secretKey);

  await publish(event);

  return {
    protocol: 'nostr',
    relayUrl,
    draft,
    event,
    warnings,
  };
}

module.exports = {
  publishCanonicalEventToNostrRelay,
  resolveRelayPublisher,
  resolveRelayUrl,
  resolveSecretKey,
};
