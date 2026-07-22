'use strict';

const assert = require('assert');
const {
  createActor,
  capabilitiesFor,
  authorize,
  stableError,
  digestRequest,
  IdempotencyStore,
  FixedWindowRateLimiter,
  AuditLog,
  buildHealthReport,
} = require('./index');

const contributor = createActor({ id: 'actor:contributor', roles: ['contributor'] });
assert.deepStrictEqual(capabilitiesFor(contributor), ['contribute', 'read']);
assert.strictEqual(authorize(contributor, 'publish').allowed, false);

const operator = createActor({ id: 'actor:operator', roles: ['operator'] });
assert.strictEqual(authorize(operator, 'moderate').allowed, true);
assert.strictEqual(authorize(operator, 'operate').allowed, true);

assert.deepStrictEqual(
  stableError('forbidden', 'Denied', { requestId: 'req-1', details: { capability: 'publish' } }),
  { error: { code: 'forbidden', message: 'Denied', requestId: 'req-1', details: { capability: 'publish' } } },
);
assert.strictEqual(digestRequest({ b: 2, a: 1 }), digestRequest({ a: 1, b: 2 }));

const idempotency = new IdempotencyStore();
let executions = 0;
const first = idempotency.execute(
  { actorId: 'actor:publisher', operation: 'publish', key: 'key-1', request: { draftId: 'draft-1' } },
  () => ({ publicationId: `pub-${++executions}` }),
);
const replay = idempotency.execute(
  { actorId: 'actor:publisher', operation: 'publish', key: 'key-1', request: { draftId: 'draft-1' } },
  () => ({ publicationId: `pub-${++executions}` }),
);
assert.strictEqual(first.replayed, false);
assert.strictEqual(replay.replayed, true);
assert.strictEqual(executions, 1);
const conflict = idempotency.execute(
  { actorId: 'actor:publisher', operation: 'publish', key: 'key-1', request: { draftId: 'draft-2' } },
  () => null,
);
assert.strictEqual(conflict.conflict, true);
assert.strictEqual(conflict.error.error.code, 'idempotency_conflict');

let now = 1000;
const limiter = new FixedWindowRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
assert.strictEqual(limiter.consume('actor-1').allowed, true);
assert.strictEqual(limiter.consume('actor-1').allowed, true);
assert.strictEqual(limiter.consume('actor-1').allowed, false);
now = 2000;
assert.strictEqual(limiter.consume('actor-1').allowed, true);

let auditTime = 0;
const audit = new AuditLog({ now: () => `2026-07-22T00:00:0${auditTime++}.000Z` });
const firstEntry = audit.append({ actorId: 'actor:reviewer', action: 'draft.approve', target: 'draft-1' });
const secondEntry = audit.append({ actorId: 'actor:publisher', action: 'draft.publish', target: 'draft-1' });
assert.strictEqual(firstEntry.previousHash, null);
assert.strictEqual(secondEntry.previousHash, firstEntry.hash);
assert.strictEqual(audit.verify(), true);
assert.strictEqual(audit.list().length, 2);

assert.deepStrictEqual(buildHealthReport({ storage: { ok: true }, queue: () => ({ ok: true }) }), {
  live: true,
  ready: true,
  status: 'ready',
  dependencies: { storage: { ok: true }, queue: { ok: true } },
});
const degraded = buildHealthReport({ storage: { ok: true }, queue: () => { throw new Error('unavailable'); } });
assert.strictEqual(degraded.live, true);
assert.strictEqual(degraded.ready, false);
assert.strictEqual(degraded.status, 'degraded');

console.log('operations contracts: ok');
