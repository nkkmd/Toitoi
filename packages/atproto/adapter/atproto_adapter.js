'use strict';

const crypto = require('crypto');

const VALID_CANONICAL_TYPES = new Set([
  'inquiry',
  'observation',
  'annotation',
  'response',
  'synthesis',
]);
const VALID_PHASES = new Set(['beginner', 'intermediate', 'expert']);
const VALID_DSL_VAR_ROLES = new Set(['independent', 'dependent', 'mediator', 'moderator']);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isValidDateTimeString(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value.trim()));
}

function asLanguageTag(value) {
  if (!isNonEmptyString(value)) {
    return 'und';
  }

  const normalized = value.trim();
  return /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(normalized) ? normalized : 'und';
}

function normalizeRelationList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => isPlainObject(item))
    .map(item => ({
      source: isNonEmptyString(item.source) ? item.source.trim() : '',
      target: isNonEmptyString(item.target) ? item.target.trim() : '',
    }))
    .filter(item => item.source !== '' && item.target !== '');
}

function normalizeLineageList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => isPlainObject(item))
    .map(item => ({
      type: isNonEmptyString(item.type) ? item.type.trim() : 'derived_from',
      target: isNonEmptyString(item.target) ? item.target.trim() : '',
    }))
    .filter(item => item.target !== '');
}

function normalizeDslModels(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const models = [];

  for (const model of value) {
    if (!isPlainObject(model) || !isNonEmptyString(model.id) || !isNonEmptyString(model.name)) {
      continue;
    }

    const normalized = {
      id: model.id.trim(),
      name: model.name.trim(),
      variables: [],
      relations: normalizeRelationList(model.relations),
      meta: isPlainObject(model.meta) ? { ...model.meta } : {},
    };

    if (Array.isArray(model.variables)) {
      for (const variable of model.variables) {
        if (!isPlainObject(variable) || !isNonEmptyString(variable.name)) {
          continue;
        }

        const role = isNonEmptyString(variable.role) && VALID_DSL_VAR_ROLES.has(variable.role.trim())
          ? variable.role.trim()
          : 'independent';

        normalized.variables.push({
          name: variable.name.trim(),
          role,
        });
      }
    }

    models.push(normalized);
  }

  return models;
}

