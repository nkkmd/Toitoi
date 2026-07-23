# Toitoi 🌱

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE_POLICY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE_POLICY.md)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](./LICENSE_POLICY.md)

**Digital Agroecology Commons powered by protocol-independent Canonical Events**

**Latest public release: v0.9.0**  
**v1.0.0 candidate implementation: PR #39**  
**Language status:** English and Japanese sections are maintained as equivalent.  
**Last synchronized:** 2026-07-23

*[日本語は下に続きます]*

Toitoi is a decentralized protocol platform and digital commons for sharing and evolving agroecological knowledge through **inquiries** rather than universal answers.

It follows the philosophy of [Letting Go of Technology in Agriculture](./docs/essays/Letting-Go-of-Technology-in-Agriculture.md). Local observations remain grounded in their own context, while transport-independent Canonical Events allow inquiries to be reviewed, compared, derived, searched, replayed, and delivered across distributed systems.

## v1.0.0 candidate

The v1.0.0 candidate connects one deterministic reference scenario from offline observation through asynchronous AI candidates, human annotation review, Inquiry Draft, independent publication approval, Canonical Event publication, transport delivery state, search, vocabulary mapping, semantic derivation, replay, backup, restore, and migration verification.

The latest public release remains v0.9.0 until PR review, merge, post-merge validation, release-owner decisions, tagging, and GitHub Release publication are complete.

## Architecture

```text
Mobile-first SPA / PWA
  -> local observation and synchronization state
  -> Standard API and actor authority
  -> asynchronous AI annotation workflow
  -> human review and independent publication approval
  -> append-only Canonical storage
  -> Nostr / Lingonberry / ATProto transport projections
  -> replay and rebuildable search projections
  -> Conformance and recovery validation
```

Canonical storage is authoritative. Search indexes, facets, metrics, health views, and related-inquiry candidates are rebuildable derived state. Transport delivery, AI output, similarity, and vocabulary mapping never merge Canonical identity automatically.

## Quick start

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
corepack pnpm install --frozen-lockfile
corepack pnpm test
```

Start the reference API:

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

Run the native v1 Conformance input:

```bash
corepack pnpm --filter @toitoi/conformance exec \
  toitoi-conformance \
  --input fixtures/reference/v1.0.0/conformance-input.json \
  --pretty
```

## Main documentation

- [Documentation Language Policy](./docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md)
- [Architecture Overview](./docs/architecture/ARCHITECTURE_OVERVIEW.md)
- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [v1 Contract Index](./docs/reference/V1_CONTRACT_INDEX.md)
- [v1.0.0 Reference Scenario](./docs/reference/V1.0.0_REFERENCE_SCENARIO.md)
- [v1.0.0 Setup and Demo](./docs/reference/V1.0.0_SETUP_AND_DEMO.md)
- [v1.0.0 Minimum Operations Runbook](./docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md)
- [Security and Sensitive Information](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
- [Release Notes](./docs/roadmap/RELEASE_NOTES.md)
- [v1.0.0 Documentation Language Migration](./docs/roadmap/V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md)
- [v1.0.0 Release Runbook](./docs/roadmap/V1.0.0_RELEASE_RUNBOOK.md)
- [v1.0.0 Release Record](./docs/roadmap/V1.0.0_RELEASE_RECORD.md)

## Scope and limitations

The v1.0.0 candidate is a minimum reference implementation, not a production-certified hosted product.

- reference authentication uses explicit headers and is not OAuth/OIDC certified;
- the durable queue is single-node JSONL;
- live model and external transport availability remain outside default deterministic CI;
- deterministic fixtures do not prove live local-model reproducibility;
- the real-participant pilot is not yet conducted;
- FTS5 is a lexical and structured baseline rather than production vector search or RAG;
- generated, derived, related, or mapped inquiries are not guaranteed to be agriculturally correct.

## Contributing and licensing

See [CONTRIBUTING.md](./CONTRIBUTING.md), [SECURITY.md](./SECURITY.md), and [LICENSE_POLICY.md](./LICENSE_POLICY.md).

- Relay and indexer infrastructure: GNU AGPLv3
- Frontend and edge client: MIT License
- Protocol schemas and documentation: CC BY-SA 4.0

---

# Toitoi 🌱

**protocol-independentなCanonical Eventを基盤とする、デジタル・アグロエコロジー・コモンズ**

**最新の公開リリース: v0.9.0**  
**v1.0.0候補実装: PR #39**  
**言語状態:** 英語版と日本語版は同等の内容として管理します。  
**最終同期日:** 2026-07-23

Toitoiは、『[テクノロジーを手放す農業論](./docs/essays/Tech-wo-Tebanasu-Nogyoron.md)』の思想に基づき、普遍的な「答え」ではなく、地域固有の観察から生まれる**問い**を共有・検討・派生・探索する分散型protocol platform／digital commonsです。

## v1.0.0候補

v1.0.0候補では、一つの決定的なreference scenarioを通して、offline observation、非同期AI候補、人間によるannotation review、Inquiry Draft、独立したpublication approval、Canonical Event公開、transport delivery state、search、Vocabulary mapping、semantic derivation、replay、backup、restore、migration verificationを接続しています。

PR review、merge、merge後validation、release-owner判断、tag、GitHub Release公開が完了するまでは、最新の公開releaseはv0.9.0です。

## アーキテクチャ

```text
Mobile-first SPA / PWA
  -> local observation and synchronization state
  -> Standard API and actor authority
  -> asynchronous AI annotation workflow
  -> human review and independent publication approval
  -> append-only Canonical storage
  -> Nostr / Lingonberry / ATProto transport projections
  -> replay and rebuildable search projections
  -> Conformance and recovery validation
