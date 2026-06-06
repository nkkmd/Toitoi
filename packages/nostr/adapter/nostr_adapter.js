'use strict';

const {
  issueIdentityClaim,
  resolveCanonicalEventId,
} = require('@toitoi/protocol');

const VALID_NOSTR_INQUIRY_KIND = 1042;
const VALID_PHASES = new Set(['beginner', 'intermediate', 'expert']);
const VALID_DSL_SUBKEYS = new Set(['dsl:model', 'dsl:var', 'dsl:rel', 'dsl:meta']);
const VALID_DSL_VAR_ROLES = new Set(['independent', 'dependent', 'mediator', 'moderator']);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function asLanguageTag(value) {
  if (!isNonEmptyString(value)) {
    return 'und';
  }

  const normalized = value.trim();
  return /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(normalized) ? normalized : 'und';
}

function normalizeTag(tag) {
  return Array.isArray(tag) ? tag.map(item => (typeof item === 'string' ? item.trim() : String(item))) : [];
}

function validateNostrInquiryEvent(event) {
  const errors = [];
  const dslDeclared = new Set();
  const dslReferenced = new Set();

  if (!isPlainObject(event)) {
    return { ok: false, errors: ['event must be an object'] };
  }

  if (event.kind !== VALID_NOSTR_INQUIRY_KIND) {
    errors.push(`kind must be ${VALID_NOSTR_INQUIRY_KIND}`);
  }
  if (!isNonEmptyString(event.id)) {
    errors.push('id is required');
  }
  if (!isNonEmptyString(event.pubkey)) {
    errors.push('pubkey is required');
  }
  if (!Number.isInteger(event.created_at) || event.created_at < 0) {
    errors.push('created_at must be a non-negative integer');
  }
  if (!isNonEmptyString(event.content)) {
    errors.push('content is required');
  }
  if (!isNonEmptyString(event.sig)) {
    errors.push('sig is required');
  }
  if (!Array.isArray(event.tags)) {
    errors.push('tags must be an array');
  }

  if (Array.isArray(event.tags)) {
    event.tags.forEach((tag, index) => {
      if (!Array.isArray(tag) || tag.length === 0) {
        errors.push(`tags[${index}] must be a non-empty array`);
        return;
      }

      const key = tag[0];
      if (!isNonEmptyString(key)) {
        errors.push(`tags[${index}][0] must be a non-empty string`);
        return;
      }

      if (key === 'context' && (!isNonEmptyString(tag[1]) || !isNonEmptyString(tag[2]))) {
        errors.push(`tags[${index}] context must have category and value`);
      }

      if (key === 'relationship' && (!isNonEmptyString(tag[1]) || !isNonEmptyString(tag[2]))) {
        errors.push(`tags[${index}] relationship must have source and target`);
      }

      if (key === 'phase') {
        if (!isNonEmptyString(tag[1]) || !VALID_PHASES.has(tag[1])) {
          errors.push(`tags[${index}] has invalid phase`);
        }
      }

      if (key === 'trigger' && (!isNonEmptyString(tag[1]) || !isNonEmptyString(tag[2]))) {
        errors.push(`tags[${index}] trigger must have category and value`);
      }

      if (key === 'e' && !isNonEmptyString(tag[1])) {
        errors.push(`tags[${index}] lineage must have a target event id`);
      }

      if (key === 'dsl:model') {
        if (!isNonEmptyString(tag[1]) || !isNonEmptyString(tag[2])) {
          errors.push(`tags[${index}] dsl:model must have model_id and model name`);
        } else {
          dslDeclared.add(tag[1]);
        }
      }

      if (key === 'dsl:var') {
        if (!isNonEmptyString(tag[1]) || !isNonEmptyString(tag[2]) || !isNonEmptyString(tag[3])) {
          errors.push(`tags[${index}] dsl:var must have model_id, variable name, and role`);
        } else {
          dslReferenced.add(tag[1]);
          if (!VALID_DSL_VAR_ROLES.has(tag[3])) {
            errors.push(`tags[${index}] dsl:var role is invalid`);
          }
        }
      }

      if (key === 'dsl:rel') {
        if (!isNonEmptyString(tag[1]) || !isNonEmptyString(tag[2]) || !isNonEmptyString(tag[3])) {
          errors.push(`tags[${index}] dsl:rel must have model_id, source, and target`);
        } else {
          dslReferenced.add(tag[1]);
        }
      }

      if (key === 'dsl:meta') {
        if (!isNonEmptyString(tag[1]) || !isNonEmptyString(tag[2]) || !isNonEmptyString(tag[3])) {
          errors.push(`tags[${index}] dsl:meta must have model_id, key, and value`);
        } else {
          dslReferenced.add(tag[1]);
        }
      }
    });
  }

  for (const ref of dslReferenced) {
    if (!dslDeclared.has(ref)) {
      errors.push(`dsl model "${ref}" is referenced but not declared`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function verifyNostrEvent(event, options = {}) {
  const verifyFn = typeof options.verifyFn === 'function'
    ? options.verifyFn
    : tryLoadVerifyEvent();

  if (typeof verifyFn !== 'function') {
    return {
      ok: false,
      verified: false,
      skipped: true,
      reason: 'verify function is unavailable',
    };
  }

  try {
    const verified = Boolean(verifyFn(event));
    return {
      ok: verified,
      verified,
      skipped: false,
      reason: verified ? '' : 'signature verification failed',
    };
  } catch (error) {
    return {
      ok: false,
      verified: false,
      skipped: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function tryLoadVerifyEvent() {
  try {
    // Keep the adapter usable even when nostr-tools is not installed locally.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const { verifyEvent } = require('nostr-tools');
    return verifyEvent;
  } catch (error) {
    return null;
  }
}

function dedupeKey(event) {
  return isNonEmptyString(event?.id) ? event.id : null;
}

function compareEventsForOrdering(left, right) {
  const leftCreatedAt = Number.isInteger(left?.created_at) ? left.created_at : 0;
  const rightCreatedAt = Number.isInteger(right?.created_at) ? right.created_at : 0;

  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  const leftId = isNonEmptyString(left?.id) ? left.id : '';
  const rightId = isNonEmptyString(right?.id) ? right.id : '';
  if (leftId !== rightId) {
    return leftId.localeCompare(rightId);
  }

  const leftPubkey = isNonEmptyString(left?.pubkey) ? left.pubkey : '';
  const rightPubkey = isNonEmptyString(right?.pubkey) ? right.pubkey : '';
  return leftPubkey.localeCompare(rightPubkey);
}

function normalizeNostrEvent(event) {
  const validation = validateNostrInquiryEvent(event);
  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
      warnings: [],
      normalizedEvent: null,
    };
  }

  const warnings = [];
  const tags = Array.isArray(event.tags) ? event.tags.map(normalizeTag).filter(tag => tag.length > 0) : [];

  const normalizedEvent = {
    kind: event.kind,
    id: event.id.trim(),
    pubkey: event.pubkey.trim(),
    created_at: event.created_at,
    content: event.content.trim(),
    sig: event.sig.trim(),
    tags,
  };

  if (typeof event.relay === 'string' && event.relay.trim() !== '') {
    normalizedEvent.relay = event.relay.trim();
  }

  const labelCount = tags.filter(tag => tag[0] === 't').length;
  if (labelCount === 0) {
    warnings.push('missing t tag');
  }

  return {
    ok: true,
    errors: [],
    warnings,
    normalizedEvent,
  };
}

function canonicalizeNostrEvent(event, options = {}) {
  const normalization = normalizeNostrEvent(event);
  if (!normalization.ok) {
    return {
      ok: false,
      errors: normalization.errors,
      warnings: normalization.warnings,
      canonicalEvent: null,
    };
  }

  const normalizedEvent = normalization.normalizedEvent;
  const tags = normalizedEvent.tags;
  const contexts = {};
  const relationships = [];
  const lineage = [];
  const labels = [];
  const dslModels = new Map();
  const provenanceSources = [];
  let phase = null;
  let trigger = null;

  for (const tag of tags) {
    const [key, a, b, c] = tag;

    if (key === 't' && isNonEmptyString(a) && !labels.includes(a)) {
      labels.push(a);
      continue;
    }

    if (key === 'context' && isNonEmptyString(a) && isNonEmptyString(b)) {
      contexts[a] = b;
      continue;
    }

    if (key === 'relationship' && isNonEmptyString(a) && isNonEmptyString(b)) {
      relationships.push({ source: a, target: b });
      continue;
    }

    if (key === 'phase' && isNonEmptyString(a)) {
      if (VALID_PHASES.has(a)) {
        phase = a;
        continue;
      }
    }

    if (key === 'trigger' && isNonEmptyString(a) && isNonEmptyString(b)) {
      trigger = {
        category: a,
        value: b,
      };
      continue;
    }

    if (key === 'e' && isNonEmptyString(a)) {
      lineage.push({
        type: isNonEmptyString(c) ? c : 'reply',
        target: a,
      });
      continue;
    }

    if (VALID_DSL_SUBKEYS.has(key) && isNonEmptyString(a)) {
      const modelId = a;
      const existing = dslModels.get(modelId) ?? {
        id: modelId,
        name: '',
        variables: [],
        relations: [],
        meta: {},
      };

      if (key === 'dsl:model' && isNonEmptyString(b)) {
        existing.name = b;
      } else if (key === 'dsl:var' && isNonEmptyString(b)) {
        existing.variables.push({
          name: b,
          role: isNonEmptyString(c) && VALID_DSL_VAR_ROLES.has(c) ? c : 'independent',
        });
      } else if (key === 'dsl:rel' && isNonEmptyString(b) && isNonEmptyString(c)) {
        existing.relations.push({ source: b, target: c });
      } else if (key === 'dsl:meta' && isNonEmptyString(b) && isNonEmptyString(c)) {
        existing.meta[b] = c;
      }

      dslModels.set(modelId, existing);
    }
  }

  if (isNonEmptyString(normalizedEvent.pubkey)) {
    const source = {
      protocol: 'nostr',
      sourceId: normalizedEvent.id,
      kind: normalizedEvent.kind,
    };
    if (isNonEmptyString(normalizedEvent.relay)) {
      source.relay = normalizedEvent.relay;
    }
    provenanceSources.push(source);
  }

  const canonicalEvent = {
    id: resolveCanonicalEventId(normalizedEvent.id, options),
    schemaVersion: '0.3.1',
    type: options.type ?? 'inquiry',
    createdAt: new Date(normalizedEvent.created_at * 1000).toISOString(),
    body: {
      text: normalizedEvent.content,
      language: asLanguageTag(options.language || options.bodyLanguage),
    },
    provenance: {
      sources: provenanceSources,
    },
  };

  if (labels.length > 0) {
    canonicalEvent.labels = labels;
  }
  if (Object.keys(contexts).length > 0) {
    canonicalEvent.contexts = contexts;
  }
  if (relationships.length > 0) {
    canonicalEvent.relationships = relationships;
  }
  if (phase) {
    canonicalEvent.phase = phase;
  }
  if (trigger) {
    canonicalEvent.trigger = trigger;
  }
  if (lineage.length > 0) {
    canonicalEvent.lineage = lineage;
  }
  if (dslModels.size > 0) {
    canonicalEvent.dsl = {
      models: Array.from(dslModels.values()),
    };
  }
  if (Object.keys(options.meta ?? {}).length > 0) {
    canonicalEvent.meta = { ...options.meta };
  }
  canonicalEvent.rawRef = {
    protocol: 'nostr',
    sourceId: normalizedEvent.id,
  };
  if (isNonEmptyString(normalizedEvent.relay)) {
    canonicalEvent.rawRef.relay = normalizedEvent.relay;
  }
  if (isNonEmptyString(options.payloadHash)) {
    canonicalEvent.rawRef.payloadHash = options.payloadHash;
  }

  const identityClaim = issueIdentityClaim(canonicalEvent, {
    issuer: {
      protocol: 'nostr',
      sourceId: normalizedEvent.id,
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

function classifyEvent(event, options = {}) {
  const validation = validateNostrInquiryEvent(event);
  if (!validation.ok) {
    return {
      status: 'invalid',
      errors: validation.errors,
      warnings: [],
      dedupeKey: null,
      ordering: null,
      normalizedEvent: null,
      canonicalEvent: null,
    };
  }

  const verification = options.skipVerify
    ? { ok: true, verified: false, skipped: true, reason: '' }
    : verifyNostrEvent(event, options);

  const normalization = normalizeNostrEvent(event);
  if (!verification.ok && !verification.skipped) {
    return {
      status: 'invalid_signature',
      errors: [verification.reason || 'signature verification failed'],
      warnings: normalization.warnings,
      dedupeKey: dedupeKey(event),
      ordering: {
        created_at: event.created_at,
        kind: event.kind,
        id: event.id,
      },
      normalizedEvent: normalization.normalizedEvent,
      canonicalEvent: null,
      verification,
    };
  }

  const canonicalization = canonicalizeNostrEvent(event, options);

  return {
    status: verification.skipped ? 'unverified' : 'valid',
    errors: [],
    warnings: [...normalization.warnings, ...canonicalization.warnings],
    dedupeKey: dedupeKey(event),
    ordering: {
      created_at: event.created_at,
      kind: event.kind,
      id: event.id,
    },
    normalizedEvent: normalization.normalizedEvent,
    canonicalEvent: canonicalization.canonicalEvent,
    verification,
  };
}

function sortByTransportOrder(events) {
  return [...events].sort(compareEventsForOrdering);
}

module.exports = {
  VALID_NOSTR_INQUIRY_KIND,
  validateNostrInquiryEvent,
  verifyNostrEvent,
  normalizeNostrEvent,
  canonicalizeNostrEvent,
  classifyEvent,
  dedupeKey,
  compareEventsForOrdering,
  sortByTransportOrder,
};
