'use strict';

const crypto = require('crypto');
const {
  MigrationRegistry,
  buildBackupManifest,
  sha256File,
  verifyBackupManifest,
} = require('./recovery');

const ROLE_CAPABILITIES = Object.freeze({
  reader: ['read'],
  contributor: ['read', 'contribute'],
  reviewer: ['read', 'contribute', 'review'],
  publisher: ['read', 'contribute', 'review', 'publish'],
  moderator: ['read', 'contribute', 'review', 'moderate'],
  operator: ['read', 'contribute', 'review', 'publish', 'moderate', 'operate'],
});

function normalizeRoles(roles) {
  return [...new Set(Array.isArray(roles) ? roles.filter(role => ROLE_CAPABILITIES[role]) : [])].sort();
}

function createActor(input = {}) {
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  if (!id) throw new TypeError('actor.id must be a non-empty string');
  return Object.freeze({ id, roles: normalizeRoles(input.roles), attributes: { ...(input.attributes || {}) } });
}

function capabilitiesFor(actor) {
  const capabilities = new Set();
  for (const role of normalizeRoles(actor && actor.roles)) {
    for (const capability of ROLE_CAPABILITIES[role]) capabilities.add(capability);
  }
  return [...capabilities].sort();
}

function authorize(actor, capability) {
  const allowed = capabilitiesFor(actor).includes(capability);
  return { allowed, actorId: actor && actor.id ? actor.id : null, capability };
}

function stableError(code, message, options = {}) {
  return {
    error: {
      code,
      message,
      requestId: options.requestId || null,
      details: options.details && typeof options.details === 'object' ? options.details : {},
    },
  };
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digestRequest(value) {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

class IdempotencyStore {
  constructor() { this.records = new Map(); }

  execute({ actorId, operation, key, request }, handler) {
    if (!actorId || !operation || !key) throw new TypeError('actorId, operation, and key are required');
    const identity = `${actorId}\u0000${operation}\u0000${key}`;
    const digest = digestRequest(request);
    const existing = this.records.get(identity);
    if (existing) {
      if (existing.digest !== digest) {
        return { ok: false, conflict: true, error: stableError('idempotency_conflict', 'The idempotency key was reused with a different request.') };
      }
      return { ok: true, replayed: true, result: existing.result };
    }
    const result = handler();
    this.records.set(identity, { digest, result });
    return { ok: true, replayed: false, result };
  }
}

class FixedWindowRateLimiter {
  constructor({ limit = 60, windowMs = 60_000, now = () => Date.now() } = {}) {
    if (!Number.isInteger(limit) || limit < 1) throw new TypeError('limit must be a positive integer');
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.windows = new Map();
  }

  consume(subject, cost = 1) {
    const now = this.now();
    const start = Math.floor(now / this.windowMs) * this.windowMs;
    const current = this.windows.get(subject);
    const used = current && current.start === start ? current.used : 0;
    const next = used + cost;
    const allowed = next <= this.limit;
    if (allowed) this.windows.set(subject, { start, used: next });
    return { allowed, limit: this.limit, remaining: Math.max(0, this.limit - (allowed ? next : used)), resetAt: start + this.windowMs };
  }
}

class AuditLog {
  constructor({ now = () => new Date().toISOString() } = {}) {
    this.now = now;
    this.entries = [];
  }

  append(entry) {
    const previousHash = this.entries.length ? this.entries[this.entries.length - 1].hash : null;
    const body = {
      sequence: this.entries.length + 1,
      occurredAt: this.now(),
      actorId: entry.actorId || null,
      action: entry.action,
      target: entry.target || null,
      outcome: entry.outcome || 'success',
      metadata: entry.metadata || {},
      previousHash,
    };
    const record = Object.freeze({ ...body, hash: digestRequest(body) });
    this.entries.push(record);
    return record;
  }

  list() { return this.entries.slice(); }

  verify() {
    let previousHash = null;
    for (const entry of this.entries) {
      const { hash, ...body } = entry;
      if (body.previousHash !== previousHash || digestRequest(body) !== hash) return false;
      previousHash = hash;
    }
    return true;
  }
}

function buildHealthReport(checks = {}) {
  const dependencies = {};
  for (const [name, value] of Object.entries(checks)) {
    try {
      const result = typeof value === 'function' ? value() : value;
      dependencies[name] = result && typeof result === 'object' ? result : { ok: Boolean(result) };
    } catch (error) {
      dependencies[name] = { ok: false, error: error.message };
    }
  }
  const ready = Object.values(dependencies).every(result => result.ok === true);
  return { live: true, ready, status: ready ? 'ready' : 'degraded', dependencies };
}

module.exports = {
  ROLE_CAPABILITIES,
  createActor,
  capabilitiesFor,
  authorize,
  stableError,
  canonicalJson,
  digestRequest,
  IdempotencyStore,
  FixedWindowRateLimiter,
  AuditLog,
  buildHealthReport,
  MigrationRegistry,
  buildBackupManifest,
  sha256File,
  verifyBackupManifest,
};
