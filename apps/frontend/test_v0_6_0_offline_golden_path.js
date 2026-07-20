'use strict';

const assert = require('node:assert/strict');
const { createMemoryStore } = require('./offline_store');
const { createFieldApp, detectSensitiveFields } = require('./field_app');

async function run() {
  let current = new Date('2026-07-20T12:00:00.000Z');
  const now = () => new Date(current);
  const store = createMemoryStore();
  let online = false;
  let failures = 1;
  const api = {
    async publishObservation(payload) {
      assert.equal(payload.text, '東側の畝で葉の黄化が増えた');
      assert.equal(payload.contexts.field_context, '雨天後、火山灰土');
      assert.equal(payload.sensitive.location, true);
      if (failures-- > 0) throw new Error('temporary network failure');
      return { id: 'tt:evt:published-001' };
    },
  };
  const app = createFieldApp({ store, api, now, random: () => 0.12345, online: () => online });
  const observation = await app.saveObservation({ text: '東側の畝で葉の黄化が増えた', context: '雨天後、火山灰土', location: '圃場A 東側' });
  assert.equal(observation.status, 'local');
  assert.deepEqual(detectSensitiveFields(observation), ['location']);
  await assert.rejects(app.queuePublication(observation.id, { confirmed: true, acknowledged_fields: [] }), /Sensitive fields require confirmation/);
  const queued = await app.queuePublication(observation.id, { confirmed: true, acknowledged_fields: ['location'] });
  assert.equal(queued.state, 'queued');
  let sync = await app.syncQueue();
  assert.equal(sync.online, false);
  assert.equal((await app.loadDashboard()).queue.length, 1);
  online = true;
  current = new Date('2026-07-20T12:05:00.000Z');
  sync = await app.syncQueue();
  assert.equal(sync.results[0].ok, false);
  let dashboard = await app.loadDashboard();
  assert.equal(dashboard.observations[0].status, 'sync_failed');
  assert.equal(dashboard.queue[0].state, 'failed');
  assert.equal(dashboard.queue[0].attempts, 1);
  await app.retry(dashboard.queue[0].id);
  current = new Date('2026-07-20T12:06:00.000Z');
  sync = await app.syncQueue();
  assert.equal(sync.results[0].ok, true);
  dashboard = await app.loadDashboard();
  assert.equal(dashboard.queue.length, 0);
  assert.equal(dashboard.observations[0].status, 'published');
  assert.equal(dashboard.observations[0].remote_event_id, 'tt:evt:published-001');
  console.log('v0.6.0 offline Golden Path passed');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
