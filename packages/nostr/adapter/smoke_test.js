'use strict';

const fs = require('fs');
const path = require('path');
const { classifyEvent } = require('./nostr_adapter');

function readFirstSampleEvent() {
  const samplePath = path.resolve(__dirname, '../../../examples/sample-nostr-archive.jsonl');
  const raw = fs.readFileSync(samplePath, 'utf8');
  const line = raw.split('\n').find(line => line.trim() !== '');

  if (!line) {
    throw new Error('sample archive is empty');
  }

  return JSON.parse(line);
}

function main() {
  const event = readFirstSampleEvent();
  const result = classifyEvent(event, { skipVerify: true });

  if (result.status === 'invalid_signature' || result.status === 'invalid') {
    throw new Error(`smoke test failed: ${result.errors.join(', ')}`);
  }

  if (!result.canonicalEvent) {
    throw new Error('smoke test failed: canonicalEvent is missing');
  }

  console.log(JSON.stringify({
    status: result.status,
    canonicalId: result.canonicalEvent.id,
    type: result.canonicalEvent.type,
    phase: result.canonicalEvent.phase || null,
    labels: result.canonicalEvent.labels || [],
    contexts: result.canonicalEvent.contexts || {},
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