function validateAtProtoRecord(event) {
  const errors = [];

  if (!isPlainObject(event)) {
    return { ok: false, errors: ['event must be an object'] };
  }

  if (!isNonEmptyString(event.uri) || !event.uri.trim().startsWith('at://')) {
    errors.push('uri must be an at:// URI');
  }
  if (!isNonEmptyString(event.did)) {
    errors.push('did is required');
  }
  if (!isNonEmptyString(event.collection)) {
    errors.push('collection is required');
  } else if (event.collection.trim() !== 'app.toitoi.inquiry') {
    errors.push('collection must be app.toitoi.inquiry');
  }
  if (!isNonEmptyString(event.rkey)) {
    errors.push('rkey is required');
  }
  if (event.cid !== undefined && !isNonEmptyString(event.cid)) {
    errors.push('cid must be a non-empty string when provided');
  }
  if (!isPlainObject(event.record)) {
    errors.push('record is required');
  }

  const record = isPlainObject(event.record) ? event.record : {};
  if (!isNonEmptyString(record.text) && !(isPlainObject(record.body) && isNonEmptyString(record.body.text))) {
    errors.push('record.text is required');
  }

  if (record.language !== undefined && !isNonEmptyString(record.language)) {
    errors.push('record.language must be a non-empty string when provided');
  } else if (record.language !== undefined && asLanguageTag(record.language) === 'und' && record.language.trim() !== 'und') {
    errors.push('record.language must be a valid language tag');
  }

  if (record.type !== undefined && (!isNonEmptyString(record.type) || !VALID_CANONICAL_TYPES.has(record.type.trim()))) {
    errors.push('record.type is invalid');
  }

  if (record.phase !== undefined && (!isNonEmptyString(record.phase) || !VALID_PHASES.has(record.phase.trim()))) {
    errors.push('record.phase is invalid');
  }

  if (record.trigger !== undefined && !isPlainObject(record.trigger)) {
    errors.push('record.trigger must be an object when provided');
  } else if (isPlainObject(record.trigger)) {
    if (!isNonEmptyString(record.trigger.category) || !isNonEmptyString(record.trigger.value)) {
      errors.push('record.trigger must include category and value');
    }
  }

  if (record.contexts !== undefined && !isPlainObject(record.contexts)) {
    errors.push('record.contexts must be an object when provided');
  }

  if (record.meta !== undefined && !isPlainObject(record.meta)) {
    errors.push('record.meta must be an object when provided');
  }

  if (record.relationships !== undefined) {
    if (!Array.isArray(record.relationships)) {
      errors.push('record.relationships must be an array when provided');
    } else {
      for (const [index, relation] of record.relationships.entries()) {
        if (!isPlainObject(relation) || !isNonEmptyString(relation.source) || !isNonEmptyString(relation.target)) {
          errors.push(`record.relationships[${index}] is invalid`);
        }
      }
    }
  }

  if (record.lineage !== undefined) {
    if (!Array.isArray(record.lineage)) {
      errors.push('record.lineage must be an array when provided');
    } else {
      for (const [index, edge] of record.lineage.entries()) {
        if (!isPlainObject(edge) || !isNonEmptyString(edge.type) || !isNonEmptyString(edge.target)) {
          errors.push(`record.lineage[${index}] is invalid`);
        }
      }
    }
  }

  if (record.dsl !== undefined) {
    if (!isPlainObject(record.dsl) || !Array.isArray(record.dsl.models)) {
      errors.push('record.dsl must be an object with models when provided');
    } else {
      for (const [index, model] of record.dsl.models.entries()) {
        if (!isPlainObject(model) || !isNonEmptyString(model.id) || !isNonEmptyString(model.name)) {
          errors.push(`record.dsl.models[${index}] is invalid`);
          continue;
        }

        if (Array.isArray(model.variables)) {
          for (const [varIndex, variable] of model.variables.entries()) {
            if (!isPlainObject(variable) || !isNonEmptyString(variable.name) || !isNonEmptyString(variable.role)) {
              errors.push(`record.dsl.models[${index}].variables[${varIndex}] is invalid`);
            }
          }
        }

        if (Array.isArray(model.relations)) {
          for (const [relIndex, relation] of model.relations.entries()) {
            if (!isPlainObject(relation) || !isNonEmptyString(relation.source) || !isNonEmptyString(relation.target)) {
              errors.push(`record.dsl.models[${index}].relations[${relIndex}] is invalid`);
            }
          }
        }

        if (model.meta !== undefined && !isPlainObject(model.meta)) {
          errors.push(`record.dsl.models[${index}].meta must be an object when provided`);
        }
      }
    }
  }

  if (event.createdAt !== undefined && !isValidDateTimeString(event.createdAt)) {
    errors.push('createdAt must be a non-empty string when provided');
  }
  if (event.indexedAt !== undefined && !isValidDateTimeString(event.indexedAt)) {
    errors.push('indexedAt must be a non-empty string when provided');
  }

  return { ok: errors.length === 0, errors };
}

