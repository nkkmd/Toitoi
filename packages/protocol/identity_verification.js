'use strict';

const crypto = require('crypto');

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stableCompare(left, right) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function stableNormalize(value) {
  if (Array.isArray(value)) {
    const normalized = value
      .map(item => stableNormalize(item))
      .map(item => ({
        key: JSON.stringify(item),
        value: item,
      }))
      .sort((left, right) => stableCompare(left.key, right.key));

    const result = [];
    const seen = new Set();

    for (const item of normalized) {
      if (seen.has(item.key)) {
        continue;
      }
      seen.add(item.key);
      result.push(item.value);
    }

    return result;
  }

  if (isPlainObject(value)) {
    const normalized = {};
    for (const key of Object.keys(value).sort(stableCompare)) {
      normalized[key] = stableNormalize(value[key]);
    }
    return normalized;
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableNormalize(value));
}

function hashUtf8(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function toBuffer(value) {
  return Buffer.from(value, 'utf8');
}

function normalizeKeyObject(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && typeof value.type === 'string') {
    return value;
  }

  try {
    return crypto.createPrivateKey(value);
  } catch (error) {
    try {
      return crypto.createPublicKey(value);
    } catch (innerError) {
      return null;
    }
  }
}

const DEFAULT_IDENTITY_KEY_FIELDS = [
  'schemaVersion',
  'type',
  'createdAt',
  'body',
  'contexts',
  'relationships',
  'phase',
  'trigger',
  'lineage',
];

function normalizeIdentityKeyFields(fields) {
  const list = Array.isArray(fields) && fields.length > 0 ? fields : DEFAULT_IDENTITY_KEY_FIELDS;
  return list.filter(isNonEmptyString).map(field => field.trim());
}

function extractIdentityKeySource(event, options = {}) {
  if (!isPlainObject(event)) {
    return {};
  }

  const source = {};
  for (const field of normalizeIdentityKeyFields(options.fields)) {
    if (event[field] !== undefined) {
      source[field] = cloneJson(event[field]);
    }
  }

  return source;
}

function buildIdentityKeyPayload(event, options = {}) {
  return {
    schemaVersion: '0.1.0',
    ruleVersion: isNonEmptyString(options.ruleVersion) ? options.ruleVersion.trim() : 'identity-key-v1',
    fields: normalizeIdentityKeyFields(options.fields),
    source: extractIdentityKeySource(event, options),
  };
}

function createIdentityKey(event, options = {}) {
  const payload = buildIdentityKeyPayload(event, options);
  const digest = hashUtf8(stableStringify(payload));
  return `tt:key:${payload.ruleVersion}:sha256:${digest}`;
}

function normalizeIdentityKey(value, options = {}) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const normalized = value.trim();
  if (normalized.startsWith('tt:key:')) {
    return normalized;
  }

  if (normalized.startsWith('tt:')) {
    return null;
  }

  const ruleVersion = isNonEmptyString(options.ruleVersion) ? options.ruleVersion.trim() : 'identity-key-v1';
  if (/^[0-9a-f]{64}$/i.test(normalized)) {
    return `tt:key:${ruleVersion}:sha256:${normalized.toLowerCase()}`;
  }

  return `tt:key:${ruleVersion}:sha256:${hashUtf8(normalized)}`;
}

function extractRuleVersionFromIdentityKey(identityKey) {
  if (!isNonEmptyString(identityKey)) {
    return null;
  }

  const parts = identityKey.trim().split(':');
  if (parts.length < 5 || parts[0] !== 'tt' || parts[1] !== 'key') {
    return null;
  }

  return parts[2];
}

function normalizeCanonicalId(value) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const normalized = value.trim();
  if (normalized.startsWith('tt:evt:')) {
    return normalized;
  }

  if (normalized.startsWith('tt:')) {
    return null;
  }

  return `tt:evt:${normalized}`;
}

function normalizeIssuer(input) {
  if (!isPlainObject(input)) {
    return {
      protocol: 'unknown',
      sourceId: 'unknown',
    };
  }

  return {
    protocol: isNonEmptyString(input.protocol) ? input.protocol.trim() : 'unknown',
    sourceId: isNonEmptyString(input.sourceId) ? input.sourceId.trim() : 'unknown',
    signerId: isNonEmptyString(input.signerId) ? input.signerId.trim() : undefined,
    publicKey: isNonEmptyString(input.publicKey) ? input.publicKey.trim() : undefined,
  };
}

