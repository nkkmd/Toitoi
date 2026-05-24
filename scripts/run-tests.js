'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function isTestFile(fileName) {
  return /^test.*\.js$/i.test(fileName);
}

function walk(directory, results) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, results);
      continue;
    }

    if (entry.isFile() && isTestFile(entry.name)) {
      results.push(fullPath);
    }
  }
}

function main() {
  const root = path.resolve(process.argv[2] || process.cwd());
  const includeIntegration = process.env.TOITOI_INCLUDE_INTEGRATION_TESTS === '1';
  const files = [];

  walk(root, files);
  files.sort((left, right) => left.localeCompare(right));

  const runnableFiles = includeIntegration
    ? files
    : files.filter(file => path.basename(file) !== 'test_relay.js');

  const skippedFiles = files.length - runnableFiles.length;

  if (runnableFiles.length === 0) {
    console.log(`[SKIP] no test files found under ${root}`);
    return;
  }

  let failed = 0;

  for (const file of runnableFiles) {
    const relativePath = path.relative(root, file) || path.basename(file);
    console.log(`[RUN] ${relativePath}`);

    const result = spawnSync(process.execPath, [file], {
      stdio: 'inherit',
      cwd: root,
    });

    if (result.status !== 0) {
      failed += 1;
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    console.error(`\n${failed} test file(s) failed`);
    return;
  }

  const summary = `${runnableFiles.length} test file(s) passed`;
  if (skippedFiles > 0) {
    console.log(`\n${summary} (${skippedFiles} skipped)`);
    return;
  }

  console.log(`\n${summary}`);
}

main();
