'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ingestNostrEvents } = require('./ingest_pipeline');
const {
  normalizeIdentityClaimSigner,
  readIdentityClaimSignerFromEnv,
  readJsonl,
  writeOutput,
} = require('./ingest_jsonl');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-ingest-jsonl-'));
}

function writeFile(filePath, contents) {
  fs.writeFileSync(filePath, contents, 'utf8');
}

async function runPipeline(inputPath, outputPath, format) {
  const rawEvents = await readJsonl(inputPath);
  const ingestResult = ingestNostrEvents(rawEvents, { skipVerify: true });
  await writeOutput(outputPath, format, ingestResult);
  return ingestResult;
}

const tests = [
  {
    name: 'writes a report for a JSONL batch',
    async run() {
      const dir = makeTempDir();
      const input = path.join(dir, 'input.jsonl');
      const output = path.join(dir, 'report.json');

      writeFile(input, [
        JSON.stringify({
          kind: 1042,
          id: 'a',
          pubkey: 'p',
          created_at: 1,
          content: 'one',
          tags: [['phase', 'beginner']],
          sig: 's',
        }),
        JSON.stringify({
          kind: 1042,
          id: 'a',
          pubkey: 'p',
          created_at: 2,
          content: 'two',
          tags: [['phase', 'beginner']],
          sig: 's',
        }),
        JSON.stringify({
          kind: 1042,
          id: 'b',
          pubkey: 'p',
          created_at: 3,
          content: '',
          tags: [['phase', 'beginner']],
          sig: 's',
        }),
      ].join('\n'));

      const ingestResult = await runPipeline(input, output, 'report');

      const report = JSON.parse(fs.readFileSync(output, 'utf8'));
      assert.strictEqual(report.accepted, 1);
      assert.strictEqual(report.invalid, 1);
      assert.strictEqual(report.duplicates, 1);
      assert.strictEqual(report.unverified, 1);
      assert.strictEqual(ingestResult.accepted.length, 1);
    },
  },
  {
    name: 'writes canonical events for accepted items',
    async run() {
      const dir = makeTempDir();
      const input = path.join(dir, 'input.jsonl');
      const output = path.join(dir, 'canonical.jsonl');

      writeFile(input, [
        JSON.stringify({
          kind: 1042,
          id: 'a',
          pubkey: 'p',
          created_at: 1,
          content: 'one',
          tags: [['phase', 'beginner']],
          sig: 's',
        }),
      ].join('\n'));

      await runPipeline(input, output, 'canonical');

      const lines = fs.readFileSync(output, 'utf8').trim().split('\n');
      assert.strictEqual(lines.length, 1);
      const canonical = JSON.parse(lines[0]);
      assert.strictEqual(canonical.type, 'inquiry');
      assert.strictEqual(canonical.body.text, 'one');
    },
  },
  {
    name: 'reads identity claim signer settings from environment',
    run() {
      const envBackup = {
        TOITOI_IDENTITY_CLAIM_METHOD: process.env.TOITOI_IDENTITY_CLAIM_METHOD,
        TOITOI_IDENTITY_CLAIM_KEY_ID: process.env.TOITOI_IDENTITY_CLAIM_KEY_ID,
        TOITOI_IDENTITY_CLAIM_PUBLIC_KEY: process.env.TOITOI_IDENTITY_CLAIM_PUBLIC_KEY,
        TOITOI_IDENTITY_CLAIM_PRIVATE_KEY: process.env.TOITOI_IDENTITY_CLAIM_PRIVATE_KEY,
        TOITOI_IDENTITY_CLAIM_RULE_VERSION: process.env.TOITOI_IDENTITY_CLAIM_RULE_VERSION,
      };

      process.env.TOITOI_IDENTITY_CLAIM_METHOD = 'ed25519';
      process.env.TOITOI_IDENTITY_CLAIM_KEY_ID = 'ingest-jsonl-key';
      process.env.TOITOI_IDENTITY_CLAIM_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\npublic\n-----END PUBLIC KEY-----';
      process.env.TOITOI_IDENTITY_CLAIM_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----';
      process.env.TOITOI_IDENTITY_CLAIM_RULE_VERSION = 'identity-key-v1';

      try {
        const signer = readIdentityClaimSignerFromEnv();
        assert.strictEqual(signer.method, 'ed25519');
        assert.strictEqual(signer.keyId, 'ingest-jsonl-key');
        assert.strictEqual(signer.ruleVersion, 'identity-key-v1');
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
    name: 'normalizes identity claim signer configuration',
    run() {
      assert.strictEqual(normalizeIdentityClaimSigner({ method: 'none' }), null);
      const signer = normalizeIdentityClaimSigner({
        method: 'ed25519',
        privateKey: ' private ',
        publicKey: ' public ',
        keyId: ' key-1 ',
      });
      assert.strictEqual(signer.method, 'ed25519');
      assert.strictEqual(signer.privateKey, 'private');
      assert.strictEqual(signer.publicKey, 'public');
      assert.strictEqual(signer.keyId, 'key-1');
    },
  },
];

async function run() {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
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

run().catch(error => {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.stack || error.message : String(error));
});
