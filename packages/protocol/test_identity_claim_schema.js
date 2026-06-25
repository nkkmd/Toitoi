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
    name: 'Identity claim schema matches the third-party verification contract',
    run() {
      const schema = loadSchema('schemas/identity-claim.schema.json');

      assert.strictEqual(schema.title, 'Toitoi Identity Claim');
      assert.deepStrictEqual(
        schema.required,
        [
          'schemaVersion',
          'claimType',
          'ruleVersion',
          'identityKey',
          'canonicalId',
          'issuer',
          'issuedAt',
          'verification',
        ],
      );
      assert.strictEqual(schema.properties.schemaVersion.const, '0.1.0');
      assert.strictEqual(schema.properties.claimType.const, 'identity');
      assert.strictEqual(schema.properties.identityKey.pattern, '^tt:key:[^\\s]+$');
      assert.strictEqual(schema.properties.canonicalId.pattern, '^tt:evt:[^\\s]+$');
      assert.deepStrictEqual(schema.properties.verification.required, ['method', 'payloadHash']);
      assert.deepStrictEqual(schema.properties.issuer.required, ['protocol', 'sourceId']);
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
