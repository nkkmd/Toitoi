'use strict';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function resolveCollection(options = {}) {
  if (isNonEmptyString(options.collection)) {
    return options.collection.trim();
  }

  return 'app.toitoi.inquiry';
}

function convertCanonicalToAtProtoDraft(canonical, options = {}) {
  const text = canonical?.body?.text;
  if (!isNonEmptyString(text)) {
    throw new Error('body.text is required');
  }

  const draft = {
    collection: resolveCollection(options),
    record: {
      type: isNonEmptyString(canonical.type) ? canonical.type.trim() : 'inquiry',
      text: text.trim(),
      language: isNonEmptyString(canonical?.body?.language) ? canonical.body.language.trim() : 'und',
      createdAt: isNonEmptyString(canonical.createdAt) ? canonical.createdAt.trim() : new Date().toISOString(),
    },
  };

  if (canonical.contexts && typeof canonical.contexts === 'object' && !Array.isArray(canonical.contexts)) {
    draft.record.contexts = cloneJson(canonical.contexts);
  }
  if (Array.isArray(canonical.relationships)) {
    draft.record.relationships = cloneJson(canonical.relationships);
  }
  if (isNonEmptyString(canonical.phase)) {
    draft.record.phase = canonical.phase.trim();
  }
  if (canonical.trigger && typeof canonical.trigger === 'object') {
    draft.record.trigger = cloneJson(canonical.trigger);
  }
  if (Array.isArray(canonical.lineage)) {
    draft.record.lineage = cloneJson(canonical.lineage);
  }
  if (Array.isArray(canonical.labels)) {
    draft.record.labels = canonical.labels.filter(isNonEmptyString).map(label => label.trim());
  }
  if (canonical.dsl && typeof canonical.dsl === 'object') {
    draft.record.dsl = cloneJson(canonical.dsl);
  }
  if (canonical.meta && typeof canonical.meta === 'object') {
    draft.record.meta = cloneJson(canonical.meta);
  }

  return draft;
}

function normalizeAtProtoLangs(canonical) {
  const language = canonical?.body?.language;
  if (!isNonEmptyString(language) || language.trim() === 'und') {
    return [];
  }

  return [language.trim()];
}

function convertCanonicalToBskyFeedPostDraft(canonical, options = {}) {
  const text = canonical?.body?.text;
  if (!isNonEmptyString(text)) {
    throw new Error('body.text is required');
  }

  const draft = {
    collection: 'app.bsky.feed.post',
    record: {
      text: text.trim(),
      createdAt: isNonEmptyString(canonical.createdAt) ? canonical.createdAt.trim() : new Date().toISOString(),
    },
  };

  const langs = normalizeAtProtoLangs(canonical);
  if (langs.length > 0) {
    draft.record.langs = langs;
  }

  if (options.includeLabels && Array.isArray(canonical.labels) && canonical.labels.length > 0) {
    draft.record.labels = canonical.labels
      .filter(isNonEmptyString)
      .map(label => label.trim())
      .filter(Boolean);
  }

  return draft;
}

function fromTransportToCanonicalAtProto(record, options = {}) {
  const { canonicalizeAtProtoRecord } = require('../adapter/atproto_adapter');
  const canonicalization = canonicalizeAtProtoRecord(record, options);
  if (!canonicalization.ok) {
    return null;
  }

  return canonicalization.canonicalEvent;
}

module.exports = {
  convertCanonicalToAtProtoDraft,
  convertCanonicalToBskyFeedPostDraft,
  fromTransportToCanonicalAtProto,
};
