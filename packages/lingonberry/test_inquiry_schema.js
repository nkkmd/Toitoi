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
    name: 'Lingonberry inquiry schema mirrors the transport contract',
    run() {
      const schema = loadSchema('schemas/lingonberry-inquiry.schema.json');
      const knowledgeObject = schema.definitions.knowledgeObject;
      const publishRequest = schema.definitions.httpPublishRequest;

      assert.strictEqual(schema.title, 'Toitoi Lingonberry Inquiry Object');
      assert.strictEqual(knowledgeObject.properties.schemaVersion.const, '0.1.0');
      assert.strictEqual(knowledgeObject.properties.id.pattern, '^lb:obj:[^\\s]+$');
      assert.strictEqual(knowledgeObject.properties.type.enum.includes('inquiry'), true);
      assert.deepStrictEqual(
        knowledgeObject.required,
        ['id', 'schemaVersion', 'type', 'createdAt', 'body', 'provenance', 'rawRef'],
      );
      assert.deepStrictEqual(publishRequest.required, ['object', 'publisher']);
      assert.strictEqual(publishRequest.properties.publisher.properties.publicKey.pattern, '^[0-9a-f]{64}$');
      assert.strictEqual(publishRequest.properties.publisher.properties.signature.pattern, '^[0-9a-f]{128}$');
      assert.deepStrictEqual(
        schema.definitions.lineageEdge.properties.type.enum,
        ['derived_from', 'revises', 'supersedes', 'translates', 'synthesizes'],
      );
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
