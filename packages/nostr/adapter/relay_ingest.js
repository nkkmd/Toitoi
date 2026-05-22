'use strict';

const { ingestNostrEvents } = require('./ingest_pipeline');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeRetryOptions(options = {}) {
  const retry = options && typeof options.retry === 'object' ? options.retry : {};

  const retries = Number.isInteger(retry.retries) && retry.retries >= 0 ? retry.retries : 3;
  const initialDelayMs = Number.isInteger(retry.initialDelayMs) && retry.initialDelayMs >= 0
    ? retry.initialDelayMs
    : 1000;
  const maxDelayMs = Number.isInteger(retry.maxDelayMs) && retry.maxDelayMs >= initialDelayMs
    ? retry.maxDelayMs
    : 10000;
  const factor = typeof retry.factor === 'number' && retry.factor > 1
    ? retry.factor
    : 2;

  return {
    retries,
    initialDelayMs,
    maxDelayMs,
    factor,
  };
}

function getRelayErrorMessage(error) {
  if (error instanceof Error) {
    return error.message || error.name;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    if (typeof error.message === 'string' && error.message !== '') {
      return error.message;
    }
    if (typeof error.reason === 'string' && error.reason !== '') {
      return error.reason;
    }
    if (typeof error.code === 'string' && error.code !== '') {
      return error.code;
    }
  }

  return String(error);
}

function isRetryableRelayError(error) {
  if (!error) {
    return false;
  }

  const code = typeof error === 'object' && error !== null ? error.code : null;
  if (typeof code === 'string') {
    const retryableCodes = new Set([
      'ECONNRESET',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'EPIPE',
      'ECONNREFUSED',
      'WS_CLOSED',
    ]);
    if (retryableCodes.has(code)) {
      return true;
    }
  }

  const message = getRelayErrorMessage(error).toLowerCase();
  return [
    'timed out',
    'timeout',
    'temporarily unavailable',
    'network error',
    'socket hang up',
    'closed before eose',
    'subscription closed',
    'connection closed',
  ].some(pattern => message.includes(pattern));
}

async function withRetry(operation, options = {}) {
  const retryOptions = normalizeRetryOptions(options);
  const isRetryableError = typeof options.isRetryableError === 'function'
    ? options.isRetryableError
    : isRetryableRelayError;
  const onRetry = typeof options.onRetry === 'function' ? options.onRetry : null;
  let attempt = 0;
  let delayMs = retryOptions.initialDelayMs;
  let lastError = null;

  while (attempt <= retryOptions.retries) {
    try {
      return await operation({ attempt, retries: retryOptions.retries });
    } catch (error) {
      lastError = error;
      if (attempt >= retryOptions.retries || !isRetryableError(error)) {
        throw error;
      }

      const nextAttempt = attempt + 1;
      const waitMs = Math.min(delayMs, retryOptions.maxDelayMs);
      if (onRetry) {
        onRetry({
          attempt: nextAttempt,
          retries: retryOptions.retries,
          delayMs: waitMs,
          error,
        });
      }

      await sleep(waitMs);
      delayMs = Math.min(Math.floor(delayMs * retryOptions.factor), retryOptions.maxDelayMs);
      attempt = nextAttempt;
    }
  }

  throw lastError || new Error('relay ingest failed');
}

function ingestRelaySubscription(relay, filter, options = {}) {
  if (!relay || typeof relay.subscribe !== 'function') {
    throw new TypeError('relay must expose subscribe()');
  }

  const rawEvents = [];
  let subscription;
  let settled = false;

  return new Promise((resolve, reject) => {
    const finalizeResolve = result => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const finalizeReject = error => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };

    try {
      subscription = relay.subscribe([filter], {
        onevent(event) {
          if (settled) {
            return;
          }
          rawEvents.push(event);
          if (typeof options.onEvent === 'function') {
            options.onEvent(event);
          }
        },
        oneose() {
          if (settled) {
            return;
          }
          const result = ingestNostrEvents(rawEvents, options);
          if (typeof options.onResult === 'function') {
            options.onResult(result);
          }
          finalizeResolve({
            ...result,
            rawEvents,
          });
        },
        onclose(reason) {
          if (settled) {
            return;
          }
          if (typeof options.onClose === 'function') {
            options.onClose(reason);
          }
          if (reason instanceof Error) {
            finalizeReject(reason);
            return;
          }
          if (typeof reason === 'string' && reason.trim() !== '') {
            finalizeReject(new Error(reason));
            return;
          }
          finalizeReject(new Error('relay subscription closed before EOSE'));
        },
      });
    } catch (error) {
      finalizeReject(error);
      return;
    }

    if (subscription && typeof options.onSubscribe === 'function') {
      options.onSubscribe(subscription);
    }
  });
}

async function ingestRelayUrl(relayUrl, filter, options = {}) {
  const connectRelayFn = typeof options.connectRelay === 'function'
    ? options.connectRelay
    : connectRelay;

  return withRetry(async () => {
    const relay = await connectRelayFn(relayUrl);
    try {
      return await ingestRelaySubscription(relay, filter, options);
    } finally {
      if (relay && typeof relay.close === 'function') {
        try {
          relay.close();
        } catch (error) {
          // Best-effort cleanup only.
        }
      }
    }
  }, options);
}

async function connectRelay(relayUrl) {
  const { Relay } = loadNostrTools();
  const WebSocket = loadWebSocket();
  global.WebSocket = WebSocket;
  return Relay.connect(relayUrl);
}

function loadNostrTools() {
  try {
    // Lazy-load so the adapter remains usable in environments without the dependency installed.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    return require('nostr-tools');
  } catch (error) {
    throw new Error('nostr-tools is required for relay ingestion');
  }
}

function loadWebSocket() {
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    return require('ws');
  } catch (error) {
    throw new Error('ws is required for relay ingestion');
  }
}

module.exports = {
  getRelayErrorMessage,
  ingestRelaySubscription,
  ingestRelayUrl,
  connectRelay,
  isRetryableRelayError,
  normalizeRetryOptions,
  sleep,
  withRetry,
};
