'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  normalizeIdentityClaimSigner,
  parseArgs,
  writeResult,
} = require('./relay_ingest_worker');

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
    name: 'parseArgs reads identity claim signer settings from environment',
    run() {
      const envBackup = {
        TOITOI_IDENTITY_CLAIM_METHOD: process.env.TOITOI_IDENTITY_CLAIM_METHOD,
        TOITOI_IDENTITY_CLAIM_KEY_ID: process.env.TOITOI_IDENTITY_CLAIM_KEY_ID,
        TOITOI_IDENTITY_CLAIM_PUBLIC_KEY: process.env.TOITOI_IDENTITY_CLAIM_PUBLIC_KEY,
        TOITOI_IDENTITY_CLAIM_PRIVATE_KEY: process.env.TOITOI_IDENTITY_CLAIM_PRIVATE_KEY,
        TOITOI_IDENTITY_CLAIM_RULE_VERSION: process.env.TOITOI_IDENTITY_CLAIM_RULE_VERSION,
      };

      process.env.TOITOI_IDENTITY_CLAIM_METHOD = 'ed25519';
      process.env.TOITOI_IDENTITY_CLAIM_KEY_ID = 'relay-key';
      process.env.TOITOI_IDENTITY_CLAIM_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\npublic\n-----END PUBLIC KEY-----';
      process.env.TOITOI_IDENTITY_CLAIM_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----';
      process.env.TOITOI_IDENTITY_CLAIM_RULE_VERSION = 'identity-key-v1';

      try {
        const args = parseArgs(['node', 'script', '--relay-url', 'wss://relay.example.com']);
        assert.strictEqual(args.identityClaimSigner.method, 'ed25519');
        assert.strictEqual(args.identityClaimSigner.keyId, 'relay-key');
        assert.strictEqual(args.identityClaimSigner.ruleVersion, 'identity-key-v1');
      } finally {
        for (const [key, value] of Object.entries(envBackup)) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
      }
    },
  },
  {
    name: 'normalizeIdentityClaimSigner rejects ed25519 without keys',
    run() {
      assert.throws(() => {
        normalizeIdentityClaimSigner({ method: 'ed25519' });
      }, /requires public and private keys/);
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
