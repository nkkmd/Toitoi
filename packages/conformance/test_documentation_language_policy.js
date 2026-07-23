'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '../..');

function read(relativePath) {
  const filename = path.join(repositoryRoot, relativePath);
  assert.equal(fs.existsSync(filename), true, `missing documentation file: ${relativePath}`);
  return fs.readFileSync(filename, 'utf8');
}

function assertBilingualDocument(relativePath, {
  englishHeading,
  japaneseHeading,
  requiredLiterals = [],
}) {
  const content = read(relativePath);
  assert.ok(content.includes(englishHeading), `${relativePath}: missing English heading`);
  assert.ok(content.includes(japaneseHeading), `${relativePath}: missing Japanese heading`);
  assert.ok(
    content.includes('Language status: English and Japanese sections are maintained as equivalent.'),
    `${relativePath}: missing English synchronization marker`,
  );
  assert.ok(
    content.includes('言語状態:'),
    `${relativePath}: missing Japanese synchronization marker`,
  );
  assert.ok(content.includes('Last synchronized:'), `${relativePath}: missing synchronization date`);
  assert.ok(content.includes('最終同期日:'), `${relativePath}: missing Japanese synchronization date`);

  const separatorIndex = content.indexOf('\n---\n');
  assert.ok(separatorIndex > 0, `${relativePath}: missing English/Japanese separator`);
  const english = content.slice(0, separatorIndex);
  const japanese = content.slice(separatorIndex + 5);

  for (const literal of requiredLiterals) {
    assert.ok(english.includes(literal), `${relativePath}: English section missing ${literal}`);
    assert.ok(japanese.includes(literal), `${relativePath}: Japanese section missing ${literal}`);
  }
}

const policy = read('docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md');
assert.ok(policy.includes('## Class A registry'));
assert.ok(policy.includes('# Toitoi 文書言語ポリシー'));
assert.ok(policy.includes('docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md'));

assertBilingualDocument('docs/reference/V1.0.0_SETUP_AND_DEMO.md', {
  englishHeading: '# Toitoi v1.0.0 Reference Setup and Demo',
  japaneseHeading: '# Toitoi v1.0.0 参照環境のセットアップとデモ',
  requiredLiterals: [
    'corepack pnpm install --frozen-lockfile',
    'fixtures/reference/v1.0.0/conformance-input.json',
    'TOITOI_STORAGE_DIR',
    'TOITOI_AI_STORAGE_DIR',
    'TOITOI_SEARCH_INDEX_FILE',
    'TOITOI_AUTH_REQUIRED',
    'X-Toitoi-Actor-Id',
    'X-Toitoi-Roles',
    'Idempotency-Key',
    '@toitoi/frontend',
    '@toitoi/operations',
  ],
});

assertBilingualDocument('docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md', {
  englishHeading: '# Toitoi v1.0.0 Minimum Operations Runbook',
  japaneseHeading: '# Toitoi v1.0.0 最小運用Runbook',
  requiredLiterals: [
    'corepack pnpm install --frozen-lockfile',
    'TOITOI_STORAGE_DIR',
    'TOITOI_AI_STORAGE_DIR',
    'TOITOI_SEARCH_INDEX_FILE',
    'TOITOI_AUTH_REQUIRED',
    '/health/live',
    '/health/ready',
    'SHA-256',
    'Idempotency-Key',
    'fixtures/reference/v1.0.0/conformance-input.json',
  ],
});

console.log('documentation language policy checks passed');
