'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { main, parseArgs } = require('./cli');

function run() {
  assert.deepStrictEqual(parseArgs(['--input', 'a.json', '--pretty']), {
    input: 'a.json', output: null, pretty: true,
  });

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-conformance-'));
  const input = path.resolve(
    __dirname,
    '../../fixtures/reference/v1.0.0/conformance-input.json',
  );
  const output = path.join(directory, 'report.json');

  assert.strictEqual(main(['--input', input, '--output', output, '--pretty']), 0);
  const report = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.strictEqual(report.passed, true);
  assert.strictEqual(report.conformanceVersion, '1.0.0');
  assert.strictEqual(report.compatibilityProfile, null);
  assert.strictEqual(report.totals.failed, 0);
  assert.ok(report.checks.some(check => check.name === 'round-trip:nostr' && check.passed));
  assert.ok(report.checks.some(check => check.name === 'replay-equivalence' && check.passed));

  fs.rmSync(directory, { recursive: true, force: true });
  console.log('conformance CLI v1 external fixture tests passed');
}

run();
