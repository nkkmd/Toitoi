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

function assertBilingualDocument(relativePath, { englishHeading, japaneseHeading, requiredLiterals = [] }) {
  const content = read(relativePath);
  assert.ok(content.includes(englishHeading), `${relativePath}: missing English heading`);
  assert.ok(content.includes(japaneseHeading), `${relativePath}: missing Japanese heading`);
  assert.ok(/Language status:\*{0,2}\s*English and Japanese sections are maintained as equivalent\./.test(content), `${relativePath}: missing English synchronization marker`);
  assert.ok(/言語状態:\*{0,2}/.test(content), `${relativePath}: missing Japanese synchronization marker`);
  assert.ok(/Last synchronized:\*{0,2}\s*\d{4}-\d{2}-\d{2}/.test(content), `${relativePath}: missing synchronization date`);
  assert.ok(/最終同期日:\*{0,2}\s*\d{4}-\d{2}-\d{2}/.test(content), `${relativePath}: missing Japanese synchronization date`);

  const japaneseHeadingIndex = englishHeading === japaneseHeading
    ? content.lastIndexOf(japaneseHeading)
    : content.indexOf(japaneseHeading);
  assert.ok(japaneseHeadingIndex > 0, `${relativePath}: invalid Japanese section position`);
  const separatorIndex = content.lastIndexOf('\n---\n', japaneseHeadingIndex);
  assert.ok(separatorIndex > 0, `${relativePath}: missing English/Japanese separator`);
  const english = content.slice(0, separatorIndex);
  const japanese = content.slice(japaneseHeadingIndex);

  for (const literal of requiredLiterals) {
    assert.ok(english.includes(literal), `${relativePath}: English section missing ${literal}`);
    assert.ok(japanese.includes(literal), `${relativePath}: Japanese section missing ${literal}`);
  }
}

const classARegistry = [
  'docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md',
  'README.md',
  'docs/architecture/ARCHITECTURE_OVERVIEW.md',
  'docs/protocols/CANONICAL_EVENT.md',
  'docs/reference/V1.0.0_SETUP_AND_DEMO.md',
  'docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/roadmap/RELEASE_NOTES.md',
];

const quickstartClassARegistry = [
  'docs/quickstart/README.md',
  'docs/quickstart/TRANSPORT_QUICKSTART.md',
  'docs/quickstart/INDEXER_API_QUICKSTART.md',
  'docs/quickstart/EDGE_AI_QUICKSTART.md',
];

const completeClassARegistry = [...classARegistry, ...quickstartClassARegistry];

const policy = read('docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md');
for (const relativePath of classARegistry) {
  assert.ok(policy.includes(`\`${relativePath}\``), `policy registry missing ${relativePath}`);
  assert.equal(fs.existsSync(path.join(repositoryRoot, relativePath)), true, `registered Class A file missing: ${relativePath}`);
}
assert.equal(policy.includes('docs/architecture/ARCHITECTURE.md` or'), false, 'ambiguous architecture registry path remains');
assert.equal(policy.includes('SECURITY.md` or'), false, 'ambiguous security registry path remains');
assert.ok(policy.includes('Class A status is assigned only by inclusion in the Class A registry.'));
assert.ok(policy.includes('Class Aへの分類は、Class A registryへの登録によってのみ確定します。'));
assert.ok(policy.includes('## Versioned Class A document lifecycle'));
assert.ok(policy.includes('## version付きClass A文書の世代管理'));
assert.ok(policy.includes('## Human semantic-equivalence review'));
assert.ok(policy.includes('## human semantic-equivalence review'));
assert.ok(policy.includes('reviewer identity'));
assert.ok(policy.includes('reviewed commit SHA'));
assert.ok(policy.includes('docs/roadmap/V1.0.0_RELEASE_RECORD.md'));

const quickstartDecision = read('docs/governance/V1.0.0_QUICKSTART_CLASS_A_DECISION.md');
for (const relativePath of quickstartClassARegistry) {
  assert.ok(quickstartDecision.includes(`\`${relativePath}\``), `quickstart registry amendment missing ${relativePath}`);
  assert.equal(fs.existsSync(path.join(repositoryRoot, relativePath)), true, `registered quickstart Class A file missing: ${relativePath}`);
}
assert.ok(quickstartDecision.includes('Nostr, Lingonberry, and ATProto'));
assert.ok(quickstartDecision.includes('Nostr、Lingonberry、ATProto'));

const preReview = read('docs/reviews/V1.0.0_CLASS_A_SEMANTIC_PRE_REVIEW.md');
const releaseRecord = read('docs/roadmap/V1.0.0_RELEASE_RECORD.md');
for (const relativePath of completeClassARegistry) {
  assert.ok(preReview.includes(`\`${relativePath}\``), `semantic pre-review missing ${relativePath}`);
  assert.ok(releaseRecord.includes(`\`${relativePath}\``), `release record human review set missing ${relativePath}`);
}
assert.ok(preReview.includes('human sign-off pending'));
assert.ok(preReview.includes('must not be represented as human approval'));
assert.ok(releaseRecord.includes('AI-assisted semantic pre-review: complete'));
assert.ok(releaseRecord.includes('human semantic-equivalence review: pending'));

