'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fixture = require('../../../packages/lingonberry/fixtures/minimal-publish-request.json');
const {
  extractCarrierObjects,
  normalizeIdentityClaimSigner,
  parseArgs,
  readArchive,
  readCarrier,
  readJsonl,
  writeResult,
} = require('./lingonberry_ingest_worker');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-lingonberry-worker-'));
}

function makeResult() {
  return {
    accepted: [{
      rawEvent: fixture,
      normalizedEvent: fixture,
      canonicalEvent: { type: 'inquiry', body: { text: 'one', language: 'und' } },
      warnings: [],
      verification: { ok: true, verified: false, skipped: true, reason: '' },
    }],
    invalid: [],
    duplicates: [],
    unverified: [],
    orderedEvents: [fixture],
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
      assert.strictEqual(args.protocol, 'lingonberry');
    },
  },
  {
    name: 'parseArgs allows storage-only systemd runs without output',
    run() {
      const args = parseArgs([
        'node',
        'script',
        '--archive-dir',
        '/var/lib/toitoi/lingonberry-archive',
        '--storage-dir',
        '/var/lib/toitoi/lingonberry-storage',
      ]);

      assert.strictEqual(args.archiveDir, '/var/lib/toitoi/lingonberry-archive');
      assert.strictEqual(args.storageDir, '/var/lib/toitoi/lingonberry-storage');
      assert.strictEqual(args.output, '');
    },
  },
  {
    name: 'parseArgs reads carrier URL options',
    run() {
      const args = parseArgs([
        'node',
        'script',
        '--carrier-url',
        'https://relay.example',
        '--carrier-cursor',
        'abc',
        '--carrier-limit',
        '25',
        '--storage-dir',
        './lingonberry-storage',
      ]);

      assert.strictEqual(args.carrierUrl, 'https://relay.example');
      assert.strictEqual(args.carrierCursor, 'abc');
      assert.strictEqual(args.carrierLimit, 25);
      assert.strictEqual(args.storageDir, './lingonberry-storage');
    },
  },
  {
    name: 'parseArgs ignores a pnpm-style separator',
    run() {
      const args = parseArgs([
        'node',
        'script',
        '--',
        '--archive-dir',
        'archive',
        '--out',
        'output.json',
        '--storage-dir',
        './lingonberry-storage',
      ]);

      assert.strictEqual(args.archiveDir, 'archive');
      assert.strictEqual(args.output, 'output.json');
      assert.strictEqual(args.storageDir, './lingonberry-storage');
    },
  },
  {
    name: 'parseArgs rejects mixed input modes',
    run() {
      assert.throws(() => parseArgs([
        'node',
        'script',
        '--in',
        'input.jsonl',
        '--archive-dir',
        'archive',
        '--out',
        'output.json',
      ]), /mutually exclusive/);
      assert.throws(() => parseArgs([
        'node',
        'script',
        '--archive-dir',
        'archive',
        '--carrier-url',
        'https://relay.example',
      ]), /mutually exclusive/);
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
    name: 'readJsonl reads Lingonberry raw events',
    async run() {
      const dir = makeTempDir();
      const file = path.join(dir, 'events.jsonl');
      fs.writeFileSync(file, `${JSON.stringify(fixture)}\n`, 'utf8');
      const events = await readJsonl(file);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].object.id, fixture.object.id);
    },
  },
  {
    name: 'readArchive reads requestJson from wire-log',
    async run() {
      const dir = makeTempDir();
      fs.writeFileSync(
        path.join(dir, 'wire-log.jsonl'),
        `${JSON.stringify({ requestJson: JSON.stringify(fixture) })}\n`,
        'utf8',
      );
      const events = await readArchive(dir);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].object.rawRef.sourceId, 'draft:toitoi-example-0001');
    },
  },
  {
    name: 'extractCarrierObjects accepts common carrier response shapes',
    run() {
      assert.strictEqual(extractCarrierObjects([fixture])[0].object.id, fixture.object.id);
      assert.strictEqual(extractCarrierObjects({ objects: [fixture] })[0].object.id, fixture.object.id);
      assert.strictEqual(
        extractCarrierObjects({ items: [{ requestJson: JSON.stringify(fixture) }] })[0].object.id,
        fixture.object.id,
      );
      assert.strictEqual(
        extractCarrierObjects({ records: [{ object: fixture.object }] })[0].id,
        fixture.object.id,
      );
    },
  },
  {
    name: 'readCarrier reads objects from a carrier collection endpoint',
    async run() {
      const originalFetch = global.fetch;
      const calls = [];
      global.fetch = async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ objects: [fixture] }),
        };
      };

      try {
        const events = await readCarrier('https://relay.example', {
          cursor: 'abc',
          limit: 5,
        });

        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].object.id, fixture.object.id);
        assert.strictEqual(calls[0].url, 'https://relay.example/v1/objects?cursor=abc&limit=5');
        assert.strictEqual(calls[0].init.method, 'GET');
      } finally {
        global.fetch = originalFetch;
      }
    },
  },
  {
    name: 'writeResult emits report and canonical formats and ignores empty output',
    run() {
      const dir = makeTempDir();
      const reportFile = path.join(dir, 'report.json');
      const canonicalFile = path.join(dir, 'canonical.jsonl');
      const result = makeResult();

      writeResult('', 'report', result);
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

run();