```

Canonical storageが正本です。search index、facet、metrics、health view、related-inquiry candidateは再構築可能なderived stateです。transport delivery、AI output、similarity、Vocabulary mappingはCanonical identityを自動統合しません。

## クイックスタート

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
corepack pnpm install --frozen-lockfile
corepack pnpm test
```

reference APIを起動します。

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

native v1 Conformance inputを実行します。

```bash
corepack pnpm --filter @toitoi/conformance exec \
  toitoi-conformance \
  --input fixtures/reference/v1.0.0/conformance-input.json \
  --pretty
```

## 主要文書

- [文書言語ポリシー](./docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md)
- [アーキテクチャ概要](./docs/architecture/ARCHITECTURE_OVERVIEW.md)
- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [v1 Contract Index](./docs/reference/V1_CONTRACT_INDEX.md)
- [v1.0.0 Reference Scenario](./docs/reference/V1.0.0_REFERENCE_SCENARIO.md)
- [v1.0.0 Setup and Demo](./docs/reference/V1.0.0_SETUP_AND_DEMO.md)
- [v1.0.0 最小運用Runbook](./docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md)
- [セキュリティと機微情報](./SECURITY.md)
- [貢献ガイド](./CONTRIBUTING.md)
- [Release Notes](./docs/roadmap/RELEASE_NOTES.md)
- [v1.0.0文書言語移行台帳](./docs/roadmap/V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md)
- [v1.0.0 Release Runbook](./docs/roadmap/V1.0.0_RELEASE_RUNBOOK.md)
- [v1.0.0 Release Record](./docs/roadmap/V1.0.0_RELEASE_RECORD.md)

## 対象範囲と制約

v1.0.0候補はminimum reference implementationであり、production認定されたhosted productではありません。

- reference authenticationは明示的headerを使い、OAuth/OIDC認定ではありません。
- durable queueはsingle-node JSONLです。
- live modelとexternal transport availabilityはdefault deterministic CIの対象外です。
- deterministic fixtureはlive local-model reproducibilityを証明しません。
- 実参加者pilotはまだ実施されていません。
- FTS5はlexical／structured baselineであり、production vector searchやRAGではありません。
- generated、derived、related、mapped inquiryの農業上の正しさは保証しません。

## 貢献とライセンス

[CONTRIBUTING.md](./CONTRIBUTING.md)、[SECURITY.md](./SECURITY.md)、[LICENSE_POLICY.md](./LICENSE_POLICY.md)を参照してください。

- Relay／indexer infrastructure: GNU AGPLv3
- Frontend／edge client: MIT License
- Protocol schema／documentation: CC BY-SA 4.0
