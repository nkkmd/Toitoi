'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runConformanceSuite } = require('./index');

const fixturePath = path.resolve(__dirname, '../../fixtures/conformance/v0.9.0-transport-round-trips.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const report = runConformanceSuite(fixture);

assert.strictEqual(report.conformanceVersion, '1.0.0');
assert.strictEqual(report.compatibilityProfile, 'v0.9.0');
assert.strictEqual(report.passed, true, JSON.stringify(report.checks.filter(check => !check.passed), null, 2));
assert.strictEqual(report.totals.failed, 0);
for (const transport of ['nostr', 'lingonberry', 'atproto']) {
  assert.ok(report.checks.some(check => check.name === `round-trip:${transport}` && check.passed));
}
assert.ok(report.checks.some(check => check.name === 'replay-equivalence' && check.passed));
console.log('v0.9.0 compatibility fixture passed under Conformance Suite v1');
