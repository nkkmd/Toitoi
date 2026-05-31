'use strict';

const assert = require('assert');
const {
  validateOperationalTemplate,
} = require('./validate_operational_template');

const tests = [
  {
    name: 'operational template includes the shared protocol sections and explicit unsupported replay guidance',
    run() {
      const result = validateOperationalTemplate();

      assert.strictEqual(result.errors.length, 0);
      assert.ok(result.source.includes('localfs'));
      assert.ok(result.source.includes('unsupported'));
      assert.ok(result.source.includes('future file/archive-backed support is possible'));
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
