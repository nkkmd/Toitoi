'use strict';

const assert = require('assert');
const {
  createCanonicalEventId,
  normalizeCanonicalEventId,
  resolveCanonicalEventId,
} = require('./canonical_identity');

const tests = [
  {
    name: 'createCanonicalEventId returns opaque tt:evt UUID ids',
    run() {
      const id = createCanonicalEventId();

      assert.match(id, /^tt:evt:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.strictEqual(normalizeCanonicalEventId(id), id);
    },
  },
  {
    name: 'resolveCanonicalEventId prefers explicit ids and mapping',
    run() {
      const explicit = resolveCanonicalEventId('source-1', {
        id: 'tt:evt:01JVVEXPLICIT000000000000000000000',
      });
      const mapped = resolveCanonicalEventId('source-2', {
        canonicalIdMap: {
          'source-2': 'tt:evt:01JVVMAPPED00000000000000000000000',
        },
      });

      assert.strictEqual(explicit, 'tt:evt:01JVVEXPLICIT000000000000000000000');
      assert.strictEqual(mapped, 'tt:evt:01JVVMAPPED00000000000000000000000');
    },
  },
  {
    name: 'normalizeCanonicalEventId rejects non-evt tt prefixes',
    run() {
      assert.strictEqual(normalizeCanonicalEventId('tt:obj:legacy-value'), null);
      assert.strictEqual(normalizeCanonicalEventId('tt:other:value'), null);
    },
  },
  {
    name: 'resolveCanonicalEventId creates fresh ids when no mapping exists',
    run() {
      const first = resolveCanonicalEventId('source-3');
      const second = resolveCanonicalEventId('source-3');

      assert.match(first, /^tt:evt:/);
      assert.match(second, /^tt:evt:/);
      assert.notStrictEqual(first, second);
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