function normalizeVerification(input) {
  if (!isPlainObject(input)) {
    return {
      method: 'none',
      payloadHash: null,
    };
  }

  return {
    method: isNonEmptyString(input.method) ? input.method.trim() : 'none',
    payloadHash: isNonEmptyString(input.payloadHash) ? input.payloadHash.trim() : null,
    signature: isNonEmptyString(input.signature) ? input.signature.trim() : undefined,
    keyId: isNonEmptyString(input.keyId) ? input.keyId.trim() : undefined,
    publicKey: isNonEmptyString(input.publicKey) ? input.publicKey.trim() : undefined,
    status: isNonEmptyString(input.status) ? input.status.trim() : undefined,
  };
}

function buildIdentityClaimPayload(claim) {
  return {
    schemaVersion: claim.schemaVersion,
    claimType: claim.claimType,
    ruleVersion: claim.ruleVersion,
    identityKey: claim.identityKey,
    canonicalId: claim.canonicalId,
    issuer: claim.issuer,
    issuedAt: claim.issuedAt,
  };
}

function buildIdentityClaimPayloadText(claim) {
  return stableStringify(buildIdentityClaimPayload(claim));
}

function createIdentityClaim(input = {}, options = {}) {
  const identityKey = normalizeIdentityKey(input.identityKey, options);
  const canonicalId = normalizeCanonicalId(input.canonicalId);
  const ruleVersion = isNonEmptyString(input.ruleVersion)
    ? input.ruleVersion.trim()
    : extractRuleVersionFromIdentityKey(identityKey) || 'identity-key-v1';
  const issuedAt = isNonEmptyString(input.issuedAt) ? input.issuedAt.trim() : new Date().toISOString();
  const issuer = normalizeIssuer(input.issuer);
  const verification = normalizeVerification(input.verification);

  const claim = {
    schemaVersion: isNonEmptyString(input.schemaVersion) ? input.schemaVersion.trim() : '0.1.0',
    claimType: 'identity',
    ruleVersion,
    identityKey,
    canonicalId,
    issuer,
    issuedAt,
    verification,
  };

  if (!claim.verification.payloadHash) {
    claim.verification.payloadHash = `sha256:${hashUtf8(stableStringify(buildIdentityClaimPayload(claim)))}`;
  }

  return claim;
}

function issueIdentityClaim(event, options = {}) {
  if (!isPlainObject(event)) {
    throw new TypeError('event must be an object');
  }

  const identityKey = createIdentityKey(event, options.identityKeyOptions || {});
  const canonicalId = normalizeCanonicalId(event.id);
  const issuerInput = isPlainObject(options.issuer)
    ? options.issuer
    : {
        protocol: Array.isArray(event.provenance?.sources) && event.provenance.sources[0] && isNonEmptyString(event.provenance.sources[0].protocol)
          ? event.provenance.sources[0].protocol
          : 'unknown',
        sourceId: Array.isArray(event.provenance?.sources) && event.provenance.sources[0] && isNonEmptyString(event.provenance.sources[0].sourceId)
          ? event.provenance.sources[0].sourceId
          : (isPlainObject(event.rawRef) && isNonEmptyString(event.rawRef.sourceId) ? event.rawRef.sourceId : 'unknown'),
      };

  const signer = options.signer || null;
  const verificationMethod = isNonEmptyString(signer?.method)
    ? signer.method.trim()
    : (isNonEmptyString(options.verificationMethod) ? options.verificationMethod.trim() : 'none');

  const claim = createIdentityClaim({
    identityKey,
    canonicalId,
    issuer: issuerInput,
    verification: {
      method: verificationMethod,
      keyId: isNonEmptyString(signer?.keyId) ? signer.keyId.trim() : undefined,
      publicKey: isNonEmptyString(signer?.publicKey) ? signer.publicKey.trim() : undefined,
    },
  }, {
    ruleVersion: options.ruleVersion,
  });

  if (verificationMethod === 'ed25519') {
    return signIdentityClaim(claim, signer);
  }

  return claim;
}