function normalizeAtProtoRecord(event) {
  const validation = validateAtProtoRecord(event);
  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
      warnings: [],
      normalizedEvent: null,
    };
  }

  const warnings = [];
  const record = event.record;
  const normalizedRecord = {
    type: isNonEmptyString(record.type) ? record.type.trim() : 'inquiry',
    text: isNonEmptyString(record.text) ? record.text.trim() : record.body.text.trim(),
    language: asLanguageTag(record.language ?? record.body?.language),
    contexts: isPlainObject(record.contexts) ? { ...record.contexts } : {},
    relationships: normalizeRelationList(record.relationships),
    phase: isNonEmptyString(record.phase) && VALID_PHASES.has(record.phase.trim()) ? record.phase.trim() : '',
    trigger: isPlainObject(record.trigger)
      ? {
          category: isNonEmptyString(record.trigger.category) ? record.trigger.category.trim() : '',
          value: isNonEmptyString(record.trigger.value) ? record.trigger.value.trim() : '',
        }
      : null,
    lineage: normalizeLineageList(record.lineage),
    labels: Array.isArray(record.labels)
      ? record.labels.filter(isNonEmptyString).map(label => label.trim()).filter(Boolean)
      : [],
    meta: isPlainObject(record.meta) ? { ...record.meta } : {},
    dsl: isPlainObject(record.dsl) ? { models: normalizeDslModels(record.dsl.models) } : null,
  };

  if (!isNonEmptyString(record.language)) {
    warnings.push('record.language defaulted to und');
  }

  if (normalizedRecord.trigger && (normalizedRecord.trigger.category === '' || normalizedRecord.trigger.value === '')) {
    normalizedRecord.trigger = null;
  }

  if (!normalizedRecord.phase) {
    delete normalizedRecord.phase;
  }

  if (normalizedRecord.labels.length === 0) {
    delete normalizedRecord.labels;
  }

  if (Object.keys(normalizedRecord.contexts).length === 0) {
    delete normalizedRecord.contexts;
  }

  if (normalizedRecord.relationships.length === 0) {
    delete normalizedRecord.relationships;
  }

  if (normalizedRecord.lineage.length === 0) {
    delete normalizedRecord.lineage;
  }

  if (Object.keys(normalizedRecord.meta).length === 0) {
    delete normalizedRecord.meta;
  }

  if (!normalizedRecord.dsl || normalizedRecord.dsl.models.length === 0) {
    delete normalizedRecord.dsl;
  }

  const normalizedEvent = {
    uri: event.uri.trim(),
    cid: isNonEmptyString(event.cid) ? event.cid.trim() : '',
    did: event.did.trim(),
    collection: event.collection.trim(),
    rkey: event.rkey.trim(),
    record: normalizedRecord,
  };

  if (isNonEmptyString(event.createdAt)) {
    normalizedEvent.createdAt = event.createdAt.trim();
  }
  if (isNonEmptyString(event.indexedAt)) {
    normalizedEvent.indexedAt = event.indexedAt.trim();
  }

  return {
    ok: true,
    errors: [],
    warnings,
    normalizedEvent,
  };
}

function deriveStableToken(sourceId) {
  const text = isNonEmptyString(sourceId) ? sourceId.trim() : 'atproto';
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const digest = crypto.createHash('sha256').update(text).digest();
  let value = BigInt(`0x${digest.subarray(0, 16).toString('hex')}`);
  let token = '';

  for (let index = 0; index < 26; index += 1) {
    const charIndex = Number(value & 31n);
    token = alphabet[charIndex] + token;
    value >>= 5n;
  }

  return token;
}

function canonicalizeAtProtoRecord(event, options = {}) {
  const normalization = normalizeAtProtoRecord(event);
  if (!normalization.ok) {
    return {
      ok: false,
      errors: normalization.errors,
      warnings: normalization.warnings,
      canonicalEvent: null,
    };
  }

  const normalizedEvent = normalization.normalizedEvent;
  const record = normalizedEvent.record;
  const createdAt = isNonEmptyString(normalizedEvent.createdAt)
    ? normalizedEvent.createdAt
    : (isNonEmptyString(normalizedEvent.indexedAt)
      ? normalizedEvent.indexedAt
      : new Date().toISOString());

  const provenanceSource = {
    protocol: 'atproto',
    sourceId: normalizedEvent.uri,
    uri: normalizedEvent.uri,
    did: normalizedEvent.did,
    collection: normalizedEvent.collection,
    rkey: normalizedEvent.rkey,
  };

  if (isNonEmptyString(normalizedEvent.cid)) {
    provenanceSource.cid = normalizedEvent.cid;
  }
  if (isNonEmptyString(createdAt)) {
    provenanceSource.createdAt = createdAt;
  }

  const canonicalEvent = {
    id: options.id ?? `tt:evt:${deriveStableToken(normalizedEvent.uri || normalizedEvent.cid || normalizedEvent.rkey)}`,
    schemaVersion: '0.3.1',
    type: options.type ?? record.type ?? 'inquiry',
    createdAt,
    body: {
      text: record.text,
      language: asLanguageTag(record.language),
    },
    provenance: {
      sources: [provenanceSource],
    },
  };

  if (record.contexts) {
    canonicalEvent.contexts = { ...record.contexts };
  }
  if (record.relationships) {
    canonicalEvent.relationships = record.relationships.map(relation => ({ ...relation }));
  }
  if (record.phase) {
    canonicalEvent.phase = record.phase;
  }
  if (record.trigger) {
    canonicalEvent.trigger = { ...record.trigger };
  }
  if (record.lineage) {
    canonicalEvent.lineage = record.lineage.map(edge => ({ ...edge }));
  }
  if (record.labels) {
    canonicalEvent.labels = record.labels.slice();
  }
  if (record.dsl) {
    canonicalEvent.dsl = {
      models: record.dsl.models.map(model => ({
        id: model.id,
        name: model.name,
        variables: Array.isArray(model.variables) ? model.variables.map(variable => ({ ...variable })) : [],
        relations: Array.isArray(model.relations) ? model.relations.map(relation => ({ ...relation })) : [],
        meta: model.meta ? { ...model.meta } : {},
      })),
    };
  }
  if (record.meta) {
    canonicalEvent.meta = { ...record.meta };
  }

  canonicalEvent.rawRef = {
    protocol: 'atproto',
    sourceId: normalizedEvent.uri,
  };

  return {
    ok: true,
    errors: [],
    warnings: normalization.warnings,
    canonicalEvent,
  };
}

