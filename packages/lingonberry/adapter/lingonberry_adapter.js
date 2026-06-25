'use strict';

const { createPublicKey, verify: verifySignature } = require('crypto');
const {
  issueIdentityClaim,
  resolveCanonicalEventId,
} = require('../../protocol');

const KNOWLEDGE_OBJECT_SCHEMA_VERSION = '0.1.0';
const VALID_TYPES = new Set([
  'inquiry',
  'observation',
  'claim',
  'evidence',
  'annotation',
  'synthesis',
  'translation',
  'reference',
  'concept',
]);
const VALID_LINEAGE_TYPES = new Set(['derived_from', 'revises', 'supersedes', 'translates', 'synthesizes']);
const VALID_STATUSES = new Set(['draft', 'active', 'superseded', 'deprecated', 'archived']);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isDateTime(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value.trim()));
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
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

function detectLingonberryShape(value) {
  if (isPlainObject(value) && isPlainObject(value.object) && isPlainObject(value.publisher)) {
    return 'publish-request';
  }
  return 'knowledge-object';
}

function getKnowledgeObject(rawEvent) {
  return detectLingonberryShape(rawEvent) === 'publish-request' ? rawEvent.object : rawEvent;
}

function validateLanguageTag(value, errors, path) {
  if (!isNonEmptyString(value) || !/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(value.trim())) {
    errors.push(`${path} must be a BCP47-style language tag`);
  }
}

function validateRelationList(value, errors, path) {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array when provided`);
    return;
  }
  for (const [index, relation] of value.entries()) {
    if (!isPlainObject(relation) || !isNonEmptyString(relation.source) || !isNonEmptyString(relation.target)) {
      errors.push(`${path}[${index}] must include source and target`);
    }
  }
}

function validateLineage(value, errors) {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    errors.push('lineage must be an array when provided');
    return;
  }
  for (const [index, edge] of value.entries()) {
    if (!isPlainObject(edge) || !isNonEmptyString(edge.type) || !isNonEmptyString(edge.target)) {
      errors.push(`lineage[${index}] must include type and target`);
      continue;
    }
    if (!VALID_LINEAGE_TYPES.has(edge.type.trim())) {
      errors.push(`lineage[${index}].type is invalid`);
    }
  }
}

function validateKnowledgeObject(object) {
  const errors = [];
  if (!isPlainObject(object)) {
    return ['knowledge object must be an object'];
  }

  for (const field of ['id', 'schemaVersion', 'type', 'createdAt', 'body', 'provenance', 'rawRef']) {
    if (!(field in object)) {
      errors.push(`missing required field: ${field}`);
    }
  }

  if (!isNonEmptyString(object.id) || !object.id.trim().startsWith('lb:obj:')) {
    errors.push('id must match ^lb:obj:[^\\s]+$');
  }
  if (object.schemaVersion !== KNOWLEDGE_OBJECT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${KNOWLEDGE_OBJECT_SCHEMA_VERSION}`);
  }
  if (!isNonEmptyString(object.type) || !VALID_TYPES.has(object.type.trim())) {
    errors.push('type must be one of the supported Lingonberry knowledge object types');
  }
  if (!isDateTime(object.createdAt)) {
    errors.push('createdAt must be a valid date-time string');
  }

  if (!isPlainObject(object.body)) {
    errors.push('body must be an object');
  } else {
    if (!isNonEmptyString(object.body.text)) {
      errors.push('body.text must be a non-empty string');
    }
    validateLanguageTag(object.body.language, errors, 'body.language');
  }

  if (object.contexts !== undefined && !isPlainObject(object.contexts)) {
    errors.push('contexts must be an object when provided');
  }
  validateRelationList(object.relations, errors, 'relations');
  if (object.status !== undefined && (!isNonEmptyString(object.status) || !VALID_STATUSES.has(object.status.trim()))) {
    errors.push('status is invalid');
  }
  validateLineage(object.lineage, errors);

  if (!isPlainObject(object.provenance) || !Array.isArray(object.provenance.sources) || object.provenance.sources.length === 0) {
    errors.push('provenance.sources must be a non-empty array');
  } else {
    for (const [index, source] of object.provenance.sources.entries()) {
      if (!isPlainObject(source) || !isNonEmptyString(source.protocol) || !isNonEmptyString(source.sourceId)) {
        errors.push(`provenance.sources[${index}] must include protocol and sourceId`);
      }
      if (source?.observedAt !== undefined && !isDateTime(source.observedAt)) {
        errors.push(`provenance.sources[${index}].observedAt must be a valid date-time string`);
      }
    }
  }

  if (!isPlainObject(object.rawRef)) {
    errors.push('rawRef must be an object');
  } else {
    if (!isNonEmptyString(object.rawRef.protocol)) {
      errors.push('rawRef.protocol must be a non-empty string');
    }
    if (!isNonEmptyString(object.rawRef.sourceId)) {
      errors.push('rawRef.sourceId must be a non-empty string');
    }
  }

  return errors;
}

