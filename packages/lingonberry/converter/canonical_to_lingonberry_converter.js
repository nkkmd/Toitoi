'use strict';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function convertCanonicalToLingonberryObject(canonical, options = {}) {
  const text = canonical?.body?.text;
  if (!isNonEmptyString(text)) {
    throw new Error('body.text is required');
  }

  const sourceId = isNonEmptyString(options.sourceId)
    ? options.sourceId.trim()
    : (isNonEmptyString(canonical.id) ? canonical.id.trim() : `draft:${Date.now()}`);
  const objectId = isNonEmptyString(options.objectId)
    ? options.objectId.trim()
    : (sourceId.startsWith('lb:obj:') ? sourceId : `lb:obj:${sourceId.replace(/^tt:evt:/, '')}`);

  const object = {
    id: objectId,
    schemaVersion: '0.1.0',
    type: isNonEmptyString(canonical.type) ? canonical.type.trim() : 'inquiry',
    createdAt: isNonEmptyString(canonical.createdAt) ? canonical.createdAt.trim() : new Date().toISOString(),
    body: {
      text: text.trim(),
      language: isNonEmptyString(canonical?.body?.language) ? canonical.body.language.trim() : 'und',
    },
    provenance: {
      sources: [{
        protocol: 'lingonberry',
        sourceId,
        observedAt: isNonEmptyString(canonical.createdAt) ? canonical.createdAt.trim() : new Date().toISOString(),
      }],
    },
    rawRef: {
      protocol: 'lingonberry',
      sourceId,
    },
  };

  if (canonical.contexts && typeof canonical.contexts === 'object' && !Array.isArray(canonical.contexts)) {
    object.contexts = cloneJson(canonical.contexts);
  }
  if (Array.isArray(canonical.relationships)) {
    object.relations = cloneJson(canonical.relationships);
  }
  if (Array.isArray(canonical.lineage)) {
    object.lineage = cloneJson(canonical.lineage);
  }
  if (Array.isArray(canonical.labels)) {
    object.labels = canonical.labels.filter(isNonEmptyString).map(label => label.trim());
  }
  if (canonical.meta && typeof canonical.meta === 'object') {
    object.meta = cloneJson(canonical.meta);
  }

  return object;
}

function fromTransportToCanonicalLingonberry(rawEvent, options = {}) {
  const { canonicalizeLingonberryEvent } = require('../adapter/lingonberry_adapter');
  const canonicalization = canonicalizeLingonberryEvent(rawEvent, options);
  return canonicalization.ok ? canonicalization.canonicalEvent : null;
}

module.exports = {
  convertCanonicalToLingonberryObject,
  fromTransportToCanonicalLingonberry,
};
