'use strict';

const fs = require('fs');
const path = require('path');

function getAtProtoOperationalDocPath() {
  return path.resolve(__dirname, '../../docs/operations/ATPROTO_STORAGE_AND_REPLAY.md');
}

function validateAtProtoStorageAndReplayDoc(docPath = getAtProtoOperationalDocPath()) {
  const source = fs.readFileSync(docPath, 'utf8');
  const requiredSnippets = [
    'ATProto Storage のバックアップと replay',
    'packages/atproto/storage/persistence.js',
    'packages/atproto/storage/replay.js',
    'ATPROTO_LIVE_SMOKE_TEST=1',
    'packages/atproto/test_fixtures.js',
  ];

  const errors = [];
  for (const snippet of requiredSnippets) {
    if (!source.includes(snippet)) {
      errors.push(`missing required snippet: ${snippet}`);
    }
  }

  return {
    docPath,
    source,
    errors,
  };
}

function main() {
  const result = validateAtProtoStorageAndReplayDoc();

  if (result.errors.length > 0) {
    console.error(`FAIL ${path.relative(process.cwd(), result.docPath)}`);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`PASS ${path.relative(process.cwd(), result.docPath)}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  getAtProtoOperationalDocPath,
  validateAtProtoStorageAndReplayDoc,
};
