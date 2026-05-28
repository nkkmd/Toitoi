'use strict';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function getFetch() {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch is unavailable in this runtime');
  }

  return fetch;
}

function resolvePdsHost(options = {}) {
  const host = isNonEmptyString(options.pdsHost)
    ? options.pdsHost.trim()
    : isNonEmptyString(process.env.ATPROTO_PDS_HOST)
      ? process.env.ATPROTO_PDS_HOST.trim()
      : '';

  if (!isNonEmptyString(host)) {
    throw new Error('ATProto PDS host is required');
  }

  return host.replace(/\/+$/, '');
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
    const message = payload && typeof payload === 'object' && isNonEmptyString(payload.error)
      ? payload.error
      : `${response.status} ${response.statusText}`;
    const error = new Error(`ATProto request failed: ${message}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function createSession(options = {}) {
  const pdsHost = resolvePdsHost(options);
  const identifier = isNonEmptyString(options.identifier)
    ? options.identifier.trim()
    : isNonEmptyString(process.env.ATPROTO_HANDLE)
      ? process.env.ATPROTO_HANDLE.trim()
      : '';
  const password = isNonEmptyString(options.password)
    ? options.password.trim()
    : isNonEmptyString(process.env.ATPROTO_APP_PASSWORD)
      ? process.env.ATPROTO_APP_PASSWORD.trim()
      : '';

  if (!isNonEmptyString(identifier)) {
    throw new Error('ATProto identifier is required');
  }
  if (!isNonEmptyString(password)) {
    throw new Error('ATProto app password is required');
  }

  return requestJson(`${pdsHost}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    body: {
      identifier,
      password,
    },
  });
}

async function createRecord(options = {}) {
  const pdsHost = resolvePdsHost(options);
  const accessJwt = isNonEmptyString(options.accessJwt) ? options.accessJwt.trim() : '';
  const repo = isNonEmptyString(options.repo) ? options.repo.trim() : '';
  const collection = isNonEmptyString(options.collection) ? options.collection.trim() : '';
  const record = options.record;

  if (!isNonEmptyString(accessJwt)) {
    throw new Error('accessJwt is required');
  }
  if (!isNonEmptyString(repo)) {
    throw new Error('repo is required');
  }
  if (!isNonEmptyString(collection)) {
    throw new Error('collection is required');
  }
  if (!record || typeof record !== 'object') {
    throw new Error('record must be an object');
  }

  return requestJson(`${pdsHost}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessJwt}`,
    },
    body: {
      repo,
      collection,
      record,
    },
  });
}

module.exports = {
  createRecord,
  createSession,
  resolvePdsHost,
};
