'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { ingestNostrEvents } = require('@toitoi/nostr/adapter/ingest_pipeline');
const { persistIngestResult } = require('@toitoi/nostr/storage/persistence');
const { replayStorage } = require('@toitoi/nostr/storage/replay');
const { createStandardApiService } = require('@toitoi/api/standard_api_service');
const { makeTempDir } = require('@toitoi/nostr/storage/test_fixtures');

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function loadSampleEvents(ids) {
  const samplePath = path.resolve(__dirname, '../../../examples/sample-nostr-archive.jsonl');
  const events = readJsonl(samplePath);
  const byId = new Map(events.map(event => [event.id, event]));
  return ids.map(id => {
    const event = byId.get(id);
    if (!event) {
      throw new Error(`Sample event not found: ${id}`);
    }
    return event;
  });
}

async function runTest() {
  const storageDir = makeTempDir('toitoi-operational-e2e-');
  const [rootEvent, childEvent, grandChildEvent] = loadSampleEvents([
    '78062038e229c3d0266dd891db549ae05fabefe25aab4db344ba6394b38b47bc',
    '1db712d4cce732ef81ba55a15bc0633f3b9d7d64de0c40e4b1ff24342daa8a4e',
    'fbbcd594a019b1dea80267eca06aacf2f1b992f6f524012fe905dadeb89d9e86',
  ]);

  const ingestResult = ingestNostrEvents([rootEvent, childEvent, grandChildEvent], {
    skipVerify: true,
  });

  assert.strictEqual(ingestResult.accepted.length, 3);
  assert.strictEqual(ingestResult.invalid.length, 0);

  persistIngestResult(storageDir, ingestResult, {
    source: 'sample-archive',
    sourceLabel: path.resolve(__dirname, '../../../examples/sample-nostr-archive.jsonl'),
  });

  const replayed = replayStorage(storageDir, { persistIndex: false });
  assert.strictEqual(replayed.indexSnapshot.total, 3);
  const canonicalIds = replayed.ingestResult.accepted.map(item => item.canonicalEvent.id);

  const service = createStandardApiService({
    indexSnapshot: replayed.indexSnapshot,
  });

  const health = service.handleRequest({ method: 'GET', url: '/health' });
  assert.strictEqual(health.statusCode, 200);
  assert.strictEqual(health.body.status, 'ok');

  const list = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries?limit=10&offset=0&order=desc' });
  assert.strictEqual(list.statusCode, 200);
  assert.strictEqual(list.body.total, 3);
  assert.deepStrictEqual(list.body.results.map(result => result.event.id), [
    canonicalIds[2],
    canonicalIds[1],
    canonicalIds[0],
  ]);

  const lookup = service.handleRequest({ method: 'GET', url: `/api/v1/inquiries/${rootEvent.id}` });
  assert.strictEqual(lookup.statusCode, 200);
  assert.strictEqual(lookup.body.id, canonicalIds[0]);
  assert.ok(lookup.body.provenance);

  const query = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/query?q=soil_microbe' });
  assert.strictEqual(query.statusCode, 200);
  assert.strictEqual(query.body.total, 2);

  const relation = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries/relation?relationship=soil_microbe' });
  assert.strictEqual(relation.statusCode, 200);
  assert.strictEqual(relation.body.total, 2);

  const tree = service.handleRequest({ method: 'GET', url: `/api/v1/inquiries/${rootEvent.id}/tree` });
  assert.strictEqual(tree.statusCode, 200);
  assert.strictEqual(tree.body.id, canonicalIds[0]);
  assert.strictEqual(tree.body.children.length, 1);
  assert.strictEqual(tree.body.children[0].id, canonicalIds[1]);
}

if (require.main === module) {
  runTest().then(() => {
    process.stderr.write('[DONE] operational e2e passed\n');
  }).catch(error => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  loadSampleEvents,
  readJsonl,
  runTest,
};
