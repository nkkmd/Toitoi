'use strict';

const assert = require('assert');
const {
  validateLocalFsMigrationFixtureTemplate,
} = require('./validate_localfs_migration_fixture_template');

const tests = [
  {
    name: 'localfs template records unsupported replay and migration/fixture placeholders',
    run() {
      const result = validateLocalFsMigrationFixtureTemplate();

      assert.strictEqual(result.errors.length, 0);
      assert.ok(result.source.includes('metadata-only'));
      assert.ok(result.source.includes('file/archive-backed'));
      assert.ok(result.source.includes('replay は unsupported'));
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
