'use strict';

const { convertCanonicalToAtProtoDraft } = require('../converter/canonical_to_atproto_converter');
const { createRecord, createSession } = require('./atproto_client');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function resolveRecordWriter(options = {}) {
  if (typeof options.createRecord === 'function') {
    return options.createRecord;
  }

  return createRecord;
}

function resolveSessionCreator(options = {}) {
  if (typeof options.createSession === 'function') {
    return options.createSession;
  }

  return createSession;
}

function resolveRepo(options = {}, session = null) {
  if (isNonEmptyString(options.repo)) {
    return options.repo.trim();
  }

  if (session && isNonEmptyString(session.did)) {
    return session.did.trim();
  }

  throw new Error('ATProto repo is required');
}

function resolveAccessJwt(options = {}, session = null) {
  if (isNonEmptyString(options.accessJwt)) {
    return options.accessJwt.trim();
  }

  if (session && isNonEmptyString(session.accessJwt)) {
    return session.accessJwt.trim();
  }

  throw new Error('ATProto accessJwt is required');
}

async function publishCanonicalEventToAtProto(canonicalEvent, options = {}) {
  const draft = convertCanonicalToAtProtoDraft(canonicalEvent, options.converterOptions || {});
  const createRecordImpl = resolveRecordWriter(options);
  const createSessionImpl = resolveSessionCreator(options);
  const session = options.session || (options.skipSession !== true ? await createSessionImpl(options.sessionOptions || {}) : null);
  const repo = resolveRepo(options, session);
  const accessJwt = resolveAccessJwt(options, session);

  const created = await createRecordImpl({
    pdsHost: options.pdsHost,
    accessJwt,
    repo,
    collection: draft.collection,
    record: draft.record,
  });

  return {
    protocol: 'atproto',
    draft,
    session,
    created,
  };
}

module.exports = {
  publishCanonicalEventToAtProto,
  resolveRecordWriter,
  resolveSessionCreator,
  resolveRepo,
  resolveAccessJwt,
};