function canonicalPublishRequestPayload(value) {
  const cloned = cloneJson(value);
  if (isPlainObject(cloned?.publisher)) {
    delete cloned.publisher.signature;
  }
  return canonicalJson(cloned);
}

function verifyPublishRequestSignature(value) {
  if (!isPlainObject(value?.publisher)) {
    return {
      ok: true,
      verified: false,
      skipped: true,
      reason: 'raw event is a knowledge object without publish envelope',
    };
  }

  const { publicKey, signature } = value.publisher;
  if (!/^[0-9a-f]{64}$/.test(publicKey ?? '') || !/^[0-9a-f]{128}$/.test(signature ?? '')) {
    return {
      ok: false,
      verified: false,
      skipped: false,
      reason: 'publisher publicKey or signature is not canonical lowercase hex',
    };
  }

  try {
    const key = createPublicKey({
      key: {
        kty: 'OKP',
        crv: 'Ed25519',
        x: Buffer.from(publicKey, 'hex').toString('base64url'),
      },
      format: 'jwk',
    });
    const ok = verifySignature(null, Buffer.from(canonicalPublishRequestPayload(value), 'utf8'), key, Buffer.from(signature, 'hex'));
    return {
      ok,
      verified: ok,
      skipped: false,
      reason: ok ? '' : 'publisher.signature does not verify the canonical request payload',
    };
  } catch (error) {
    return {
      ok: false,
      verified: false,
      skipped: false,
      reason: `publisher.signature verification failed: ${error.message}`,
    };
  }
}

function validateLingonberryEvent(rawEvent) {
  const errors = [];
  if (!isPlainObject(rawEvent)) {
    return { ok: false, errors: ['event must be an object'] };
  }

  if (detectLingonberryShape(rawEvent) === 'publish-request') {
    if (!isPlainObject(rawEvent.publisher)) {
      errors.push('publisher must be an object');
    } else {
      if (!/^[0-9a-f]{64}$/.test(rawEvent.publisher.publicKey ?? '')) {
        errors.push('publisher.publicKey must be a 64-character lowercase hex string');
      }
      if (!/^[0-9a-f]{128}$/.test(rawEvent.publisher.signature ?? '')) {
        errors.push('publisher.signature must be a 128-character lowercase hex string');
      }
    }
  }

  errors.push(...validateKnowledgeObject(getKnowledgeObject(rawEvent)).map(error => (
    detectLingonberryShape(rawEvent) === 'publish-request' ? `object.${error}` : error
  )));

  return { ok: errors.length === 0, errors };
}

function normalizeLingonberryEvent(rawEvent) {
  const validation = validateLingonberryEvent(rawEvent);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, warnings: [], normalizedEvent: null };
  }

  return {
    ok: true,
    errors: [],
    warnings: [],
    normalizedEvent: sortKeys(cloneJson(rawEvent)),
  };
}

function verifyLingonberryEvent(rawEvent) {
  return verifyPublishRequestSignature(rawEvent);
}

function sourceIdForEvent(rawEvent) {
  const object = getKnowledgeObject(rawEvent);
  if (isNonEmptyString(object?.rawRef?.sourceId)) {
    return object.rawRef.sourceId.trim();
  }
  if (isNonEmptyString(object?.id)) {
    return object.id.trim();
  }
  return null;
}

function dedupeKey(rawEvent) {
  const object = getKnowledgeObject(rawEvent);
  return sourceIdForEvent(rawEvent) ?? (isNonEmptyString(object?.id) ? object.id.trim() : null);
}