function signIdentityClaim(claim, signer = {}) {
  const normalizedClaim = createIdentityClaim(claim, {
    ruleVersion: claim.ruleVersion,
  });
  const method = isNonEmptyString(signer.method) ? signer.method.trim() : normalizedClaim.verification.method || 'none';

  if (method === 'none') {
    return {
      ...normalizedClaim,
      verification: {
        ...normalizedClaim.verification,
        method: 'none',
        status: 'pending',
      },
    };
  }

  if (method !== 'ed25519') {
    throw new Error(`Unsupported identity claim signing method: ${method}`);
  }

  const privateKey = normalizeKeyObject(signer.privateKey);
  const publicKey = normalizeKeyObject(signer.publicKey);
  if (!privateKey || !publicKey) {
    throw new Error('ed25519 signing requires privateKey and publicKey');
  }

  const payloadText = buildIdentityClaimPayloadText(normalizedClaim);
  const signature = crypto.sign(null, toBuffer(payloadText), privateKey).toString('base64');

  return {
    ...normalizedClaim,
    verification: {
      ...normalizedClaim.verification,
      method,
      signature,
      publicKey: normalizedClaim.verification.publicKey || publicKey.export({ format: 'pem', type: 'spki' }),
      status: 'verified',
    },
  };
}

function verifyIdentityClaim(claim, options = {}) {
  if (!isPlainObject(claim)) {
    return {
      valid: false,
      reason: 'claim must be an object',
    };
  }

  const normalizedClaim = createIdentityClaim(claim, {
    ruleVersion: claim.ruleVersion,
  });

  if (!isNonEmptyString(normalizedClaim.identityKey)) {
    return {
      valid: false,
      reason: 'identityKey is required',
    };
  }

  if (!isNonEmptyString(normalizedClaim.canonicalId)) {
    return {
      valid: false,
      reason: 'canonicalId is required',
    };
  }

  const expectedPayloadHash = `sha256:${hashUtf8(stableStringify(buildIdentityClaimPayload(normalizedClaim)))}`;
  if (normalizedClaim.verification.payloadHash !== expectedPayloadHash) {
    return {
      valid: false,
      reason: 'payload hash mismatch',
      expectedPayloadHash,
      actualPayloadHash: normalizedClaim.verification.payloadHash,
    };
  }

  const method = normalizedClaim.verification.method || 'none';
  if (method === 'none') {
    return {
      valid: true,
      reason: 'unsigned claim accepted',
      method,
      payloadHash: expectedPayloadHash,
    };
  }

  if (method === 'ed25519') {
    const publicKey = normalizeKeyObject(normalizedClaim.verification.publicKey || normalizedClaim.issuer.publicKey);
    if (!publicKey || !isNonEmptyString(normalizedClaim.verification.signature)) {
      return {
        valid: false,
        reason: 'ed25519 claim is missing publicKey or signature',
        method,
        payloadHash: expectedPayloadHash,
      };
    }

    const payloadText = buildIdentityClaimPayloadText(normalizedClaim);
    const verified = crypto.verify(
      null,
      toBuffer(payloadText),
      publicKey,
      Buffer.from(normalizedClaim.verification.signature, 'base64'),
    );

    if (verified) {
      return {
        valid: true,
        reason: 'verified',
        method,
        payloadHash: expectedPayloadHash,
      };
    }

    return {
      valid: false,
      reason: 'ed25519 verification failed',
      method,
      payloadHash: expectedPayloadHash,
    };
  }

  const verifiers = isPlainObject(options.verifiers) ? options.verifiers : {};
  const verifier = typeof verifiers[method] === 'function' ? verifiers[method] : null;
  if (!verifier) {
    return {
      valid: false,
      reason: `unsupported verification method: ${method}`,
      method,
      payloadHash: expectedPayloadHash,
    };
  }

  const verificationResult = verifier(normalizedClaim, {
    payload: buildIdentityClaimPayload(normalizedClaim),
    payloadHash: expectedPayloadHash,
  });

  if (verificationResult === true) {
    return {
      valid: true,
      reason: 'verified',
      method,
      payloadHash: expectedPayloadHash,
    };
  }

  if (verificationResult && typeof verificationResult === 'object' && verificationResult.valid === true) {
    return {
      valid: true,
      reason: isNonEmptyString(verificationResult.reason) ? verificationResult.reason : 'verified',
      method,
      payloadHash: expectedPayloadHash,
    };
  }

  return {
    valid: false,
    reason: verificationResult && typeof verificationResult === 'object' && isNonEmptyString(verificationResult.reason)
      ? verificationResult.reason
      : 'verification failed',
    method,
    payloadHash: expectedPayloadHash,
  };
}

