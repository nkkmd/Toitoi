'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DERIVATION_TYPES } = require('./derived_inquiry');

function loadSchema(relativePath) {
  const schemaPath = path.resolve(__dirname, '../../', relativePath);
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

const tests = [
  {
    name: 'Canonical event schema matches the current identity contract',
    run() {
      const schema = loadSchema('schemas/canonical-event.schema.json');

      assert.strictEqual(schema.title, 'Toitoi Canonical Event');
      assert.deepStrictEqual(
        schema.required,
        ['id', 'schemaVersion', 'type', 'createdAt', 'body', 'provenance'],
      );
      assert.strictEqual(schema.properties.schemaVersion.const, '0.1.0');
      assert.match(
        schema.properties.schemaVersion.description,
        /stable Canonical Event wire-schema identifier/i,
      );
      assert.strictEqual(schema.properties.id.pattern, '^tt:evt:[^\\s]+$');
      assert.deepStrictEqual(schema.properties.body.required, ['text', 'language']);
      assert.deepStrictEqual(schema.properties.provenance.required, ['sources']);
      assert.strictEqual(schema.properties.provenance.properties.sources.minItems, 1);
    },
  },
  {
    name: 'Canonical extension and closed-object behavior are explicit',
    run() {
      const schema = loadSchema('schemas/canonical-event.schema.json');

      assert.strictEqual(schema.additionalProperties, true);
      assert.strictEqual(schema.properties.body.additionalProperties, false);
      assert.strictEqual(schema.properties.provenance.additionalProperties, false);
      assert.strictEqual(schema.properties.rawRef.additionalProperties, false);
      assert.strictEqual(schema.properties.contexts.additionalProperties, true);
      assert.strictEqual(schema.properties.meta.additionalProperties, true);
    },
  },
  {
    name: 'Lineage guidance matches the normative derivation vocabulary',
    run() {
      const schema = loadSchema('schemas/canonical-event.schema.json');
      const description = schema.definitions.lineageEdge.properties.type.description;

      for (const relationType of DERIVATION_TYPES) {
        assert.ok(description.includes(relationType), `missing ${relationType} from lineage guidance`);
      }
      assert.ok(!description.includes('synthesis,'), 'legacy synthesis relation spelling must not remain normative');
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
