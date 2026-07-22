'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DurableJobQueue } = require('./durable_queue');

async function run() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-queue-'));
  try {
    const queue = new DurableJobQueue({ directory, id: () => 'job-1', now: () => '2026-07-22T00:00:00.000Z' });
    assert.strictEqual(queue.enqueue({ eventId: 'event-1' }, { maxAttempts: 2 }), 'job-1');
    assert.strictEqual(queue.pending().length, 1);

    const first = await queue.runNext(async () => { throw new Error('temporary'); });
    assert.strictEqual(first.status, 'pending');

    const recovered = new DurableJobQueue({ directory, now: () => '2026-07-22T00:01:00.000Z' });
    assert.strictEqual(recovered.pending().length, 1);
    assert.strictEqual(recovered.pending()[0].attempts, 1);

    const second = await recovered.runNext(async () => { throw new Error('permanent'); });
    assert.strictEqual(second.status, 'dead_letter');
    assert.strictEqual(recovered.deadLetters().length, 1);
    assert.strictEqual(recovered.pending().length, 0);

    const shutdown = recovered.beginShutdown();
    assert.strictEqual(shutdown.accepting, false);
    assert.strictEqual(recovered.isDrained(), true);
    assert.throws(() => recovered.enqueue({}), /shutting down/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

run().then(() => console.log('durable queue tests passed'));
