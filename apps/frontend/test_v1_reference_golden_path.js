'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMemoryStore } = require('./offline_store');
const { createFieldApp, detectSensitiveFields } = require('./field_app');

const fixture = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../../fixtures/reference/v1.0.0/east-side-weed-scenario.json'),
  'utf8',
));

async function run() {
  let current = new Date(fixture.observation.createdAt);
  const now = () => new Date(current);
  const store = createMemoryStore();
  let online = false;
  let publishAttempts = 0;

  const api = {
    async publishObservation(payload) {
      publishAttempts += 1;
      assert.equal(payload.text, fixture.observation.body.text);
      assert.equal(payload.contexts.field_context, 'reference-region-a / east-edge / summer');
      assert.equal(payload.sensitive.location, true);
      if (publishAttempts === 1) throw new Error('deterministic temporary outage');
      return { id: fixture.observation.id };
    },
  };

  const app = createFieldApp({
    store,
    api,
    now,
    random: () => 0.10001,
    online: () => online,
  });

  const saved = await app.saveObservation({
    text: fixture.observation.body.text,
    context: 'reference-region-a / east-edge / summer',
    location: 'reference field east edge',
  });

  assert.equal(saved.status, 'local');
  assert.deepEqual(detectSensitiveFields(saved), ['location']);

  await assert.rejects(
    app.queuePublication(saved.id, { confirmed: true, acknowledged_fields: [] }),
    /Sensitive fields require confirmation/,
  );

  const queued = await app.queuePublication(saved.id, {
    confirmed: true,
    acknowledged_fields: ['location'],
  });
  assert.equal(queued.state, 'queued');

  let sync = await app.syncQueue();
  assert.equal(sync.online, false);
  assert.equal((await app.loadDashboard()).queue[0].state, 'queued');

  online = true;
  current = new Date('2026-07-22T00:02:00.000Z');
  sync = await app.syncQueue();
  assert.equal(sync.results[0].ok, false);

  let dashboard = await app.loadDashboard();
  assert.equal(dashboard.observations[0].status, 'sync_failed');
  assert.equal(dashboard.queue[0].state, 'failed');
  assert.equal(dashboard.queue[0].attempts, 1);

  await app.retry(dashboard.queue[0].id);
  current = new Date('2026-07-22T00:03:00.000Z');
  sync = await app.syncQueue();
  assert.equal(sync.results[0].ok, true);

  dashboard = await app.loadDashboard();
  assert.equal(dashboard.queue.length, 0);
  assert.equal(dashboard.observations[0].status, 'published');
  assert.equal(dashboard.observations[0].remote_event_id, fixture.observation.id);

  assert.notEqual(
    fixture.annotation.review.reviewedBy,
    fixture.inquiryDraft.reviewedBy,
    'annotation review and publication approval must remain independently attributable',
  );
  assert.equal(fixture.inquiryDraft.reviewState, 'approved');
  assert.equal(fixture.publishedInquiry.meta.publicationReview, 'approved');

  console.log('v1.0.0 reference offline Golden Path passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
