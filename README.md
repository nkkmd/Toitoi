# Toitoi 🌱

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE_POLICY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE_POLICY.md)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](./LICENSE_POLICY.md)

**Digital Agroecology Commons powered by protocol-independent Canonical Events**

**Current implementation baseline: v0.9.0**

*[日本語は下に続きます]*

Toitoi is a decentralized protocol platform and digital commons for sharing and evolving agroecological knowledge through **inquiries** rather than universal answers.

It follows the philosophy of [Letting Go of Technology in Agriculture](./docs/essays/Letting-Go-of-Technology-in-Agriculture.md). Local observations remain grounded in their own context, while transport-independent Canonical Events allow inquiries to be reviewed, compared, derived, searched, replayed, and delivered across distributed systems.

## v0.9.0: Collaborative operation, durability, and conformance

v0.9.0 moves Toitoi from a single-developer reference environment toward small-group operation with explicit authority boundaries, durable recovery procedures, stable API behavior, externally runnable compatibility checks, and documented governance.

```text
actor identity and role separation
  → authenticated operational HTTP boundary
  → stable errors / request IDs / rate limits / idempotency
  → append-only audit records
  → durable queue / retry / dead-letter / graceful shutdown
  → backup verification / restore checks / migrations
  → external Conformance Suite
  → governance and information-protection procedures
```

Implemented capabilities:

- actor roles: `reader`, `contributor`, `reviewer`, `publisher`, `moderator`, and `operator`
- separation of authentication identity, actor identity, transport identity, and Canonical Event identity
- authenticated server mode through `TOITOI_AUTH_REQUIRED=true`
- stable JSON error envelopes and request IDs
- mutation idempotency and explicit idempotency conflicts
- deterministic fixed-window rate limiting
- append-only hash-chained audit records
- `GET /health/live`, `GET /health/ready`, and operator-only audit inspection
- durable JSONL queue with restart recovery, bounded retry, dead-letter handling, and graceful shutdown
- backup manifests with relative paths, sizes, and SHA-256 verification
- restore corruption detection and migration plan/dry-run/apply tooling
- externally runnable `toitoi-conformance` CLI
- Canonical validation, ID preservation, provenance/rawRef separation, transport semantic round trips, and replay equivalence
- fixed Nostr, Lingonberry, and ATProto conformance fixtures
- TIP, schema compatibility, vocabulary change, moderation, withdrawal, correction, deletion-request, and sensitive-information policies

Canonical storage remains the source of truth. Search indexes, queue indexes, metrics, and health views remain rebuildable derived state. Authentication, review, publication, moderation, and operator authority remain separate decisions.

## Architecture

```text
Mobile-first SPA / PWA
  → local IndexedDB observation and synchronization state
  → Standard API workflow mutations
  → operational HTTP boundary and actor authority
  → asynchronous AI job / annotation layer
  → human annotation review
  → Inquiry Draft and semantic derivation
  → independent human publication review
  → Canonical Event publication
  → append-only canonical storage
  → multi-transport outbound runtime
  → Nostr / Lingonberry / ATProto
  → replay / canonical read index
  → rebuildable FTS5 search projection
  → search / context / vocabulary / related-inquiry API
  → Conformance Suite and recovery validation
```

The SPA consumes transport-independent Standard API contracts and does not depend on protocol-specific event shapes.

## Project philosophy

Toitoi treats AI as a **librarian** or **mycelium**, not as an authority that issues universal agricultural prescriptions.

- It connects inquiries and contexts without erasing locality.
- It keeps human judgment at annotation, relation-confirmation, vocabulary-mapping, publication, and moderation boundaries.
- It records provenance, lineage, uncertainty, AI involvement, review decisions, actor decisions, and delivery state.
- It does not equate generated, derived, related, or mapped content with agricultural correctness or canonical identity.

