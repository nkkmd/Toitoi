# Toitoi 🌱

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE_POLICY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE_POLICY.md)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](./LICENSE_POLICY.md)

**Digital Agroecology Commons powered by protocol-independent canonical events**

**Current release line: v0.5.0**

*[日本語は下に続きます]*

Toitoi is a decentralized protocol platform and digital commons for sharing and evolving agroecological knowledge through **inquiries** rather than universal answers.

It is based on the philosophy of [Letting Go of Technology in Agriculture](./docs/essays/Letting-Go-of-Technology-in-Agriculture.md). Local observations remain grounded in their own context, while transport-independent Canonical Events allow inquiries to be translated, compared, derived, and replayed across distributed systems.

## v0.5.0: Practical human-reviewed inquiry generation

v0.5.0 extends the asynchronous AI annotation foundation introduced in v0.4.0 into practical, auditable inquiry generation.

```text
stored observation
  → asynchronous generate_inquiries job
  → multiple validated inquiry candidates
  → explicit human accept / edit / reject
  → selected candidate promoted to an Inquiry Draft
  → independent publication review
  → approved Canonical Event publication
```

Implemented capabilities:

- versioned `generate_inquiries` annotation contract for multiple candidates
- structured retention of `inquiry`, `context`, `observation`, `relationship`, `uncertainty`, `tags`, and `source_refs`
- llama.cpp OpenAI-compatible production inference provider
- provider-neutral worker boundary with deterministic, network-free CI provider
- provenance for model, model version, prompt version, raw output, source event, and generation time
- malformed JSON and malformed candidate rejection before annotation persistence
- append-only human review operations for accept, edit, and reject
- Standard API mutation routes for annotation review
- accepted or human-edited candidate promotion into the existing Inquiry Draft workflow
- preserved source lineage and AI annotation provenance
- deterministic v0.5.0 Golden Path in default workspace CI
- low-resource reference profile for 4GB-class systems

AI output never modifies Canonical Events or published inquiries directly. Annotation review only permits draft creation; publication still requires the independent `draft → in_review → approved` workflow.

## Architecture

Toitoi separates semantic meaning from transport representation and keeps AI outside the canonical publication path.

```text
Edge / local observation
  → Canonical Event storage
  → asynchronous AI job queue
  → inquiry-generation annotation
  → human annotation review
  → Inquiry Draft with lineage
  → human publication review
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
- It keeps human judgment at both annotation and publication boundaries.
- It records how inquiries are generated, summarized, tagged, translated, revised, annotated, and synthesized.

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

Enable AI inspection and review storage:

```bash
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_STORAGE_DIR=/path/to/storage \
corepack pnpm start:api
```

Select a single transport with `TOITOI_PROTOCOL=nostr`, `atproto`, or `lingonberry`.

A llama.cpp-compatible provider can be connected for local inference. Default CI remains deterministic and does not require a running model service.

## AI review API

When the review service is configured, the following mutation routes are available:

- `POST /api/v1/ai/annotations/:id/accept`
- `POST /api/v1/ai/annotations/:id/edit`
- `POST /api/v1/ai/annotations/:id/reject`

These operations update append-only annotation history. They do not approve publication.

## Documentation

### Release and current implementation

- [Roadmap to v1.0.0](./docs/roadmap/V1.0.0_ROADMAP.md)
- [v0.5.0 Release Plan](./docs/roadmap/V0.5.0_RELEASE_PLAN.md)
- [v0.5.0 Release Runbook](./docs/roadmap/V0.5.0_RELEASE_RUNBOOK.md)
- [v0.5.0 GitHub Release Content](./docs/roadmap/V0.5.0_GITHUB_RELEASE.md)
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

v0.5.0 is an experimental reference release, not a production-grade hosted product. Live llama.cpp validation is opt-in. Distributed queues, production authentication / authorization / rate limiting, a complete SPA / PWA, offline synchronization, embeddings, vector databases, RAG, semantic identity merging, and unattended AI publication remain outside this release. Generated inquiries are not guaranteed to be agriculturally correct.

## Contributing and licensing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [LICENSE_POLICY.md](./LICENSE_POLICY.md).

- Relay and indexer infrastructure: GNU AGPLv3
- Frontend and edge client: MIT License
- Protocol schemas and documentation: CC BY-SA 4.0

---

# Toitoi 🌱

**プロトコル非依存のCanonical Eventを基盤とする、デジタル・アグロエコロジー・コモンズ**

**現在のリリース系列: v0.5.0**

Toitoi（トイトイ）は、『[テクノロジーを手放す農業論](./docs/essays/Tech-wo-Tebanasu-Nogyoron.md)』の思想に基づき、普遍的な「答え」ではなく、地域固有の観察から生まれる**問い**を共有・翻訳・派生させる分散型プロトコル・プラットフォームです。

## v0.5.0で実現したこと

v0.5.0では、v0.4.0の非同期AI annotation基盤を、実用的かつ監査可能な問い生成へ拡張しました。

```text
保存済みの観察
  → 非同期generate_inquiries job
  → 複数の検証済み問い候補
  → 人間によるaccept / edit / reject
  → 選択候補をlineage付きInquiry Draftへ昇格
  → 独立したpublication review
  → 承認済みCanonical Eventとして公開
