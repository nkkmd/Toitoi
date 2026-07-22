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
  const input = path.join(directory, 'fixture.json');
  const output = path.join(directory, 'report.json');
  fs.writeFileSync(input, JSON.stringify({
    events: [{
      id: 'fixture-1',
      type: 'inquiry',
      createdAt: '2026-07-22T00:00:00.000Z',
      content: { text: 'Why?' },
      provenance: { rawRef: 'raw:fixture-1' },
    }],
  }), 'utf8');

  assert.strictEqual(main(['--input', input, '--output', output, '--pretty']), 0);
  const report = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.strictEqual(report.passed, true);
  assert.strictEqual(report.conformanceVersion, '0.9.0');
  fs.rmSync(directory, { recursive: true, force: true });
  console.log('conformance CLI tests passed');
}

run();
