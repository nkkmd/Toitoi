'use strict';

const { buildOutboundFanOutPlan } = require('./multi_transport_outbound');

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeRetryOptions(options = {}) {
  const retries = Number.isInteger(options.retries) && options.retries >= 0 ? options.retries : 0;
  const initialDelayMs = Number.isInteger(options.initialDelayMs) && options.initialDelayMs >= 0
    ? options.initialDelayMs
    : 0;
  const maxDelayMs = Number.isInteger(options.maxDelayMs) && options.maxDelayMs >= initialDelayMs
    ? options.maxDelayMs
    : initialDelayMs;
  const factor = typeof options.factor === 'number' && options.factor > 1
    ? options.factor
    : 2;

  return {
    retries,
    initialDelayMs,
    maxDelayMs,
    factor,
  };
}

function shouldRetryError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if (error.retryable === true) {
    return true;
  }

  if (typeof error.status === 'number' && [408, 425, 429, 500, 502, 503, 504].includes(error.status)) {
    return true;
  }

  if (typeof error.code === 'string' && ['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ETIMEDOUT'].includes(error.code)) {
    return true;
  }

  return false;
}

function sleep(ms) {
  if (!Number.isInteger(ms) || ms <= 0) {
    return Promise.resolve();
  }

  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOperation(operation, retryOptions = {}) {
  const normalized = normalizeRetryOptions(retryOptions);
  let attempt = 0;
  let delayMs = normalized.initialDelayMs;

  while (attempt <= normalized.retries) {
    try {
      const value = await operation({ attempt, retries: normalized.retries });
      return {
        value,
        attempts: attempt + 1,
      };
    } catch (error) {
      if (attempt >= normalized.retries || !shouldRetryError(error)) {
        throw error;
      }

      await sleep(Math.min(delayMs, normalized.maxDelayMs));
      delayMs = Math.min(Math.max(delayMs * normalized.factor, delayMs + 1), normalized.maxDelayMs || delayMs + 1);
      attempt += 1;
    }
  }

  return null;
}

function resolveOutboundHandlers(options = {}) {
  if (isPlainObject(options.handlers)) {
    return options.handlers;
  }

  if (isPlainObject(options.transportHandlers)) {
    return options.transportHandlers;
  }

  return {};
}

function loadDefaultOutboundHandler(protocol) {
  if (protocol === 'nostr') {
    return async ({ canonicalEvent, options = {} }) => {
      const { publishCanonicalEventToNostrRelay } = require('@toitoi/nostr/live/outbound');
      return publishCanonicalEventToNostrRelay(canonicalEvent, options);
    };
  }

  if (protocol === 'atproto') {
    return async ({ canonicalEvent, options = {} }) => {
      const { publishCanonicalEventToAtProto } = require('@toitoi/atproto/live/outbound');
      return publishCanonicalEventToAtProto(canonicalEvent, options);
    };
  }

  if (protocol === 'lingonberry') {
    return async ({ canonicalEvent, options = {} }) => {
      let publishCanonicalEventToLingonberry;
      try {
        ({ publishCanonicalEventToLingonberry } = require('@toitoi/lingonberry/live/outbound'));
      } catch (error) {
        ({ publishCanonicalEventToLingonberry } = require('../lingonberry/live/outbound'));
      }
      return publishCanonicalEventToLingonberry(canonicalEvent, options);
    };
  }

  return null;
}

function resolveOutboundHandler(protocol, options = {}) {
  const handlers = resolveOutboundHandlers(options);
  const handler = handlers[protocol];
  if (typeof handler === 'function') {
    return handler;
  }

  return loadDefaultOutboundHandler(protocol);
}

async function executeOutboundFanOutPlan(canonicalEvent, options = {}) {
  const plan = isPlainObject(options.plan)
    ? options.plan
    : buildOutboundFanOutPlan(canonicalEvent, options);
  const protocolOptions = isPlainObject(options.protocolOptions) ? options.protocolOptions : {};
  const retryOptions = normalizeRetryOptions(options.retry || {});
  const results = [];

  for (const entry of plan.entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    if (entry.status === 'skipped') {
      results.push({
        protocol: entry.protocol,
        status: 'skipped',
        reason: isNonEmptyString(entry.reason) ? entry.reason.trim() : 'skipped by plan',
      });
      continue;
    }

    if (entry.status === 'quarantined') {
      results.push({
        protocol: entry.protocol,
        status: 'quarantined',
        reason: isNonEmptyString(entry.reason) ? entry.reason.trim() : 'quarantined by plan',
      });
      continue;
    }

    const handler = resolveOutboundHandler(entry.protocol, options);
    if (typeof handler !== 'function') {
      results.push({
        protocol: entry.protocol,
        status: 'skipped',
        reason: 'outbound handler is not configured',
      });
      continue;
    }

      const handlerOptions = {
        ...(protocolOptions[entry.protocol] || {}),
        ...(entry.protocol === 'nostr' && isPlainObject(options.nostr) ? options.nostr : {}),
        ...(entry.protocol === 'atproto' && isPlainObject(options.atproto) ? options.atproto : {}),
        ...(entry.protocol === 'lingonberry' && isPlainObject(options.lingonberry) ? options.lingonberry : {}),
      };

    try {
      const deliveryResult = await retryOperation(({ attempt }) => handler({
        canonicalEvent,
        entry,
        plan,
        options: handlerOptions,
        attempt,
      }), retryOptions);

      results.push({
        protocol: entry.protocol,
        status: 'delivered',
        attempts: deliveryResult.attempts,
        delivery: deliveryResult.value,
      });
    } catch (error) {
      results.push({
        protocol: entry.protocol,
        status: 'quarantined',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    sourceEventId: plan.sourceEventId,
    plan,
    results,
    delivered: results.filter(result => result.status === 'delivered'),
    skipped: results.filter(result => result.status === 'skipped'),
    quarantined: results.filter(result => result.status === 'quarantined'),
  };
}

module.exports = {
  executeOutboundFanOutPlan,
  loadDefaultOutboundHandler,
  normalizeRetryOptions,
  resolveOutboundHandler,
  resolveOutboundHandlers,
  retryOperation,
  shouldRetryError,
};
