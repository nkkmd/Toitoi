'use strict';

const assert = require('assert');
const { createOperationsHttpBoundary, requiredCapability } = require('./operations_http_boundary');

async function run() {
  assert.strictEqual(requiredCapability({ method: 'GET', url: '/api/v1/search' }), 'read');
  assert.strictEqual(requiredCapability({ method: 'POST', url: '/api/v1/inquiries/1/publish' }), 'publish');
  assert.strictEqual(requiredCapability({ method: 'POST', url: '/api/v1/drafts/1/approve' }), 'review');

  const boundary = createOperationsHttpBoundary({
    authenticationRequired: true,
    healthChecks: { storage: { ok: true }, queue: { ok: true } },
  });
  const next = async request => ({ statusCode: 200, headers: {}, body: { actorId: request.actor.id } });

  const unauthenticated = await boundary.handleRequest({ method: 'GET', url: '/api/v1/search', headers: {} }, next);
  assert.strictEqual(unauthenticated.statusCode, 401);
  assert.strictEqual(unauthenticated.body.error.code, 'authentication_required');

  const forbidden = await boundary.handleRequest({
    method: 'POST',
    url: '/api/v1/inquiries/1/publish',
    headers: { 'x-toitoi-actor-id': 'reader-1', 'x-toitoi-roles': 'reader', 'idempotency-key': 'p1' },
    body: '{}',
  }, next);
  assert.strictEqual(forbidden.statusCode, 403);

  const missingKey = await boundary.handleRequest({
    method: 'POST',
    url: '/api/v1/observations',
    headers: { 'x-toitoi-actor-id': 'contributor-1', 'x-toitoi-roles': 'contributor' },
    body: '{"text":"field note"}',
  }, next);
  assert.strictEqual(missingKey.statusCode, 400);
  assert.strictEqual(missingKey.body.error.code, 'idempotency_key_required');

  const request = {
    method: 'POST',
    url: '/api/v1/observations',
    headers: { 'x-toitoi-actor-id': 'contributor-1', 'x-toitoi-roles': 'contributor', 'idempotency-key': 'obs-1' },
    body: '{"text":"field note"}',
  };
  const first = await boundary.handleRequest(request, next);
  const second = await boundary.handleRequest(request, next);
  assert.strictEqual(first.statusCode, 200);
  assert.strictEqual(first.headers['idempotency-replayed'], 'false');
  assert.strictEqual(second.headers['idempotency-replayed'], 'true');

  const conflict = await boundary.handleRequest({ ...request, body: '{"text":"changed"}' }, next);
  assert.strictEqual(conflict.statusCode, 409);
  assert.strictEqual(conflict.body.error.code, 'idempotency_conflict');

  const ready = await boundary.handleRequest({ method: 'GET', url: '/health/ready', headers: {} }, next);
  assert.strictEqual(ready.statusCode, 200);
  assert.strictEqual(ready.body.ready, true);

  const audit = await boundary.handleRequest({
    method: 'GET',
    url: '/api/v1/audit',
    headers: { 'x-toitoi-actor-id': 'operator-1', 'x-toitoi-roles': 'operator' },
  }, next);
  assert.strictEqual(audit.statusCode, 200);
  assert.strictEqual(audit.body.verified, true);
  assert.ok(audit.body.entries.length >= 2);
}

run().then(() => console.log('operations HTTP boundary tests passed'));
