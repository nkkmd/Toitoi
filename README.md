# Toitoi 🌱

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE_POLICY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE_POLICY.md)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](./LICENSE_POLICY.md)

**Digital Agroecology Commons powered by protocol-independent Canonical Events**

**Current release line: v0.7.0**

*[日本語は下に続きます]*

Toitoi is a decentralized protocol platform and digital commons for sharing and evolving agroecological knowledge through **inquiries** rather than universal answers.

It is based on the philosophy of [Letting Go of Technology in Agriculture](./docs/essays/Letting-Go-of-Technology-in-Agriculture.md). Local observations remain grounded in their own context, while transport-independent Canonical Events allow inquiries to be reviewed, compared, derived, replayed, and delivered across distributed systems.

## v0.7.0: Inquiry derivation and genealogy

v0.7.0 turns lineage from a read-only view into a first-class, human-reviewed authoring workflow.

```text
published inquiry
  → choose a semantic relation
  → complete relation-specific fields
  → explicitly confirm the relation
  → create a derived Inquiry Draft
  → independent human publication review
  → publish a distinct Canonical Event
  → inspect lineage, context, provenance, AI involvement, and review
  → project to transport, re-ingest, and replay
  → recover equivalent lineage semantics
```

Implemented capabilities:

- eight first-class relations: `derived_from`, `translated_from`, `observed_alongside`, `contrasts_with`, `synthesizes`, `reframes`, `annotates`, and `revises`
- relation-specific authoring guidance and deterministic validation
- `POST /api/v1/inquiries/:id/derive`
- mobile-first derivation authoring in the SPA/PWA
- explicit separation between AI-suggested and human-confirmed relation state
- multiple source inquiry IDs for synthesis
- continued `draft → in_review → approved / rejected` publication review
- integrated lineage, context, identity, provenance, AI, and human-review presentation
- transport projection, re-ingest, and storage replay fixture
- deterministic v0.7.0 validation in default CI

Canonical identity, semantic relation, and context similarity are separate concepts. Similarity and relation edges never cause automatic identity merge. AI may suggest a relation, but a human must explicitly confirm it, and publication still requires independent approval.

## Architecture

```text
Mobile-first SPA / PWA
  → local IndexedDB observation and synchronization state
  → Standard API workflow mutations
  → asynchronous AI job / annotation layer
  → human annotation review
  → existing inquiry semantic derivation
  → Inquiry Draft with lineage
  → independent human publication review
  → Canonical Event publication
  → append-only canonical storage
  → multi-transport outbound runtime
  → Nostr / Lingonberry / ATProto
  → replay / derived index
  → Standard API canonical views
```

The SPA consumes transport-independent Standard API contracts and does not depend on Nostr, Lingonberry, or ATProto event shapes.

## Project philosophy

Toitoi treats AI as a **librarian** or **mycelium**, not as an authority that issues universal agricultural prescriptions.

- It connects inquiries and contexts without erasing locality.
- It keeps human judgment at annotation, relation-confirmation, and publication boundaries.
- It records provenance, lineage, uncertainty, AI involvement, and review decisions.
- It does not equate generated or derived content with agricultural correctness.

