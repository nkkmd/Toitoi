# Toitoi 🌱

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE_POLICY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE_POLICY.md)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](./LICENSE_POLICY.md)

**Digital Agroecology Commons powered by protocol-independent canonical events**

**Current release line: v0.4.0**

*[日本語は下に続きます]*

Toitoi is a decentralized protocol platform and digital commons for sharing and evolving agroecological knowledge through **inquiries** rather than universal answers.

It is based on the philosophy of [Letting Go of Technology in Agriculture](./docs/essays/Letting-Go-of-Technology-in-Agriculture.md). Local observations remain grounded in their own context, while transport-independent Canonical Events allow inquiries to be translated, compared, derived, and replayed across distributed systems.

## v0.4.0: Human-reviewed AI annotation foundation

v0.4.0 places an asynchronous AI assistance layer in front of the human-reviewed inquiry workflow established in v0.3.0.

```text
stored observation / inquiry
  → asynchronous AI job
  → auditable summary / tag annotation
  → human acceptance
  → derived Inquiry Draft with lineage
  → human review
  → approved Canonical Event publication
```

Implemented capabilities:

- duplicate-aware AI job queue with bounded retries
- versioned summary / tag annotation contract
- model, prompt version, raw output, source event, and review-state provenance
- append-only JSONL persistence for jobs and annotations
- restart recovery with interrupted jobs explicitly requeued
- provider-neutral worker boundary with deterministic offline CI provider
- read-only AI inspection routes in the Standard API
- accepted-annotation promotion into the existing derived Inquiry Draft workflow
- preserved `derived_from` lineage and publication provenance
- frontend review cards that distinguish AI assistance from published inquiries
- deterministic v0.4.0 Golden Path in the default workspace CI

AI output never modifies Canonical Events or published inquiries directly. Workers create `unreviewed` annotations. Human acceptance only allows an annotation to support draft creation; the existing `draft → in_review → approved` publication guard remains mandatory.

## Architecture

Toitoi separates semantic meaning from transport representation and keeps AI outside the canonical publication path.

```text
Edge / local observation
  → Canonical Event storage
  → asynchronous AI annotation layer
  → human-reviewed Inquiry Draft
  → Canonical Event publication
  → protocol converter
  → Nostr / Lingonberry / ATProto transport
  → raw + canonical storage
  → replay / derived index
  → Standard API
  → frontend view models
```

The current primary transports are Nostr and Lingonberry. ATProto remains a secondary implementation for multi-protocol compatibility and future federation work.

## Project philosophy

Toitoi treats AI as a **librarian** or **mycelium**, not as an authority that issues universal agricultural prescriptions.

- It connects inquiries and contexts.
- It helps surface relationships without erasing locality.
- It keeps human judgment at the publication boundary.
- It records how inquiries are summarized, tagged, translated, revised, annotated, and synthesized.

## Quick start

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
corepack pnpm install
corepack pnpm test
```

Start the Standard API:

```bash
TOITOI_STORAGE_DIR=/path/to/storage corepack pnpm start:api
```

Enable read-only AI inspection:

```bash
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_STORAGE_DIR=/path/to/storage \
corepack pnpm start:api
```

Select a single transport with `TOITOI_PROTOCOL=nostr`, `atproto`, or `lingonberry`.

## Documentation

### Release and current implementation

- [Roadmap to v1.0.0](./docs/roadmap/V1.0.0_ROADMAP.md)
- [v0.4.0 Release Plan](./docs/roadmap/V0.4.0_RELEASE_PLAN.md)
- [v0.4.0 Release Runbook](./docs/roadmap/V0.4.0_RELEASE_RUNBOOK.md)
- [v0.4.0 GitHub Release Content](./docs/roadmap/V0.4.0_GITHUB_RELEASE.md)
- [Release Notes](./docs/roadmap/RELEASE_NOTES.md)
- [AI Adoption Roadmap](./docs/roadmap/AI_ADOPTION_ROADMAP.md)
- [Foundation Implementation Status](./docs/roadmap/FOUNDATION_IMPLEMENTATION_STATUS.md)

### Core contracts

- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [Inquiry Draft](./docs/protocols/INQUIRY_DRAFT.md)
- [Canonical Identity and Provenance](./docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md)
- [Provenance](./docs/concepts/PROVENANCE.md)
- [Glossary](./docs/concepts/GLOSSARY.md)
- [Transport Positioning](./docs/architecture/TRANSPORT_POSITIONING.md)
- [Directory Boundaries](./docs/architecture/DIRECTORY_BOUNDARIES.md)

### Implementation entry points

- [Standard API](./apps/api/README.md)
- [Frontend](./apps/frontend/README.md)
- [Edge AI](./apps/edge-ai/README.md)
- [Nostr Transport](./docs/protocols/NOSTR_TRANSPORT.md)
- [Lingonberry Transport](./docs/protocols/LINGONBERRY_TRANSPORT.md)
- [pnpm Workspace Guide](./docs/operations/PNPM_WORKSPACE_GUIDE.md)

## Live endpoints

- Relay: `wss://relay.toitoi.cultivationdata.net`
- API: `https://api.toitoi.cultivationdata.net`

