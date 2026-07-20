# Toitoi 🌱

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE_POLICY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE_POLICY.md)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](./LICENSE_POLICY.md)

**Digital Agroecology Commons powered by protocol-independent Canonical Events**

**Current release line: v0.6.0**

*[日本語は下に続きます]*

Toitoi is a decentralized protocol platform and digital commons for sharing and evolving agroecological knowledge through **inquiries** rather than universal answers.

It is based on the philosophy of [Letting Go of Technology in Agriculture](./docs/essays/Letting-Go-of-Technology-in-Agriculture.md). Local observations remain grounded in their own context, while transport-independent Canonical Events allow inquiries to be reviewed, compared, derived, replayed, and delivered across distributed systems.

## v0.6.0: Offline SPA/PWA Golden Path

v0.6.0 connects the existing Canonical Event, AI annotation, Inquiry Draft, human review, storage, and multi-transport layers through a mobile-first installable web application.

```text
field observation
  → local IndexedDB persistence while offline
  → explicit synchronization after reconnect
  → AI inquiry-candidate review
  → accepted or edited annotation
  → Inquiry Draft promotion
  → independent human publication review
  → approved Canonical Event publication
  → append-only canonical storage
  → Nostr / Lingonberry / ATProto delivery
  → provenance, lineage, and delivery-result inspection
```

Implemented capabilities:

- mobile-first observation input and installable PWA shell
- IndexedDB-backed local observations and durable synchronization queue
- visible offline, queued, syncing, failed, retry, and published states
- explicit confirmation for location, personal information, contact data, and private context
- clear separation between local raw observations and externally published Canonical Events
- AI annotation accept, edit, and reject operations
- accepted or edited annotation promotion to an Inquiry Draft
- independent `draft → in_review → approved / rejected` publication review
- publication guard rejecting unapproved drafts
- Canonical Event persistence through the existing append-only storage layer
- outbound delivery through the existing multi-transport runtime
- publication provenance for source lineage, AI involvement, human approval, storage identifiers, and transport outcomes
- deterministic offline, workflow, persistence, and multi-transport tests in default CI

AI output never publishes autonomously. Annotation acceptance permits Draft creation only; publication requires an independently approved Inquiry Draft and an explicit user action.

## Architecture

```text
Mobile-first SPA / PWA
  → local IndexedDB observation and synchronization state
  → Standard API workflow mutations
  → asynchronous AI job / annotation layer
  → human annotation review
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
- It keeps human judgment at annotation and publication boundaries.
- It records provenance, lineage, uncertainty, and review decisions.
- It does not equate generated content with agricultural correctness.

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

Observation and publication workflow:

- `POST /api/v1/observations`
- `POST /api/v1/ai/annotations/:id/promote`
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
- [v0.6.0 Release Plan](./docs/roadmap/V0.6.0_RELEASE_PLAN.md)
- [v0.6.0 Release Runbook](./docs/roadmap/V0.6.0_RELEASE_RUNBOOK.md)
- [v0.6.0 GitHub Release Content](./docs/roadmap/V0.6.0_GITHUB_RELEASE.md)
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

v0.6.0 is an experimental reference release, not a production-grade hosted product.

- production authentication, authorization, rate limiting, and multi-user tenancy are not implemented
- the AI queue remains local and single-process rather than distributed
- live model and external transport checks are opt-in
- service-worker caching does not perform unattended background publication
- embeddings, vector databases, RAG, graph inference, and semantic identity merging remain out of scope
- generated inquiries are not guaranteed to be agriculturally correct

## Contributing and licensing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [LICENSE_POLICY.md](./LICENSE_POLICY.md).

- Relay and indexer infrastructure: GNU AGPLv3
- Frontend and edge client: MIT License
- Protocol schemas and documentation: CC BY-SA 4.0

---

# Toitoi 🌱

**プロトコル非依存のCanonical Eventを基盤とする、デジタル・アグロエコロジー・コモンズ**

**現在のリリース系列: v0.6.0**

Toitoi（トイトイ）は、『[テクノロジーを手放す農業論](./docs/essays/Tech-wo-Tebanasu-Nogyoron.md)』の思想に基づき、普遍的な「答え」ではなく、地域固有の観察から生まれる**問い**を共有・検討・派生させる分散型プロトコル・プラットフォームです。

## v0.6.0で実現したこと

v0.6.0では、現場の観察から人間確認済みCanonical Eventの公開までを、スマートフォン基準のSPA／PWAから操作できるGolden Pathへ統合しました。

```text
現場で観察を記録
  → 圏外でもIndexedDBへ保存
  → 接続回復後に明示的同期
  → AI問い候補を確認・修正・却下
  → Inquiry Draftへ昇格
  → 独立した人間レビュー
  → approved Draftだけを公開
  → Canonical Eventをappend-only storageへ保存
  → multi-transportへ配信
  → provenance・lineage・配信結果を確認
```

主な機能:

- スマートフォン基準の観察入力とinstallable PWA shell
- IndexedDBによるローカル観察保存と永続的な同期キュー
- offline、queued、syncing、failed、retry、published状態の可視化
- 位置情報、人物名、連絡先、非公開文脈の公開前確認
- raw observationと外部公開Canonical Eventの明確な分離
- AI annotationのaccept／edit／reject
- accepted／edited annotationからInquiry Draftへのpromotion
- `draft → in_review → approved / rejected`による独立したpublication review
- 未承認Draftを拒否するpublication guard
- 既存append-only storageへのCanonical Event保存
- 既存multi-transport runtimeによるNostr／Lingonberry／ATProto配信
- source lineage、AI関与、人間承認、storage ID、transport結果を含むpublication provenance

AI出力は自動公開されません。annotationの採用はDraft作成を許可するだけで、公開には独立した人間承認と明示的な公開操作が必要です。

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
- [v0.6.0リリース計画](./docs/roadmap/V0.6.0_RELEASE_PLAN.md)
- [v0.6.0リリース手順](./docs/roadmap/V0.6.0_RELEASE_RUNBOOK.md)
- [v0.6.0 GitHub Release本文](./docs/roadmap/V0.6.0_GITHUB_RELEASE.md)
- [リリースノート](./docs/roadmap/RELEASE_NOTES.md)
- [Standard API](./apps/api/README.md)
- [Frontend SPA／PWA](./apps/frontend/README.md)
- [Canonical Event](./docs/protocols/CANONICAL_EVENT.md)
- [Inquiry Draft](./docs/protocols/INQUIRY_DRAFT.md)

## 既知の制約

v0.6.0は実験的なreference releaseです。production-gradeの認証・認可・rate limiting・multi-user tenancy、distributed AI queue、無人background publication、embeddings、vector database、RAG、graph inference、semantic identity mergeは対象外です。生成された問いの農業上の妥当性は保証しません。

## ライセンス

詳細は[LICENSE_POLICY.md](./LICENSE_POLICY.md)を参照してください。