function createIdentityClaimRegistry(initialClaims = [], options = {}) {
  const byIdentityKey = new Map();
  const byCanonicalId = new Map();
  const claimsByIdentityKey = new Map();

  function register(claim, registerOptions = {}) {
    const validation = verifyIdentityClaim(claim, registerOptions);
    if (!validation.valid) {
      const error = new Error(`Invalid identity claim: ${validation.reason}`);
      error.validation = validation;
      throw error;
    }

    const normalizedClaim = createIdentityClaim(claim);
    const identityKey = normalizedClaim.identityKey;
    const canonicalId = normalizedClaim.canonicalId;

    const existingCanonicalId = byIdentityKey.get(identityKey);
    if (existingCanonicalId && existingCanonicalId !== canonicalId) {
      throw new Error(`Conflicting canonical id for identity key: ${identityKey}`);
    }

    byIdentityKey.set(identityKey, canonicalId);

    if (!byCanonicalId.has(canonicalId)) {
      byCanonicalId.set(canonicalId, []);
    }
    const canonicalKeys = byCanonicalId.get(canonicalId);
    if (!canonicalKeys.includes(identityKey)) {
      canonicalKeys.push(identityKey);
    }

    if (!claimsByIdentityKey.has(identityKey)) {
      claimsByIdentityKey.set(identityKey, []);
    }
    claimsByIdentityKey.get(identityKey).push(normalizedClaim);

    return normalizedClaim;
  }

  for (const claim of Array.isArray(initialClaims) ? initialClaims : []) {
    if (!claim || typeof claim !== 'object') {
      continue;
    }
    register(claim, options);
  }

  return {
    register,
    resolveCanonicalId(identityKey) {
      return isNonEmptyString(identityKey) ? byIdentityKey.get(identityKey.trim()) ?? null : null;
    },
    getClaims(identityKey) {
      if (!isNonEmptyString(identityKey)) {
        return [];
      }
      const claims = claimsByIdentityKey.get(identityKey.trim()) ?? [];
      return claims.map(cloneJson);
    },
    getCanonicalIdentityKeys(canonicalId) {
      if (!isNonEmptyString(canonicalId)) {
        return [];
      }
      return (byCanonicalId.get(canonicalId.trim()) ?? []).slice();
    },
    toJSON() {
      return {
        byIdentityKey: Object.fromEntries(byIdentityKey.entries()),
        byCanonicalId: Object.fromEntries(byCanonicalId.entries().map(([key, value]) => [key, value.slice()])),
      };
    },
  };
}

function summarizeIdentityClaim(identityKey, registry, options = {}) {
  const claims = [];

  if (registry && typeof registry.resolveCanonicalId === 'function') {
    const registryClaims = typeof registry.getClaims === 'function'
      ? registry.getClaims(identityKey)
      : [];
    claims.push(...registryClaims);
  }

  if (Array.isArray(options.claims)) {
    for (const claim of options.claims) {
      if (isPlainObject(claim) && claim.identityKey === identityKey) {
        claims.push(cloneJson(claim));
      }
    }
  }

  const canonicalId = registry && typeof registry.resolveCanonicalId === 'function'
    ? registry.resolveCanonicalId(identityKey)
    : null;
  const latestClaim = claims.length > 0 ? claims[claims.length - 1] : null;

  return {
    identityKey,
    canonicalId: isNonEmptyString(canonicalId)
      ? canonicalId
      : (latestClaim && isNonEmptyString(latestClaim.canonicalId) ? latestClaim.canonicalId : null),
    claimCount: claims.length,
    ruleVersion: latestClaim ? latestClaim.ruleVersion : null,
    issuer: latestClaim ? latestClaim.issuer : null,
    verificationMethod: latestClaim ? latestClaim.verification.method : null,
  };
}

module.exports = {
  buildIdentityClaimPayload,
  buildIdentityClaimPayloadText,
  buildIdentityKeyPayload,
  createIdentityClaim,
  createIdentityClaimRegistry,
  createIdentityKey,
  extractIdentityKeySource,
  extractRuleVersionFromIdentityKey,
  issueIdentityClaim,
  normalizeCanonicalId,
  normalizeIdentityKey,
  normalizeIdentityKeyFields,
  normalizeKeyObject,
  normalizeIssuer,
  normalizeVerification,
  signIdentityClaim,
  stableNormalize,
  stableStringify,
  summarizeIdentityClaim,
  verifyIdentityClaim,
};
