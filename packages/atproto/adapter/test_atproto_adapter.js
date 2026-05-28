'use strict';

const assert = require('assert');
const {
  canonicalizeAtProtoRecord,
  classifyEvent,
  normalizeAtProtoRecord,
  validateAtProtoRecord,
} = require('./atproto_adapter');
const { makeAtProtoRecord } = require('../test_fixtures');

const tests = [
  {
    name: 'validate and normalize ATProto custom records',
    run() {
      const rawEvent = makeAtProtoRecord();
      const validation = validateAtProtoRecord(rawEvent);
      const normalization = normalizeAtProtoRecord(rawEvent);

      assert.strictEqual(validation.ok, true);
      assert.strictEqual(normalization.ok, true);
      assert.strictEqual(normalization.normalizedEvent.record.text, rawEvent.record.text);
      assert.strictEqual(normalization.normalizedEvent.record.language, 'ja');
    },
  },
  {
    name: 'canonicalize ATProto record into Canonical Event',
    run() {
      const canonicalization = canonicalizeAtProtoRecord(makeAtProtoRecord());

      assert.strictEqual(canonicalization.ok, true);
      assert.strictEqual(canonicalization.canonicalEvent.provenance.sources[0].protocol, 'atproto');
      assert.strictEqual(canonicalization.canonicalEvent.provenance.sources[0].uri, makeAtProtoRecord().uri);
      assert.strictEqual(canonicalization.canonicalEvent.body.text.includes('雑草'), true);
    },
  },
  {
    name: 'classify ATProto records as unverified ingest payloads',
    run() {
      const classified = classifyEvent(makeAtProtoRecord());

      assert.strictEqual(classified.status, 'unverified');
      assert.strictEqual(classified.dedupeKey, makeAtProtoRecord().uri);
      assert.ok(classified.canonicalEvent);
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