function verifyAtProtoRecord(event) {
  return {
    ok: true,
    verified: false,
    skipped: true,
    reason: 'ATProto trust is derived from repository metadata in this MVP',
  };
}

function dedupeKey(event) {
  if (isNonEmptyString(event?.uri)) {
    return event.uri.trim();
  }
  if (isNonEmptyString(event?.cid)) {
    return event.cid.trim();
  }
  if (isNonEmptyString(event?.did) && isNonEmptyString(event?.collection) && isNonEmptyString(event?.rkey)) {
    return `${event.did.trim()}/${event.collection.trim()}/${event.rkey.trim()}`;
  }
  return null;
}

function compareEventsForOrdering(left, right) {
  const leftCreatedAt = isNonEmptyString(left?.createdAt) ? Date.parse(left.createdAt) : NaN;
  const rightCreatedAt = isNonEmptyString(right?.createdAt) ? Date.parse(right.createdAt) : NaN;
  const leftIndexedAt = isNonEmptyString(left?.indexedAt) ? Date.parse(left.indexedAt) : NaN;
  const rightIndexedAt = isNonEmptyString(right?.indexedAt) ? Date.parse(right.indexedAt) : NaN;

  const leftTime = Number.isFinite(leftIndexedAt) ? leftIndexedAt : leftCreatedAt;
  const rightTime = Number.isFinite(rightIndexedAt) ? rightIndexedAt : rightCreatedAt;

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  const leftKey = dedupeKey(left) ?? '';
  const rightKey = dedupeKey(right) ?? '';
  return leftKey.localeCompare(rightKey);
}

function sortByTransportOrder(events) {
  return [...events].sort(compareEventsForOrdering);
}

function classifyEvent(event, options = {}) {
  const validation = validateAtProtoRecord(event);
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
    : verifyAtProtoRecord(event, options);

  const normalization = normalizeAtProtoRecord(event);
  const canonicalization = canonicalizeAtProtoRecord(event, options);

  return {
    status: verification.skipped ? 'unverified' : 'valid',
    errors: [],
    warnings: [...normalization.warnings, ...canonicalization.warnings],
    dedupeKey: dedupeKey(event),
    ordering: {
      createdAt: normalization.normalizedEvent?.createdAt ?? null,
      indexedAt: normalization.normalizedEvent?.indexedAt ?? null,
      uri: normalization.normalizedEvent?.uri ?? null,
    },
    normalizedEvent: normalization.normalizedEvent,
    canonicalEvent: canonicalization.canonicalEvent,
    verification,
  };
}

module.exports = {
  asLanguageTag,
  canonicalizeAtProtoRecord,
  classifyEvent,
  compareEventsForOrdering,
  dedupeKey,
  deriveStableToken,
  normalizeAtProtoRecord,
  sortByTransportOrder,
  validateAtProtoRecord,
  verifyAtProtoRecord,
};
