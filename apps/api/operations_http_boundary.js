'use strict';

const crypto = require('crypto');
const {
  AuditLog,
  FixedWindowRateLimiter,
  IdempotencyStore,
  authorize,
  buildHealthReport,
  createActor,
  stableError,
} = require('@toitoi/operations');

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function header(headers, name) {
  const value = headers && (headers[name] || headers[name.toLowerCase()]);
  return Array.isArray(value) ? value[0] : value;
}

function requestIdFor(request) {
  return header(request.headers, 'x-request-id') || crypto.randomUUID();
}

function parseActor(request) {
  const id = header(request.headers, 'x-toitoi-actor-id');
  if (typeof id !== 'string' || id.trim() === '') return null;
  const rawRoles = header(request.headers, 'x-toitoi-roles') || 'reader';
  return createActor({
    id: id.trim(),
    roles: String(rawRoles).split(',').map(role => role.trim()).filter(Boolean),
  });
}

function requiredCapability(request) {
  if (!MUTATION_METHODS.has(String(request.method || '').toUpperCase())) return 'read';
  const pathname = new URL(request.url || '/', 'http://toitoi.invalid').pathname;
  if (/\/moderation(?:\/|$)/.test(pathname)) return 'moderate';
  if (/\/(?:publish|publication)(?:\/|$)/.test(pathname)) return 'publish';
  if (/\/(?:approve|reject|review)(?:\/|$)/.test(pathname)) return 'review';
  return 'contribute';
}

function jsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
    body,
  };
}

function createOperationsHttpBoundary(options = {}) {
  const auditLog = options.auditLog || new AuditLog();
  const idempotencyStore = options.idempotencyStore || new IdempotencyStore();
  const rateLimiter = options.rateLimiter || new FixedWindowRateLimiter({
    limit: Number.isInteger(options.rateLimit) ? options.rateLimit : 120,
    windowMs: Number.isInteger(options.rateWindowMs) ? options.rateWindowMs : 60_000,
  });
  const healthChecks = options.healthChecks || {};
  const authenticationRequired = options.authenticationRequired === true;
  const developmentActor = createActor({ id: 'development-runtime', roles: ['operator'] });

  async function handleRequest(request, next) {
    const requestId = requestIdFor(request);
    const pathname = new URL(request.url || '/', 'http://toitoi.invalid').pathname;

    if (request.method === 'GET' && pathname === '/health/live') {
      return jsonResponse(200, { live: true, requestId });
    }
    if (request.method === 'GET' && pathname === '/health/ready') {
      const report = buildHealthReport(healthChecks);
      return jsonResponse(report.ready ? 200 : 503, { ...report, requestId });
    }

    const parsedActor = parseActor(request);
    if (authenticationRequired && !parsedActor) {
      return jsonResponse(401, stableError('authentication_required', 'Actor identity headers are required.', { requestId }), {
        'www-authenticate': 'ToitoiActor',
      });
    }
    const actor = parsedActor || developmentActor;

    if (request.method === 'GET' && pathname === '/api/v1/audit') {
      const decision = authorize(actor, 'operate');
      if (!decision.allowed) return jsonResponse(403, stableError('forbidden', 'Operator authority is required.', { requestId }));
      return jsonResponse(200, { entries: auditLog.list(), verified: auditLog.verify(), requestId });
    }

    const subject = actor.id;
    const rate = rateLimiter.consume(subject);
    if (!rate.allowed) {
      return jsonResponse(429, stableError('rate_limited', 'The request rate limit was exceeded.', { requestId }), {
        'retry-after': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
        'x-ratelimit-limit': String(rate.limit),
        'x-ratelimit-remaining': String(rate.remaining),
      });
    }

    const capability = requiredCapability(request);
    const decision = authorize(actor, capability);
    if (!decision.allowed) {
      auditLog.append({ actorId: subject, action: `${request.method} ${pathname}`, outcome: 'denied', metadata: { capability, requestId } });
      return jsonResponse(403, stableError('forbidden', `Capability '${capability}' is required.`, { requestId }));
    }

    const execute = async () => {
      try {
        const result = await next({ ...request, actor, requestId });
        auditLog.append({ actorId: subject, action: `${request.method} ${pathname}`, outcome: result.statusCode < 400 ? 'success' : 'failure', metadata: { statusCode: result.statusCode, requestId } });
        return { ...result, headers: { ...(result.headers || {}), 'x-request-id': requestId } };
      } catch (error) {
        auditLog.append({ actorId: subject, action: `${request.method} ${pathname}`, outcome: 'error', metadata: { error: error.message, requestId } });
        throw error;
      }
    };

    if (!MUTATION_METHODS.has(String(request.method || '').toUpperCase())) return execute();
    const key = header(request.headers, 'idempotency-key');
    if (authenticationRequired && (typeof key !== 'string' || key.trim() === '')) {
      return jsonResponse(400, stableError('idempotency_key_required', 'Mutation requests require an Idempotency-Key header.', { requestId }));
    }
    if (typeof key !== 'string' || key.trim() === '') return execute();

    const replay = idempotencyStore.execute({
      actorId: subject,
      operation: `${request.method} ${pathname}`,
      key: key.trim(),
      request: { body: request.body || null, url: request.url || pathname },
    }, execute);
    if (replay.conflict) return jsonResponse(409, replay.error);
    const result = await replay.result;
    return {
      ...result,
      headers: { ...(result.headers || {}), 'idempotency-replayed': replay.replayed ? 'true' : 'false' },
    };
  }

  return Object.freeze({ handleRequest, auditLog, idempotencyStore, rateLimiter });
}

module.exports = {
  createOperationsHttpBoundary,
  parseActor,
  requiredCapability,
};
