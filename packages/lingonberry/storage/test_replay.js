'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fixture = require('../fixtures/minimal-publish-request.json');
const { ingestLingonberryEvents } = require('../adapter/ingest_pipeline');
const { persistIngestResult } = require('./persistence');
const {
  buildCanonicalIdMapFromRawRecords,
  loadPersistedIndexSnapshot,
  replayStorage,
  sourceIdFromRawEvent,
} = require('./replay');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-lingonberry-replay-'));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

const tests = [
  {
    name: 'sourceIdFromRawEvent resolves Lingonberry rawRef source id',
    run() {
      assert.strictEqual(sourceIdFromRawEvent(fixture), 'draft:toitoi-example-0001');
    },
  },
  {
    name: 'replayStorage rebuilds a Lingonberry derived index from raw storage',
    run() {
      const storageDir = makeTempDir();
      const child = cloneJson(fixture);
      child.object.id = 'lb:obj:toitoi-example-0002';
      child.object.createdAt = '2026-06-17T00:00:01Z';
      child.object.body.text = 'Does soil moisture change that evidence?';
      child.object.rawRef.sourceId = 'draft:toitoi-example-0002';
      child.object.provenance.sources[0].sourceId = 'draft:toitoi-example-0002';
      child.object.lineage = [{
        type: 'derived_from',
        target: 'draft:toitoi-example-0001',
      }];

      const ingestResult = ingestLingonberryEvents([fixture, child], {
        skipVerify: true,
      });
      persistIngestResult(storageDir, ingestResult, {
        source: 'jsonl',
        sourceLabel: 'fixture',
      });

      const replayed = replayStorage(storageDir);
      assert.strictEqual(replayed.ingestResult.accepted.length, 2);
      assert.strictEqual(replayed.indexSnapshot.total, 2);
      assert.ok(Array.isArray(replayed.indexSnapshot.byType.inquiry));
      assert.strictEqual(replayed.indexSnapshot.byType.inquiry.length, 2);
      assert.strictEqual(
        replayed.ingestResult.accepted[0].canonicalEvent.id,
        ingestResult.accepted[0].canonicalEvent.id
      );
      assert.strictEqual(replayed.rawRecords[0].canonicalEventId, ingestResult.accepted[0].canonicalEvent.id);
      assert.ok(replayed.indexSnapshot.sourceIdIndex['draft:toitoi-example-0001']);

      const persistedSnapshot = loadPersistedIndexSnapshot(storageDir);
      assert.strictEqual(persistedSnapshot.total, 2);
    },
  },
  {
    name: 'buildCanonicalIdMapFromRawRecords keeps the earliest canonical id',
    run() {
      const mapping = buildCanonicalIdMapFromRawRecords([
        {
          rawEvent: fixture,
          canonicalEventId: 'tt:evt:01JVVFIRSTLINGONBERRY00000000000',
        },
        {
          rawEvent: fixture,
          canonicalEventId: 'tt:evt:01JVVSECONDLINGONBERRY0000000000',
        },
      ]);

      assert.strictEqual(
        mapping.get('draft:toitoi-example-0001'),
        'tt:evt:01JVVFIRSTLINGONBERRY00000000000'
      );
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