## Quick start

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
corepack pnpm install
corepack pnpm test
```

Start the integrated runtime in development-compatible mode:

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

Enable the v0.9.0 authenticated operational boundary:

```bash
TOITOI_AUTH_REQUIRED=true \
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
corepack pnpm --filter @toitoi/api start
```

Authenticated requests use the reference headers `X-Toitoi-Actor-Id`, `X-Toitoi-Roles`, and, for mutations, `Idempotency-Key`. This deterministic header provider is a reference boundary, not OAuth/OIDC certification.

Run the Conformance Suite:

```bash
corepack pnpm --filter @toitoi/conformance exec \
  toitoi-conformance --input fixtures/conformance/v0.9.0-transport-round-trips.json --pretty
```

## Main API and operational surfaces

Read, search, and reuse:

- `GET /api/v1/inquiries`
- `GET /api/v1/inquiries/:id`
- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- `GET /api/v1/vocabulary/terms`
- `GET /api/v1/vocabulary/mappings`

Workflow:

- `POST /api/v1/observations`
- `POST /api/v1/ai/annotations/:id/promote`
- `POST /api/v1/inquiries/:id/derive`
- `POST /api/v1/inquiry-drafts/:id/submit`
- `POST /api/v1/inquiry-drafts/:id/approve`
- `POST /api/v1/inquiry-drafts/:id/reject`
- `POST /api/v1/inquiry-drafts/:id/publish`

Operations:

- `GET /health/live`
- `GET /health/ready`
- `GET /api/v1/audit` — operator authority required

## Documentation

### Release and current implementation

- [Roadmap to v1.0.0](./docs/roadmap/V1.0.0_ROADMAP.md)
- [v0.9.0 Release Plan](./docs/roadmap/V0.9.0_RELEASE_PLAN.md)
- [v0.9.0 Release Runbook](./docs/roadmap/V0.9.0_RELEASE_RUNBOOK.md)
- [v0.9.0 GitHub Release Content](./docs/roadmap/V0.9.0_GITHUB_RELEASE.md)
- [v0.9.0 Implementation Release Record](./docs/roadmap/V0.9.0_RELEASE_RECORD.md)
- [Release Notes](./docs/roadmap/RELEASE_NOTES.md)
- [Foundation Implementation Status](./docs/roadmap/FOUNDATION_IMPLEMENTATION_STATUS.md)

### Core contracts and operations

- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [Inquiry Draft](./docs/protocols/INQUIRY_DRAFT.md)
- [Canonical Identity and Provenance](./docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md)
- [Standard API](./apps/api/README.md)
- [Frontend SPA/PWA](./apps/frontend/README.md)
- [Single-node durability](./docs/operations/V0.9.0_SINGLE_NODE_DURABILITY.md)
- [Governance](./docs/governance/TOITOI_GOVERNANCE.md)
- [Transport Positioning](./docs/architecture/TRANSPORT_POSITIONING.md)

## Live endpoints

- Relay: `wss://relay.toitoi.cultivationdata.net`
- API: `https://api.toitoi.cultivationdata.net`

Hosted infrastructure may lag behind the repository release and is not covered by deterministic CI availability guarantees.

## Scope and limitations

v0.9.0 is an experimental small-group reference implementation, not a production-certified hosted product.

- the reference authentication provider uses explicit headers; OAuth/OIDC integration is not certified
- the durable queue is single-node JSONL, not a distributed queue
- rate limiting and idempotency stores are reference-process components unless replaced by deployment-specific durable adapters
- live model and external transport availability checks remain opt-in
- FTS5 is a lexical and structured baseline; embeddings, vector databases, production RAG, and graph inference remain out of scope
- automatic semantic identity merging is prohibited
- vocabulary mappings remain explicit claims and do not silently normalize local terms
- generated, derived, related, or mapped inquiries are not guaranteed to be agriculturally correct

## Contributing and licensing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [LICENSE_POLICY.md](./LICENSE_POLICY.md).

