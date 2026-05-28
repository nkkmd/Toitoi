'use strict';

const assert = require('assert');
const { ingestAtProtoEvents } = require('./ingest_pipeline');
const { makeAtProtoRecord } = require('../test_fixtures');

const tests = [
  {
    name: 'ingestAtProtoEvents preserves ordering, duplicates, and canonical events',
    run() {
      const ingestResult = ingestAtProtoEvents([
        makeAtProtoRecord({ uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/1', rkey: '1', createdAt: '2026-05-28T00:00:00.000Z', indexedAt: '2026-05-28T00:00:03.000Z' }),
        makeAtProtoRecord({ uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/1', rkey: '1', createdAt: '2026-05-28T00:00:00.000Z', indexedAt: '2026-05-28T00:00:03.000Z' }),
        makeAtProtoRecord({ uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/2', rkey: '2', createdAt: '2026-05-28T00:00:02.000Z', indexedAt: '2026-05-28T00:00:04.000Z' }),
      ]);

      assert.strictEqual(ingestResult.orderedEvents.length, 3);
      assert.strictEqual(ingestResult.accepted.length, 2);
      assert.strictEqual(ingestResult.duplicates.length, 1);
      assert.strictEqual(ingestResult.unverified.length, 2);
      assert.ok(ingestResult.accepted[0].canonicalEvent);
    },
  },
];

function run() {
  let failed = 0;

  for (const test of tests) {
    try {
      test.run();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${test.name}`);
      console.error(error instanceof Error ? error.stack || error.message : String(error));
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    console.error(`\n${failed} test(s) failed`);
    return;
  }

  console.log(`\n${tests.length} test(s) passed`);
}

run();
