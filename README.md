# Toitoi 🌱

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE_POLICY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE_POLICY.md)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](./LICENSE_POLICY.md)

**Digital Agroecology Commons powered by protocol-independent Canonical Events**

**Current release: v0.8.0**

*[日本語は下に続きます]*

Toitoi is a decentralized protocol platform and digital commons for sharing and evolving agroecological knowledge through **inquiries** rather than universal answers.

It is based on the philosophy of [Letting Go of Technology in Agriculture](./docs/essays/Letting-Go-of-Technology-in-Agriculture.md). Local observations remain grounded in their own context, while transport-independent Canonical Events allow inquiries to be reviewed, compared, derived, searched, replayed, and delivered across distributed systems.

## v0.8.0: Search, vocabulary, and reuse

v0.8.0 makes accumulated inquiries discoverable and reusable without turning lexical similarity, semantic relations, or vocabulary mappings into canonical identity.

```text
Canonical Events
  → rebuildable SQLite FTS5 projection
  → lexical search and structured filters
  → context facets and related-inquiry exploration
  → Core / Domain / Local Vocabulary
  → explicit mapping claims
  → canonical detail, provenance, lineage, and derivation workflow
```

Implemented capabilities:

- rebuildable SQLite FTS5 projection over Canonical Events
- search across inquiry text, observations, accepted summaries, tags, labels, contexts, relations, provenance, review state, and transport metadata
- structured filters for region, climate, soil, crop, season, transport, provenance, review state, and event type
- context facets for exploratory navigation
- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- explicit result classes: `exact_identity`, `explicit_relation`, and `related_candidate`
- outgoing relations and incoming lineage children ordered before lexical candidates
- Core, Domain, and Local Vocabulary contracts
- vocabulary mapping claims with provenance, review state, locality, and human-confirmation boundaries
- `GET /api/v1/vocabulary/terms`
- `GET /api/v1/vocabulary/mappings`
- frontend search/context ViewModel and HTML renderer
- fixed reference dataset, ranking/filter regression, and replay-equivalence validation
- canonical `provenance.sources[]` and publication human review-state indexing

Canonical storage remains the source of truth. The FTS5 database is derived and rebuildable. Search results, relation edges, and vocabulary mappings never merge Canonical Event identity.

## Architecture

```text
Mobile-first SPA / PWA
  → local IndexedDB observation and synchronization state
  → Standard API workflow mutations
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
```

The SPA consumes transport-independent Standard API contracts and does not depend on Nostr, Lingonberry, or ATProto event shapes.

## Project philosophy

Toitoi treats AI as a **librarian** or **mycelium**, not as an authority that issues universal agricultural prescriptions.

- It connects inquiries and contexts without erasing locality.
- It keeps human judgment at annotation, relation-confirmation, vocabulary-mapping, and publication boundaries.
- It records provenance, lineage, uncertainty, AI involvement, and review decisions.
- It does not equate generated, derived, related, or mapped content with agricultural correctness or canonical identity.