- Relay and indexer infrastructure: GNU AGPLv3
- Frontend and edge client: MIT License
- Protocol schemas and documentation: CC BY-SA 4.0

---

# Toitoi 🌱

**プロトコル非依存のCanonical Eventを基盤とする、デジタル・アグロエコロジー・コモンズ**

**現在の実装基準点: v0.9.0**

Toitoi（トイトイ）は、『[テクノロジーを手放す農業論](./docs/essays/Tech-wo-Tebanasu-Nogyoron.md)』の思想に基づき、普遍的な「答え」ではなく、地域固有の観察から生まれる**問い**を共有・検討・派生・探索する分散型プロトコル・プラットフォームです。

## v0.9.0で実現したこと

v0.9.0では、単独開発向けの参照環境を、小規模な共同利用、障害復旧、外部互換性検証、運営手続きへ拡張しました。

主な機能:

- 利用者ロールと権限の明示的分離
- actor identity、transport identity、Canonical Event identityの分離
- `TOITOI_AUTH_REQUIRED=true`による認証強制モード
- 安定JSONエラー、request ID、rate limit、mutation idempotency
- hash chain付きappend-only audit log
- liveness／readiness／operator audit endpoint
- restart recovery、bounded retry、dead-letter、graceful shutdownを備えたJSONL耐久queue
- SHA-256付きbackup manifest、restore検証、corruption検出
- migrationのplan／dry-run／target version／apply
- 外部実行可能な`toitoi-conformance` CLI
- Nostr／Lingonberry／ATProtoのsemantic round-trip fixture
- TIP、schema互換性、Vocabulary変更、moderation、訂正・撤回・削除要求、秘密情報保護の方針

Canonical storageが正本です。検索index、queue index、metrics、health projectionは再構築可能な派生状態です。annotation review、relation confirmation、publication approval、moderation、operator authorityは別の判断として扱います。

## セットアップ

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
corepack pnpm install
corepack pnpm test
```

共同運用向け認証境界を有効化する場合:

```bash
TOITOI_AUTH_REQUIRED=true \
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

参照認証では`X-Toitoi-Actor-Id`、`X-Toitoi-Roles`、mutationでは`Idempotency-Key`を使用します。これは決定的な参照実装であり、OAuth／OIDC認定実装ではありません。

Conformance Suite:

```bash
corepack pnpm --filter @toitoi/conformance exec \
  toitoi-conformance --input fixtures/conformance/v0.9.0-transport-round-trips.json --pretty
```

## まず読む文書

- [v1.0.0までのロードマップ](./docs/roadmap/V1.0.0_ROADMAP.md)
- [v0.9.0リリース計画](./docs/roadmap/V0.9.0_RELEASE_PLAN.md)
- [v0.9.0リリース手順](./docs/roadmap/V0.9.0_RELEASE_RUNBOOK.md)
- [v0.9.0 GitHub Release本文](./docs/roadmap/V0.9.0_GITHUB_RELEASE.md)
- [v0.9.0実装記録](./docs/roadmap/V0.9.0_RELEASE_RECORD.md)
- [リリースノート](./docs/roadmap/RELEASE_NOTES.md)
- [Standard API](./apps/api/README.md)
- [単一ノード耐久運用](./docs/operations/V0.9.0_SINGLE_NODE_DURABILITY.md)
- [ガバナンス](./docs/governance/TOITOI_GOVERNANCE.md)

## 既知の制約

v0.9.0は小規模共同利用を想定した実験的reference implementationです。認証providerはheader basedであり、OAuth／OIDC統合は未認定です。queueはsingle-node JSONLで、distributed queueではありません。FTS5はlexical／structured baselineであり、embedding、vector database、production RAG、graph inferenceは対象外です。automatic identity mergeとAIによる無人公開は行いません。

## ライセンス

詳細は[LICENSE_POLICY.md](./LICENSE_POLICY.md)を参照してください。
