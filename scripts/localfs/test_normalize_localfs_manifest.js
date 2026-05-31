'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  normalizeLocalFsManifest,
  writeArchive,
} = require('./normalize_localfs_manifest');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-localfs-migration-'));
}

const tests = [
  {
    name: 'normalizeLocalFsManifest converts manifest entries into archive records',
    run() {
      const manifest = {
        manifestId: 'localfs:manifest:001',
        rootPath: 'examples/localfs',
        entries: [
          {
            sourcePath: 'examples/localfs/inquiry-001.json',
            recordId: 'localfs:sample:001',
            mtime: '2026-05-31T00:00:00.000Z',
          },
          {
            sourcePath: 'examples/localfs/inquiry-002.json',
            recordId: 'localfs:sample:002',
            mtime: '2026-05-31T00:05:00.000Z',
          },
        ],
      };

      const records = normalizeLocalFsManifest(manifest);

      assert.strictEqual(records.length, 2);
      assert.strictEqual(records[0].kind, 'localfs-entry');
      assert.strictEqual(records[0].metadata.originManifestId, 'localfs:manifest:001');
      assert.strictEqual(records[1].metadata.rootPath, 'examples/localfs');
    },
  },
  {
    name: 'writeArchive serializes normalized records as JSONL',
    run() {
      const dir = makeTempDir();
      const outputPath = path.join(dir, 'localfs-archive.jsonl');
      const records = [
        {
          kind: 'localfs-entry',
          recordId: 'localfs:sample:001',
          sourcePath: 'examples/localfs/inquiry-001.json',
          mtime: '2026-05-31T00:00:00.000Z',
          sizeBytes: 128,
          metadata: { status: 'fixture' },
        },
      ];

      writeArchive(records, outputPath);

      const lines = fs.readFileSync(outputPath, 'utf8').trim().split('\n');
      assert.strictEqual(lines.length, 1);
      const parsed = JSON.parse(lines[0]);
      assert.strictEqual(parsed.recordId, 'localfs:sample:001');
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
