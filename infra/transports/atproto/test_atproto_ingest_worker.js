'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildJetstreamUrl,
  normalizeIdentityClaimSigner,
  parseArgs,
  readIdentityClaimSignerFromEnv,
  toAtProtoRecordFromJetstreamMessage,
  writeResult,
} = require('./atproto_ingest_worker');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-atproto-worker-'));
}

function makeResult() {
  return {
    accepted: [{
      rawEvent: { uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/1' },
      normalizedEvent: { uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/1' },
      canonicalEvent: { type: 'inquiry', body: { text: 'one', language: 'und' } },
      warnings: [],
      verification: { ok: true, verified: false, skipped: true, reason: '' },
    }],
    invalid: [],
    duplicates: [],
    unverified: [],
    orderedEvents: [{ uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/1' }],
  };
}

const tests = [
  {
    name: 'parseArgs reads input, output, and defaults',
    run() {
      const args = parseArgs(['node', 'script', '--in', 'input.jsonl', '--out', 'output.json']);
      assert.strictEqual(args.input, 'input.jsonl');
      assert.strictEqual(args.output, 'output.json');
      assert.strictEqual(args.format, 'report');
      assert.strictEqual(args.verify, false);
      assert.strictEqual(args.protocol, 'atproto');
    },
  },
  {
    name: 'parseArgs accepts an explicit batch source label',
    run() {
      const args = parseArgs([
        'node',
        'script',
        '--in',
        'input.jsonl',
        '--out',
        'output.json',
        '--source-label',
        'fixture',
        '--batch-id',
        'batch-1',
      ]);

      assert.strictEqual(args.sourceLabel, 'fixture');
      assert.strictEqual(args.batchId, 'batch-1');
    },
  },
  {
    name: 'parseArgs accepts live stream mode',
    run() {
      const args = parseArgs([
        'node',
        'script',
        '--stream-url',
        'wss://jetstream.example/subscribe',
        '--wanted-collections',
        'app.toitoi.inquiry,app.bsky.feed.post',
      ]);

      assert.strictEqual(args.streamUrl, 'wss://jetstream.example/subscribe');
      assert.strictEqual(args.format, 'report');
      assert.deepStrictEqual(args.wantedCollections, ['app.toitoi.inquiry', 'app.bsky.feed.post']);
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
      process.env.TOITOI_IDENTITY_CLAIM_KEY_ID = 'atproto-key';
      process.env.TOITOI_IDENTITY_CLAIM_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\npublic\n-----END PUBLIC KEY-----';
      process.env.TOITOI_IDENTITY_CLAIM_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----';
      process.env.TOITOI_IDENTITY_CLAIM_RULE_VERSION = 'identity-key-v1';

      try {
        const args = parseArgs([
          'node',
          'script',
          '--in',
          'input.jsonl',
          '--out',
          'output.json',
        ]);

        assert.strictEqual(args.identityClaimSigner.method, 'ed25519');
        assert.strictEqual(args.identityClaimSigner.keyId, 'atproto-key');
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
    name: 'readIdentityClaimSignerFromEnv returns null when unset',
    run() {
      const envBackup = {
        TOITOI_IDENTITY_CLAIM_METHOD: process.env.TOITOI_IDENTITY_CLAIM_METHOD,
        TOITOI_IDENTITY_CLAIM_KEY_ID: process.env.TOITOI_IDENTITY_CLAIM_KEY_ID,
        TOITOI_IDENTITY_CLAIM_PUBLIC_KEY: process.env.TOITOI_IDENTITY_CLAIM_PUBLIC_KEY,
        TOITOI_IDENTITY_CLAIM_PRIVATE_KEY: process.env.TOITOI_IDENTITY_CLAIM_PRIVATE_KEY,
        TOITOI_IDENTITY_CLAIM_RULE_VERSION: process.env.TOITOI_IDENTITY_CLAIM_RULE_VERSION,
      };

      delete process.env.TOITOI_IDENTITY_CLAIM_METHOD;
      delete process.env.TOITOI_IDENTITY_CLAIM_KEY_ID;
      delete process.env.TOITOI_IDENTITY_CLAIM_PUBLIC_KEY;
      delete process.env.TOITOI_IDENTITY_CLAIM_PRIVATE_KEY;
      delete process.env.TOITOI_IDENTITY_CLAIM_RULE_VERSION;

      try {
        assert.strictEqual(readIdentityClaimSignerFromEnv(), null);
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
    name: 'buildJetstreamUrl appends filters and cursor',
    run() {
      const url = buildJetstreamUrl(
        'wss://jetstream.example/subscribe',
        ['app.toitoi.inquiry'],
        123456
      );

      assert.strictEqual(
        url,
        'wss://jetstream.example/subscribe?wantedCollections=app.toitoi.inquiry&cursor=123456'
      );
    },
  },
  {
    name: 'convert Jetstream commit messages into ATProto raw records',
    run() {
      const rawEvent = toAtProtoRecordFromJetstreamMessage({
        kind: 'commit',
        did: 'did:plc:toitoi123',
        time_us: '1716806400000000',
        commit: {
          operation: 'create',
          collection: 'app.toitoi.inquiry',
          rkey: 'abc123',
          cid: 'bafytest',
          record: {
            text: 'microclimate は雑草に影響するか？',
            createdAt: '2026-05-28T00:00:00.000Z',
          },
        },
      });

      assert.ok(rawEvent);
      assert.strictEqual(rawEvent.uri, 'at://did:plc:toitoi123/app.toitoi.inquiry/abc123');
      assert.strictEqual(rawEvent.indexedAt, '2024-05-27T10:40:00.000Z');
      assert.strictEqual(rawEvent.record.text, 'microclimate は雑草に影響するか？');
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
