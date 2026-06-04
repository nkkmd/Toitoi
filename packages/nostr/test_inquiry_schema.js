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
    name: 'Nostr inquiry schema mirrors the transport contract',
    run() {
      const schema = loadSchema('schemas/nostr-inquiry.schema.json');

      assert.strictEqual(schema.title, 'Toitoi Nostr Inquiry Event');
      assert.strictEqual(schema.properties.kind.const, 1042);
      assert.deepStrictEqual(
        schema.required,
        ['kind', 'id', 'pubkey', 'created_at', 'content', 'tags', 'sig'],
      );
      assert.strictEqual(schema.properties.tags.items.type, 'array');
      assert.strictEqual(schema.properties.tags.items.minItems, 1);
      assert.strictEqual(schema.properties.tags.items.items.type, 'string');
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
