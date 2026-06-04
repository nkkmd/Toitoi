'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function loadSchema(relativePath) {
  const schemaPath = path.resolve(__dirname, '../../', relativePath);
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

const tests = [
  {
    name: 'ATProto inquiry schema mirrors the transport contract',
    run() {
      const schema = loadSchema('schemas/atproto-inquiry.schema.json');

      assert.strictEqual(schema.title, 'Toitoi ATProto Inquiry Record');
      assert.strictEqual(schema.properties.collection.const, 'app.toitoi.inquiry');
      assert.deepStrictEqual(
        schema.required,
        ['uri', 'did', 'collection', 'rkey', 'record'],
      );
      assert.strictEqual(schema.properties.record.required.includes('text'), true);
      assert.strictEqual(schema.properties.record.properties.phase.enum.includes('intermediate'), true);
      assert.strictEqual(schema.properties.record.properties.dsl.required[0], 'models');
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
