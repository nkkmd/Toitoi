# Toitoi 🌱

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE_POLICY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE_POLICY.md)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](./LICENSE_POLICY.md)

**Digital Agroecology Commons powered by protocol-independent canonical events**

**Current release line: v0.3.0 release candidate**

*[日本語は下に続きます]*

Toitoi is a decentralized protocol platform and digital commons for sharing and evolving agroecological knowledge through **inquiries** rather than universal answers.

It is based on the philosophy of [Letting Go of Technology in Agriculture](./docs/essays/Letting-Go-of-Technology-in-Agriculture.md). Local observations remain grounded in their own context, while transport-independent Canonical Events allow inquiries to be translated, compared, derived, and replayed across distributed systems.

## v0.3.0: A knowledge space where inquiries grow

v0.3.0 advances the v0.2.0 Golden Path from a readable reference implementation into the first integrated knowledge-space workflow:

```text
inquiry detail
  → lineage tree
  → context exploration
  → reviewed derived inquiry
  → Canonical Event publication
  → transport projection / re-ingest / replay
  → updated lineage tree
```

Implemented release-candidate capabilities:

- inquiry detail backed by the Standard API canonical view
- lineage tree with root / branch / leaf roles, relation types, provenance summaries, missing-reference handling, and cycle protection
- context exploration using `climate_zone`, `soil_type`, `farming_context`, and `crop_family`
- conservative identity semantics: contextual similarity never causes automatic canonical identity merging
- reviewed derived inquiry creation using the Inquiry Draft workflow
- supported derivation types: `derived_from`, `translated_from`, `annotates`, `reframes`, `revises`, and `synthesizes`
- publication guard: only an explicitly human-approved draft can become a Canonical Event
- Nostr lineage projection and deterministic re-ingest / persistence / replay validation
- Lingonberry lineage and publication metadata projection validation
- cross-feature Golden Path validation in the default workspace CI

## Architecture

Toitoi separates semantic meaning from transport representation.

```text
Edge / local observation
  → Inquiry Draft
  → human review
  → Canonical Event
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
- It records how inquiries are translated, revised, annotated, and synthesized.

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

## Documentation

### Release and current implementation

- [v0.3.0 Release Plan](./docs/roadmap/V0.3.0_RELEASE_PLAN.md)
- [v0.3.0 Release Runbook](./docs/roadmap/V0.3.0_RELEASE_RUNBOOK.md)
- [v0.3.0 GitHub Release Content](./docs/roadmap/V0.3.0_GITHUB_RELEASE.md)
- [Release Notes](./docs/roadmap/RELEASE_NOTES.md)
- [Frontend v0.3.0 User Journey](./apps/frontend/V0.3.0_USER_JOURNEY.md)

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

These endpoints are operational project infrastructure. The release-candidate tests are deterministic local checks and do not guarantee external service availability.

## Scope and limitations

v0.3.0 is an experimental reference release, not a production-grade hosted product. It does not include production authentication, authorization, rate limiting, embeddings-required semantic search, graph inference, full offline synchronization, a vocabulary-management UI, or unattended AI publication.

## Contributing and licensing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [LICENSE_POLICY.md](./LICENSE_POLICY.md).

- Relay and indexer infrastructure: GNU AGPLv3
- Frontend and edge client: MIT License
- Protocol schemas and documentation: CC BY-SA 4.0

---

# Toitoi 🌱

**プロトコル非依存のCanonical Eventを基盤とする、デジタル・アグロエコロジー・コモンズ**

**現在のリリース系列: v0.3.0 release candidate**

Toitoi（トイトイ）は、『[テクノロジーを手放す農業論](./docs/essays/Tech-wo-Tebanasu-Nogyoron.md)』の思想に基づき、普遍的な「答え」ではなく、地域固有の観察から生まれる**問い**を共有・翻訳・派生させる分散型プロトコル・プラットフォームです。

## v0.3.0で実現したこと

v0.3.0では、v0.2.0で固定した「問いの一生」のGolden Pathを、問いを発見・比較・派生できる最初の知識空間へ拡張しました。

```text
問いの詳細
  → 系統樹
  → 文脈探索
  → 人間確認を伴う派生問い
  → Canonical Eventとして公開
  → transportへの投影・再取り込み・replay
  → 更新された系統樹
```

主な機能:

- Standard APIのcanonical viewを使った問いの詳細表示
- root / branch / leaf、relation type、provenanceを扱う系統樹
- `climate_zone`、`soil_type`、`farming_context`、`crop_family`による文脈探索と比較
- 文脈上の類似とcanonical identityを混同しない保守的な同一性契約
- Inquiry Draftとhuman reviewを再利用した派生問い作成
- `derived_from`、`translated_from`、`annotates`、`reframes`、`revises`、`synthesizes`の6種類の派生関係
- `approved`以外を公開させないpublication guard
- Nostrへのlineage投影と再取り込み・永続化・replayの横断検証
- Lingonberryへのlineage／publication metadata投影検証
- default CIに組み込まれたv0.3.0横断Golden Path

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

## まず読む文書

- [v0.3.0リリース計画](./docs/roadmap/V0.3.0_RELEASE_PLAN.md)
- [v0.3.0リリース手順](./docs/roadmap/V0.3.0_RELEASE_RUNBOOK.md)
- [v0.3.0 GitHub Release本文](./docs/roadmap/V0.3.0_GITHUB_RELEASE.md)
- [リリースノート](./docs/roadmap/RELEASE_NOTES.md)
- [Frontend v0.3.0 User Journey](./apps/frontend/V0.3.0_USER_JOURNEY.md)
- [Standard API](./apps/api/README.md)
- [Frontend](./apps/frontend/README.md)
- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [Inquiry Draft](./docs/protocols/INQUIRY_DRAFT.md)

## 既知の制約

v0.3.0は実験的なreference releaseです。production-gradeの認証・認可・rate limiting、embeddings必須の意味検索、graph inference、本格的なオフライン同期、語彙管理UI、AIによる無人公開は対象外です。

## ライセンス

詳細は[LICENSE_POLICY.md](./LICENSE_POLICY.md)を参照してください。

- Relay／Indexer基盤: GNU AGPLv3
- Frontend／Edge Client: MIT License
- Protocol Schema／文書: CC BY-SA 4.0
