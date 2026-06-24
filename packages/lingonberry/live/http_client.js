'use strict';

const { createPrivateKey, sign: signPayload } = require('crypto');

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(sortKeys(value));
}

function getFetch() {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch is unavailable in this runtime');
  }
  return fetch;
}

function resolveCarrierUrl(options = {}) {
  const url = isNonEmptyString(options.carrierUrl)
    ? options.carrierUrl.trim()
    : isNonEmptyString(process.env.LINGONBERRY_CARRIER_URL)
      ? process.env.LINGONBERRY_CARRIER_URL.trim()
      : '';

  if (!isNonEmptyString(url)) {
    throw new Error('Lingonberry carrier URL is required');
  }

  return url.replace(/\/+$/, '');
}

async function requestJson(url, options = {}) {
  const fetchImpl = getFetch();
  const response = await fetchImpl(url, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text.trim() === '' ? null : JSON.parse(text);

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && payload.error
      ? (typeof payload.error === 'string' ? payload.error : payload.error.message)
      : `${response.status} ${response.statusText}`;
    const error = new Error(`Lingonberry request failed: ${message}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function canonicalPublishRequestPayload(request) {
  const cloned = JSON.parse(JSON.stringify(request));
  if (isPlainObject(cloned.publisher)) {
    delete cloned.publisher.signature;
  }
  return canonicalJson(cloned);
}

function signPublishRequestPayload(request, privateKey) {
  if (!isNonEmptyString(privateKey)) {
    throw new Error('Lingonberry publisher private key is required');
  }

  const keyObject = createPrivateKey(privateKey);
  return signPayload(null, Buffer.from(canonicalPublishRequestPayload(request), 'utf8'), keyObject).toString('hex');
}

function buildPublishRequest(object, options = {}) {
  if (!isPlainObject(object)) {
    throw new Error('Lingonberry knowledge object is required');
  }

  const publisher = isPlainObject(options.publisher) ? options.publisher : {};
  const publicKey = isNonEmptyString(options.publicKey)
    ? options.publicKey.trim()
    : isNonEmptyString(publisher.publicKey)
      ? publisher.publicKey.trim()
      : isNonEmptyString(process.env.LINGONBERRY_PUBLISHER_PUBLIC_KEY)
        ? process.env.LINGONBERRY_PUBLISHER_PUBLIC_KEY.trim()
        : '';
  const privateKey = isNonEmptyString(options.privateKey)
    ? options.privateKey
    : isNonEmptyString(publisher.privateKey)
      ? publisher.privateKey
      : isNonEmptyString(process.env.LINGONBERRY_PUBLISHER_PRIVATE_KEY)
        ? process.env.LINGONBERRY_PUBLISHER_PRIVATE_KEY
        : '';
  const providedSignature = isNonEmptyString(options.signature)
    ? options.signature.trim()
    : isNonEmptyString(publisher.signature)
      ? publisher.signature.trim()
      : '';

  if (!/^[0-9a-f]{64}$/.test(publicKey)) {
    throw new Error('Lingonberry publisher public key must be 64-character lowercase hex');
  }

  const request = {
    object,
    publisher: {
      publicKey,
      signature: providedSignature || '0'.repeat(128),
    },
  };

  if (providedSignature) {
    return request;
  }

  request.publisher.signature = signPublishRequestPayload(request, privateKey);
  return request;
}

async function publishObject(options = {}) {
  const carrierUrl = resolveCarrierUrl(options);
  const request = isPlainObject(options.request)
    ? options.request
    : buildPublishRequest(options.object, options);
  return requestJson(`${carrierUrl}/v1/objects`, {
    method: 'POST',
    body: request,
  });
}

async function getObject(options = {}) {
  const carrierUrl = resolveCarrierUrl(options);
  const id = isNonEmptyString(options.id) ? options.id.trim() : '';
  if (!isNonEmptyString(id)) {
    throw new Error('Lingonberry object id is required');
  }
  return requestJson(`${carrierUrl}/v1/objects/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

async function listObjects(options = {}) {
  const carrierUrl = resolveCarrierUrl(options);
  const url = new URL(`${carrierUrl}/v1/objects`);
  if (isNonEmptyString(options.cursor)) {
    url.searchParams.set('cursor', options.cursor.trim());
  }
  if (isNonEmptyString(options.since)) {
    url.searchParams.set('since', options.since.trim());
  }
  if (Number.isInteger(options.limit) && options.limit > 0) {
    url.searchParams.set('limit', String(options.limit));
  }

  return requestJson(url.toString(), {
    method: 'GET',
  });
}

async function getCapabilities(options = {}) {
  return requestJson(`${resolveCarrierUrl(options)}/v1/capabilities`, {
    method: 'GET',
  });
}

async function getReady(options = {}) {
  return requestJson(`${resolveCarrierUrl(options)}/v1/ready`, {
    method: 'GET',
  });
}

module.exports = {
  buildPublishRequest,
  canonicalPublishRequestPayload,
  getCapabilities,
  getObject,
  getReady,
  listObjects,
  publishObject,
  requestJson,
  resolveCarrierUrl,
  signPublishRequestPayload,
};