## Quick start

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
corepack pnpm install
corepack pnpm test
```

Start the integrated API, workflow, search, and vocabulary runtime:

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

`TOITOI_STORAGE_DIR` enables workflow mutations and canonical publication. `TOITOI_AI_STORAGE_DIR` enables AI job and annotation inspection/review. `TOITOI_SEARCH_INDEX_FILE` selects a persistent FTS5 projection; omit it to use an in-memory projection. `TOITOI_PROTOCOL` may be `nostr`, `lingonberry`, or `atproto`.

Serve `apps/frontend/` from the same origin or configure an equivalent reverse proxy so that the SPA can call `/api/v1/*`.

## Main API surfaces

Search and reuse:

- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- `GET /api/v1/vocabulary/terms`
- `GET /api/v1/vocabulary/mappings`

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

These are reference contracts and do not yet include production authentication or authorization.

## Documentation

### Release and current implementation

- [Roadmap to v1.0.0](./docs/roadmap/V1.0.0_ROADMAP.md)
- [v0.8.0 Release Plan](./docs/roadmap/V0.8.0_RELEASE_PLAN.md)
- [v0.8.0 Release Runbook](./docs/roadmap/V0.8.0_RELEASE_RUNBOOK.md)
- [v0.8.0 GitHub Release Content](./docs/roadmap/V0.8.0_GITHUB_RELEASE.md)
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

v0.8.0 is an experimental reference release, not a production-grade hosted product.

- production authentication, authorization, rate limiting, and multi-user tenancy are not implemented
- the AI queue remains local and single-process rather than distributed
- live model and external transport checks are opt-in
- service-worker caching does not perform unattended background publication
- FTS5 provides lexical and structured search; embeddings, vector databases, production RAG, and graph inference remain out of scope
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

**現在のリリース: v0.8.0**

Toitoi（トイトイ）は、『[テクノロジーを手放す農業論](./docs/essays/Tech-wo-Tebanasu-Nogyoron.md)』の思想に基づき、普遍的な「答え」ではなく、地域固有の観察から生まれる**問い**を共有・検討・派生・探索する分散型プロトコル・プラットフォームです。

## v0.8.0で実現したこと

v0.8.0では、蓄積された問いを語句・文脈・地域・relation・provenance・review state・地域語彙から探索し、再利用できる基盤を追加しました。

主な機能:

- Canonical Eventから再構築可能なSQLite FTS5検索projection
- 問い本文、観察、承認済みsummary、tag、label、context、relation、provenance、review、transport metadataの検索
- region、climate、soil、crop、season、transport、review state等のfilterとfacet
- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- `exact_identity`、`explicit_relation`、`related_candidate`の分離
- outgoing relationとincoming lineage childをlexical candidateより優先する関連問い表示
- Core／Domain／Local Vocabulary contract
- locality、provenance、review state、人間確認境界を保持するmapping claim
- `GET /api/v1/vocabulary/terms`
- `GET /api/v1/vocabulary/mappings`
- 検索・文脈探索用frontend ViewModel／renderer
- 固定reference dataset、ranking／filter回帰、replay同値性テスト
- canonical `provenance.sources[]`とpublication human review decisionの検索projection対応

Canonical storageが正本です。FTS5は再構築可能な派生データであり、類似性、semantic relation、vocabulary mappingだけでCanonical identityを統合しません。

## セットアップ

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
corepack pnpm install
corepack pnpm test
```

統合API／workflow／search runtimeの起動:

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

`TOITOI_SEARCH_INDEX_FILE`を省略すると、検索projectionはmemory上に作成されます。`apps/frontend/`を同一originから配信するか、SPAから`/api/v1/*`へ到達できるreverse proxyを設定します。

## まず読む文書

- [v1.0.0までのロードマップ](./docs/roadmap/V1.0.0_ROADMAP.md)
- [v0.8.0リリース計画](./docs/roadmap/V0.8.0_RELEASE_PLAN.md)
- [v0.8.0リリース手順](./docs/roadmap/V0.8.0_RELEASE_RUNBOOK.md)
- [v0.8.0 GitHub Release本文](./docs/roadmap/V0.8.0_GITHUB_RELEASE.md)
- [リリースノート](./docs/roadmap/RELEASE_NOTES.md)
- [Standard API](./apps/api/README.md)
- [Frontend SPA／PWA](./apps/frontend/README.md)
- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [Inquiry Draft](./docs/protocols/INQUIRY_DRAFT.md)

## 既知の制約

v0.8.0は実験的なreference releaseです。production-gradeの認証・認可・rate limiting・multi-user tenancy、distributed AI queue、無人background publication、embeddings、vector database、production RAG、graph inference、大規模graph visualization、automatic identity mergeは対象外です。地域語彙はmapping claimによって接続し、silent normalizationしません。生成・派生・関連付けされた問いの農業上の妥当性は保証しません。

## ライセンス

詳細は[LICENSE_POLICY.md](./LICENSE_POLICY.md)を参照してください。
