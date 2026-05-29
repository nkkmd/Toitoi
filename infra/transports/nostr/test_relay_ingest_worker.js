'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseArgs, writeResult } = require('./relay_ingest_worker');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-relay-worker-'));
}

function makeResult() {
  return {
    accepted: [{
      rawEvent: { id: 'a' },
      normalizedEvent: { id: 'a' },
      canonicalEvent: { type: 'inquiry', body: { text: 'one', language: 'und' } },
      warnings: [],
      verification: { ok: true, verified: false, skipped: true, reason: '' },
    }],
    invalid: [],
    duplicates: [],
    unverified: [],
    orderedEvents: [{ id: 'a' }],
  };
}

const tests = [
  {
    name: 'parseArgs reads relay URL and defaults',
    run() {
      const args = parseArgs(['node', 'script', '--relay-url', 'wss://relay.example.com']);
      assert.strictEqual(args.relayUrl, 'wss://relay.example.com');
      assert.strictEqual(args.format, 'report');
      assert.strictEqual(args.verify, false);
      assert.strictEqual(args.protocol, 'nostr');
    },
  },
  {
    name: 'parseArgs accepts an explicit protocol',
    run() {
      const args = parseArgs([
        'node',
        'script',
        '--relay-url',
        'wss://relay.example.com',
        '--protocol',
        'atproto',
      ]);

      assert.strictEqual(args.protocol, 'atproto');
    },
  },
  {
    name: 'writeResult emits report and canonical formats',
    run() {
      const dir = makeTempDir();
      const reportFile = path.join(dir, 'report.json');
      const canonicalFile = path.join(dir, 'canonical.jsonl');
      const result = makeResult();

      writeResult(reportFile, 'report', result);
      writeResult(canonicalFile, 'canonical', result);

      const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      assert.strictEqual(report.accepted, 1);
      assert.strictEqual(report.invalid, 0);

      const canonicalLines = fs.readFileSync(canonicalFile, 'utf8').trim().split('\n');
      assert.strictEqual(canonicalLines.length, 1);
      assert.strictEqual(JSON.parse(canonicalLines[0]).type, 'inquiry');
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