These endpoints are operational project infrastructure. Deterministic release tests do not guarantee external service availability.

## Scope and limitations

v0.4.0 is an experimental reference release, not a production-grade hosted product. The deterministic provider is for contract validation rather than production inference. Distributed queues, production authentication / authorization / rate limiting, AI review mutation APIs, a complete SPA, embeddings, vector databases, RAG, semantic identity merging, and unattended AI publication are outside this release.

## Contributing and licensing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [LICENSE_POLICY.md](./LICENSE_POLICY.md).

- Relay and indexer infrastructure: GNU AGPLv3
- Frontend and edge client: MIT License
- Protocol schemas and documentation: CC BY-SA 4.0

---

# Toitoi 🌱

**プロトコル非依存のCanonical Eventを基盤とする、デジタル・アグロエコロジー・コモンズ**

**現在のリリース系列: v0.4.0**

Toitoi（トイトイ）は、『[テクノロジーを手放す農業論](./docs/essays/Tech-wo-Tebanasu-Nogyoron.md)』の思想に基づき、普遍的な「答え」ではなく、地域固有の観察から生まれる**問い**を共有・翻訳・派生させる分散型プロトコル・プラットフォームです。

## v0.4.0で実現したこと

v0.4.0では、v0.3.0で確立した人間確認付きの派生問いworkflowの手前に、非同期AI補助層を接続しました。

```text
保存済みの観察／問い
  → 非同期AI job
  → 監査可能な要約／タグannotation
  → 人間によるacceptance
  → lineageを持つ派生Inquiry Draft
  → human review
  → 承認済みCanonical Eventとして公開
```

主な機能:

- 重複抑止とbounded retryを備えたAI job queue
- summary／tag用のversioned annotation contract
- model、prompt version、raw output、source event、review stateを保持するprovenance
- append-only JSONLによるjob／annotation永続化
- 再起動時の復元と中断jobの明示的な再キュー化
- provider-neutral workerとCI用deterministic provider
- Standard APIのread-only AI inspection routes
- accepted annotationから既存のderived Inquiry Draft workflowへの昇格
- `derived_from` lineageとpublication provenanceの維持
- AI補助を公開済みinquiryと区別するfrontend review表示
- default CIで再現するv0.4.0 Golden Path

AI出力はCanonical Eventや公開済みinquiryを直接変更しません。workerは`unreviewed` annotationを生成し、人間によるacceptanceはdraft作成の補助入力としての利用を許可するだけです。公開には従来どおり`draft → in_review → approved`が必須です。

## Toitoiは「司書」もしくは「菌糸」である

ToitoiはAIを、普遍的な正解を与える権威として扱いません。AIは文脈と問いを接続する司書、分散した観察を結びつける菌糸として働きます。問いの採用・修正・公開は、人間の確認を経て行われます。

## セットアップ

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
corepack pnpm install
corepack pnpm test
```

Standard APIの起動:

```bash
TOITOI_STORAGE_DIR=/path/to/storage corepack pnpm start:api
```

AI inspectionを有効化:

```bash
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_STORAGE_DIR=/path/to/storage \
corepack pnpm start:api
```

単一transportは`TOITOI_PROTOCOL=nostr`、`atproto`、`lingonberry`から選択できます。

## まず読む文書

- [v1.0.0までのロードマップ](./docs/roadmap/V1.0.0_ROADMAP.md)
- [v0.4.0リリース計画](./docs/roadmap/V0.4.0_RELEASE_PLAN.md)
- [v0.4.0リリース手順](./docs/roadmap/V0.4.0_RELEASE_RUNBOOK.md)
- [v0.4.0 GitHub Release本文](./docs/roadmap/V0.4.0_GITHUB_RELEASE.md)
- [リリースノート](./docs/roadmap/RELEASE_NOTES.md)
- [AI導入ロードマップ](./docs/roadmap/AI_ADOPTION_ROADMAP.md)
- [Standard API](./apps/api/README.md)
- [Frontend](./apps/frontend/README.md)
- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [Inquiry Draft](./docs/protocols/INQUIRY_DRAFT.md)

## 既知の制約

v0.4.0は実験的なreference releaseです。deterministic providerはproduction inference用ではありません。production-gradeのdistributed queue、認証・認可・rate limiting、AI review mutation API、完成したSPA、embeddings、vector database、RAG、semantic identity merge、AIによる無人公開は対象外です。

## ライセンス

詳細は[LICENSE_POLICY.md](./LICENSE_POLICY.md)を参照してください。

- Relay／Indexer基盤: GNU AGPLv3
- Frontend／Edge Client: MIT License
- Protocol Schema／文書: CC BY-SA 4.0