```

主な機能:

- 複数候補を扱うversioned `generate_inquiries` annotation contract
- `inquiry`、`context`、`observation`、`relationship`、`uncertainty`、`tags`、`source_refs`の保持
- llama.cppのOpenAI互換APIへ接続するproduction inference provider
- provider-neutral workerとネットワーク不要のdeterministic CI provider
- model、model version、prompt version、raw output、source event、generation timeのprovenance
- 不正JSONや不正候補schemaのannotation保存前拒否
- append-onlyなaccept／edit／reject review操作
- Standard APIのannotation review mutation routes
- acceptedまたは人間がeditedした候補からInquiry Draftへの昇格
- source lineageとAI annotation provenanceの維持
- default CIで再現するv0.5.0 Golden Path
- RAM 4GB級環境向けの低資源運用プロファイル

AI出力はCanonical Eventや公開済みinquiryを直接変更しません。annotationのacceptanceはdraft作成を許可するだけで、公開には独立した`draft → in_review → approved` workflowが必須です。

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

AI inspection／review storageを有効化:

```bash
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_STORAGE_DIR=/path/to/storage \
corepack pnpm start:api
```

単一transportは`TOITOI_PROTOCOL=nostr`、`atproto`、`lingonberry`から選択できます。

## AI review API

review serviceが設定されている場合、次のmutation routeを利用できます。

- `POST /api/v1/ai/annotations/:id/accept`
- `POST /api/v1/ai/annotations/:id/edit`
- `POST /api/v1/ai/annotations/:id/reject`

これらはappend-only annotation historyを更新しますが、publication approvalではありません。

## まず読む文書

- [v1.0.0までのロードマップ](./docs/roadmap/V1.0.0_ROADMAP.md)
- [v0.5.0リリース計画](./docs/roadmap/V0.5.0_RELEASE_PLAN.md)
- [v0.5.0リリース手順](./docs/roadmap/V0.5.0_RELEASE_RUNBOOK.md)
- [v0.5.0 GitHub Release本文](./docs/roadmap/V0.5.0_GITHUB_RELEASE.md)
- [リリースノート](./docs/roadmap/RELEASE_NOTES.md)
- [AI導入ロードマップ](./docs/roadmap/AI_ADOPTION_ROADMAP.md)
- [基盤実装状況](./docs/roadmap/FOUNDATION_IMPLEMENTATION_STATUS.md)
- [Standard API](./apps/api/README.md)
- [Frontend](./apps/frontend/README.md)
- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [Inquiry Draft](./docs/protocols/INQUIRY_DRAFT.md)

## 既知の制約

v0.5.0は実験的なreference releaseです。live llama.cpp検証はopt-inです。production-gradeのdistributed queue、認証・認可・rate limiting、完成したSPA／PWA、本格的なoffline synchronization、embeddings、vector database、RAG、semantic identity merge、AIによる無人公開は対象外です。生成された問いの農業上の妥当性は保証しません。

## ライセンス

詳細は[LICENSE_POLICY.md](./LICENSE_POLICY.md)を参照してください。

- Relay／Indexer基盤: GNU AGPLv3
- Frontend／Edge Client: MIT License
- Protocol Schema／文書: CC BY-SA 4.0