assertBilingualDocument('docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md', {
  englishHeading: '# Toitoi Documentation Language Policy',
  japaneseHeading: '# Toitoi 文書言語ポリシー',
  requiredLiterals: ['ARCHITECTURE_OVERVIEW.md','V1.0.0_RELEASE_RECORD.md','reviewed commit SHA','Class A registry'],
});

assertBilingualDocument('README.md', {
  englishHeading: '# Toitoi 🌱',
  japaneseHeading: '# Toitoi 🌱',
  requiredLiterals: ['DOCUMENTATION_LANGUAGE_POLICY.md','ARCHITECTURE_OVERVIEW.md','CANONICAL_EVENT.md','V1.0.0_OPERATIONS_RUNBOOK.md','SECURITY.md','corepack pnpm test','fixtures/reference/v1.0.0/conformance-input.json'],
});

assertBilingualDocument('docs/quickstart/README.md', {
  englishHeading: '# Toitoi Developer Quick Starts',
  japaneseHeading: '# Toitoi 外部開発者向けQuick Start',
  requiredLiterals: ['TRANSPORT_QUICKSTART.md','INDEXER_API_QUICKSTART.md','EDGE_AI_QUICKSTART.md','corepack pnpm install --frozen-lockfile'],
});

assertBilingualDocument('docs/quickstart/TRANSPORT_QUICKSTART.md', {
  englishHeading: '# Transport Quick Start',
  japaneseHeading: '# Transport Quick Start',
  requiredLiterals: ['@toitoi/nostr-transport','@toitoi/lingonberry-transport','@toitoi/atproto-transport','TOITOI_TRANSPORT_SOURCES','Canonical identity'],
});

assertBilingualDocument('docs/quickstart/INDEXER_API_QUICKSTART.md', {
  englishHeading: '# Indexer and Standard API Quick Start',
  japaneseHeading: '# Indexer・Standard API Quick Start',
  requiredLiterals: ['PORT=3000','/health/live','/health/ready','TOITOI_TRANSPORT_SOURCES','@toitoi/conformance'],
});

assertBilingualDocument('docs/quickstart/EDGE_AI_QUICKSTART.md', {
  englishHeading: '# Edge AI Quick Start',
  japaneseHeading: '# Edge AI Quick Start',
  requiredLiterals: ['TOITOI_AI_STORAGE_DIR','ai-inspection:enabled','@toitoi/ai test','llama-server','publication approval'],
});

assertBilingualDocument('docs/reference/V1.0.0_SETUP_AND_DEMO.md', {
  englishHeading: '# Toitoi v1.0.0 Reference Setup and Demo',
  japaneseHeading: '# Toitoi v1.0.0 参照環境のセットアップとデモ',
  requiredLiterals: ['corepack pnpm install --frozen-lockfile','fixtures/reference/v1.0.0/conformance-input.json','TOITOI_STORAGE_DIR','TOITOI_AUTH_REQUIRED','X-Toitoi-Actor-Id','@toitoi/frontend','@toitoi/operations'],
});

assertBilingualDocument('docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md', {
  englishHeading: '# Toitoi v1.0.0 Minimum Operations Runbook',
  japaneseHeading: '# Toitoi v1.0.0 最小運用Runbook',
  requiredLiterals: ['corepack pnpm install --frozen-lockfile','TOITOI_STORAGE_DIR','TOITOI_AUTH_REQUIRED','/health/live','/health/ready','SHA-256','Idempotency-Key'],
});

assertBilingualDocument('docs/architecture/ARCHITECTURE_OVERVIEW.md', {
  englishHeading: '# Toitoi Architecture Overview',
  japaneseHeading: '# Toitoi アーキテクチャ概要',
  requiredLiterals: ['Canonical storage','schemaVersion: "0.1.0"','synthesizes','Nostr / Lingonberry / ATProto'],
});

assertBilingualDocument('docs/protocols/CANONICAL_EVENT.md', {
  englishHeading: '# Canonical Event',
  japaneseHeading: '# Canonical Event',
  requiredLiterals: ['schemaVersion: "0.1.0"','tt:evt:<opaque-id>','provenance.sources','rawRef','synthesizes','v0.9.0'],
});

assertBilingualDocument('CONTRIBUTING.md', {
  englishHeading: '# Contributing to Toitoi',
  japaneseHeading: '# Toitoiへの貢献',
  requiredLiterals: ['corepack pnpm test','DOCUMENTATION_LANGUAGE_POLICY.md','SECURITY.md'],
});

assertBilingualDocument('SECURITY.md', {
  englishHeading: '# Security and Sensitive Information',
  japaneseHeading: '# セキュリティと機微情報',
  requiredLiterals: ['Canonical Event identity','OAuth/OIDC','private key'],
});

const releaseNotes = read('docs/roadmap/RELEASE_NOTES.md');
assert.ok(releaseNotes.includes('## v1.0.0 candidate'));
assert.ok(releaseNotes.includes('## v1.0.0候補'));
assert.ok(releaseNotes.includes('schemaVersion: "0.1.0"'));
assert.ok(releaseNotes.includes('synthesizes'));
assert.ok(releaseNotes.includes('not yet conducted'));

console.log('documentation language policy checks passed');