## Quick start

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
corepack pnpm install
corepack pnpm test
```

Start the integrated Standard API and workflow runtime:

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

`TOITOI_STORAGE_DIR` enables workflow mutations and canonical publication. `TOITOI_AI_STORAGE_DIR` enables AI job and annotation inspection/review. `TOITOI_PROTOCOL` may be `nostr`, `lingonberry`, or `atproto`.

Serve `apps/frontend/` from the same origin or configure an equivalent reverse proxy so that the SPA can call `/api/v1/*`.

## Workflow API

Observation, derivation, and publication workflow:

- `POST /api/v1/observations`
- `POST /api/v1/ai/annotations/:id/promote`
- `POST /api/v1/inquiries/:id/derive`
- `GET /api/v1/inquiry-drafts/:id`
- `POST /api/v1/inquiry-drafts/:id/submit`
- `POST /api/v1/inquiry-drafts/:id/approve`
- `POST /api/v1/inquiry-drafts/:id/reject`
- `POST /api/v1/inquiry-drafts/:id/publish`
- `GET /api/v1/publications/:id`

AI annotation review:

- `POST /api/v1/ai/annotations/:id/accept`
- `POST /api/v1/ai/annotations/:id/edit`
- `POST /api/v1/ai/annotations/:id/reject`

These are reference contracts and do not yet include production authentication or authorization.

## Documentation

### Release and current implementation

- [Roadmap to v1.0.0](./docs/roadmap/V1.0.0_ROADMAP.md)
- [v0.7.0 Release Plan](./docs/roadmap/V0.7.0_RELEASE_PLAN.md)
- [v0.7.0 Release Runbook](./docs/roadmap/V0.7.0_RELEASE_RUNBOOK.md)
- [v0.7.0 GitHub Release Content](./docs/roadmap/V0.7.0_GITHUB_RELEASE.md)
- [Release Notes](./docs/roadmap/RELEASE_NOTES.md)
- [AI Adoption Roadmap](./docs/roadmap/AI_ADOPTION_ROADMAP.md)
- [Foundation Implementation Status](./docs/roadmap/FOUNDATION_IMPLEMENTATION_STATUS.md)

### Core contracts and entry points

- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [Inquiry Draft](./docs/protocols/INQUIRY_DRAFT.md)
- [Canonical Identity and Provenance](./docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md)
- [Standard API](./apps/api/README.md)
- [Frontend SPA/PWA](./apps/frontend/README.md)
- [Edge AI](./apps/edge-ai/README.md)
- [Transport Positioning](./docs/architecture/TRANSPORT_POSITIONING.md)

## Live endpoints

- Relay: `wss://relay.toitoi.cultivationdata.net`
- API: `https://api.toitoi.cultivationdata.net`

These endpoints are operational project infrastructure. Deterministic release tests do not guarantee external service availability or that the hosted environment has already been upgraded to the repository head.

## Scope and limitations

v0.7.0 is an experimental reference release, not a production-grade hosted product.

- production authentication, authorization, rate limiting, and multi-user tenancy are not implemented
- the AI queue remains local and single-process rather than distributed
- live model and external transport checks are opt-in
- service-worker caching does not perform unattended background publication
- semantic search, embeddings, vector databases, RAG, graph inference, and large-scale graph visualization remain out of scope
- automatic semantic identity merging is prohibited
- AI-selected relations without human confirmation are rejected
- generated and derived inquiries are not guaranteed to be agriculturally correct

## Contributing and licensing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [LICENSE_POLICY.md](./LICENSE_POLICY.md).

- Relay and indexer infrastructure: GNU AGPLv3
- Frontend and edge client: MIT License
- Protocol schemas and documentation: CC BY-SA 4.0

---

# Toitoi 🌱

**プロトコル非依存のCanonical Eventを基盤とする、デジタル・アグロエコロジー・コモンズ**

**現在のリリース系列: v0.7.0**

Toitoi（トイトイ）は、『[テクノロジーを手放す農業論](./docs/essays/Tech-wo-Tebanasu-Nogyoron.md)』の思想に基づき、普遍的な「答え」ではなく、地域固有の観察から生まれる**問い**を共有・検討・派生させる分散型プロトコル・プラットフォームです。

## v0.7.0で実現したこと

v0.7.0では、既存の問いからsemantic relationを明示して新しい問いを派生し、その系譜・文脈・来歴を追跡できる利用体験を実装しました。

```text
公開済みの問い
  → semantic relationを選択
  → relation別情報を入力
  → 人間がrelationを明示確定
  → 派生Inquiry Draftを作成
  → 独立した人間レビュー
  → 別Canonical Eventとして公開
  → lineage・context・provenanceを確認
  → transportへ投影・再取得・replay
  → 同じ系譜意味を復元
```

主な機能:

- 8種類のfirst-class semantic relation
- relation type別の入力補助と厳格なvalidation
- `POST /api/v1/inquiries/:id/derive`
- スマートフォン基準の派生作成フォーム
- AI relation suggestionと人間確定の分離
- synthesisでの複数source inquiry保持
- 既存のInquiry Draft reviewとpublication guard
- canonical identity、semantic relation、context similarityの分離表示
- lineage、context、provenance、AI関与、人間確認の統合表示
- transport projection・再取得・storage replay後のlineage復元fixture

類似性やsemantic relationだけでCanonical identityを統合しません。AIはrelationを提案できますが、人間の明示確定なしでは派生Draftを作成できず、公開にはさらに独立した人間承認が必要です。

## セットアップ

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
corepack pnpm install
corepack pnpm test
```

統合API／workflow runtimeの起動:

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

`apps/frontend/`を同一originから配信するか、SPAから`/api/v1/*`へ到達できるreverse proxyを設定します。

## まず読む文書

- [v1.0.0までのロードマップ](./docs/roadmap/V1.0.0_ROADMAP.md)
- [v0.7.0リリース計画](./docs/roadmap/V0.7.0_RELEASE_PLAN.md)
- [v0.7.0リリース手順](./docs/roadmap/V0.7.0_RELEASE_RUNBOOK.md)
- [v0.7.0 GitHub Release本文](./docs/roadmap/V0.7.0_GITHUB_RELEASE.md)
- [リリースノート](./docs/roadmap/RELEASE_NOTES.md)
- [Standard API](./apps/api/README.md)
- [Frontend SPA／PWA](./apps/frontend/README.md)
- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [Inquiry Draft](./docs/protocols/INQUIRY_DRAFT.md)

## 既知の制約

v0.7.0は実験的なreference releaseです。production-gradeの認証・認可・rate limiting・multi-user tenancy、distributed AI queue、無人background publication、semantic search、embeddings、vector database、RAG、graph inference、大規模graph visualization、automatic identity mergeは対象外です。AIが提案したrelationは人間確認なしに確定されません。生成・派生された問いの農業上の妥当性は保証しません。

## ライセンス

詳細は[LICENSE_POLICY.md](./LICENSE_POLICY.md)を参照してください。