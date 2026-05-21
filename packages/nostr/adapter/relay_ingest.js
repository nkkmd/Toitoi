'use strict';

const { ingestNostrEvents } = require('./ingest_pipeline');

function ingestRelaySubscription(relay, filter, options = {}) {
  if (!relay || typeof relay.subscribe !== 'function') {
    throw new TypeError('relay must expose subscribe()');
  }

  const rawEvents = [];
  let subscription;

  return new Promise((resolve, reject) => {
    try {
      subscription = relay.subscribe([filter], {
        onevent(event) {
          rawEvents.push(event);
          if (typeof options.onEvent === 'function') {
            options.onEvent(event);
          }
        },
        oneose() {
          const result = ingestNostrEvents(rawEvents, options);
          if (typeof options.onResult === 'function') {
            options.onResult(result);
          }
          resolve({
            ...result,
            rawEvents,
          });
        },
        onclose(reason) {
          if (typeof options.onClose === 'function') {
            options.onClose(reason);
          }
        },
      });
    } catch (error) {
      reject(error);
      return;
    }

    if (subscription && typeof options.onSubscribe === 'function') {
      options.onSubscribe(subscription);
    }
  });
}

async function ingestRelayUrl(relayUrl, filter, options = {}) {
  const relay = await connectRelay(relayUrl);
  return ingestRelaySubscription(relay, filter, options);
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
  ingestRelaySubscription,
  ingestRelayUrl,
  connectRelay,
};
