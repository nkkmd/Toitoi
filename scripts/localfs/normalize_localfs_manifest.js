'use strict';

const fs = require('fs');
const path = require('path');

function normalizeLocalFsManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('manifest must be an object');
  }

  const manifestId = typeof manifest.manifestId === 'string' ? manifest.manifestId : '';
  const rootPath = typeof manifest.rootPath === 'string' ? manifest.rootPath : '';
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];

  return entries
    .filter(entry => entry && typeof entry === 'object')
    .map((entry, index) => ({
      kind: 'localfs-entry',
      recordId: typeof entry.recordId === 'string' && entry.recordId !== ''
        ? entry.recordId
        : `localfs:entry:${index + 1}`,
      sourcePath: typeof entry.sourcePath === 'string' ? entry.sourcePath : '',
      mtime: typeof entry.mtime === 'string' ? entry.mtime : null,
      sizeBytes: typeof entry.sizeBytes === 'number' ? entry.sizeBytes : null,
      metadata: {
        source: 'filesystem',
        projection: 'metadata-only',
        originManifestId: manifestId || null,
        rootPath: rootPath || null,
        status: 'fixture',
      },
    }));
}

function loadManifest(filePath) {
  const absolutePath = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function writeArchive(records, outputPath) {
  const lines = records.map(record => JSON.stringify(record));
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
}

function main(argv = process.argv.slice(2)) {
  const inputPath = argv[0];
  const outputPath = argv[1];

  if (!inputPath || !outputPath) {
    throw new Error('usage: node scripts/localfs/normalize_localfs_manifest.js <input-manifest.json> <output-archive.jsonl>');
  }

  const manifest = loadManifest(inputPath);
  const records = normalizeLocalFsManifest(manifest);
  writeArchive(records, outputPath);
  console.log(`Wrote ${records.length} localfs archive record(s) to ${path.resolve(outputPath)}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  loadManifest,
  main,
  normalizeLocalFsManifest,
  writeArchive,
};