function canonicalizeLingonberryEvent(rawEvent, options = {}) {
  const normalization = normalizeLingonberryEvent(rawEvent);
  if (!normalization.ok) {
    return {
      ok: false,
      errors: normalization.errors,
      warnings: normalization.warnings,
      canonicalEvent: null,
    };
  }

  const normalizedEvent = normalization.normalizedEvent;
  const object = getKnowledgeObject(normalizedEvent);
  const sourceId = sourceIdForEvent(normalizedEvent) ?? object.id;
  const canonicalEvent = {
    id: resolveCanonicalEventId(sourceId, options),
    schemaVersion: '0.1.0',
    type: object.type,
    createdAt: object.createdAt,
    body: {
      text: object.body.text,
      language: object.body.language,
    },
    provenance: {
      sources: [{
        protocol: 'lingonberry',
        sourceId,
        objectId: object.id,
        authorId: object.provenance.sources[0]?.authorId,
        observedAt: object.provenance.sources[0]?.observedAt ?? object.createdAt,
      }],
    },
    rawRef: {
      protocol: 'lingonberry',
      sourceId,
    },
  };

  if (object.contexts) {
    canonicalEvent.contexts = cloneJson(object.contexts);
  }
  if (Array.isArray(object.relations)) {
    canonicalEvent.relationships = object.relations.map(relation => ({ ...relation }));
  }
  if (Array.isArray(object.lineage)) {
    canonicalEvent.lineage = object.lineage.map(edge => ({ ...edge }));
  }
  if (Array.isArray(object.labels)) {
    canonicalEvent.labels = object.labels.filter(isNonEmptyString).map(label => label.trim());
  }
  if (isNonEmptyString(object.status)) {
    canonicalEvent.meta = {
      ...(canonicalEvent.meta || {}),
      lingonberryStatus: object.status.trim(),
    };
  }

  if (isNonEmptyString(object.rawRef?.locator)) {
    canonicalEvent.rawRef.locator = object.rawRef.locator.trim();
  }
  if (isNonEmptyString(object.rawRef?.payloadHash)) {
    canonicalEvent.rawRef.payloadHash = object.rawRef.payloadHash.trim();
  }

  const identityClaim = issueIdentityClaim(canonicalEvent, {
    issuer: {
      protocol: 'lingonberry',
      sourceId,
    },
    signer: options.identityClaimSigner || null,
    verificationMethod: options.identityClaimVerificationMethod,
    ruleVersion: options.identityClaimRuleVersion,
    identityKeyOptions: options.identityKeyOptions,
  });
  canonicalEvent.identityClaims = [identityClaim];

  return {
    ok: true,
    errors: [],
    warnings: normalization.warnings,
    canonicalEvent,
  };
}

function compareEventsForOrdering(left, right) {
  const leftObject = getKnowledgeObject(left);
  const rightObject = getKnowledgeObject(right);
  const leftTime = Date.parse(leftObject?.createdAt ?? '');
  const rightTime = Date.parse(rightObject?.createdAt ?? '');
  const normalizedLeft = Number.isFinite(leftTime) ? leftTime : 0;
  const normalizedRight = Number.isFinite(rightTime) ? rightTime : 0;
  if (normalizedLeft !== normalizedRight) {
    return normalizedLeft - normalizedRight;
  }
  return (dedupeKey(left) ?? '').localeCompare(dedupeKey(right) ?? '');
}

function sortByTransportOrder(events) {
  return [...events].sort(compareEventsForOrdering);
}

function classifyEvent(rawEvent, options = {}) {
  const validation = validateLingonberryEvent(rawEvent);
  if (!validation.ok) {
    return {
      status: 'invalid',
      errors: validation.errors,
      warnings: [],
      dedupeKey: null,
      ordering: null,
      normalizedEvent: null,
      canonicalEvent: null,
      verification: null,
    };
  }

  const verification = options.skipVerify
    ? { ok: true, verified: false, skipped: true, reason: '' }
    : verifyLingonberryEvent(rawEvent);
  const canonicalization = canonicalizeLingonberryEvent(rawEvent, options);

  return {
    status: verification.ok ? 'valid' : 'unverified',
    errors: verification.ok ? [] : [verification.reason],
    warnings: canonicalization.warnings,
    dedupeKey: dedupeKey(rawEvent),
    ordering: {
      createdAt: getKnowledgeObject(rawEvent)?.createdAt ?? null,
      sourceId: sourceIdForEvent(rawEvent),
    },
    normalizedEvent: normalizeLingonberryEvent(rawEvent).normalizedEvent,
    canonicalEvent: canonicalization.canonicalEvent,
    verification,
  };
}

module.exports = {
  canonicalizeLingonberryEvent,
  classifyEvent,
  compareEventsForOrdering,
  dedupeKey,
  detectLingonberryShape,
  getKnowledgeObject,
  normalizeLingonberryEvent,
  sortByTransportOrder,
  validateLingonberryEvent,
  verifyLingonberryEvent,
};
