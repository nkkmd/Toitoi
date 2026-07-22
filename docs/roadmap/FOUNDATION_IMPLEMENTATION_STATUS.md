# Toitoi Foundation Implementation Status

**Status: current index / historical implementation record** | **Current baseline: v0.9.0** | **Last updated: 2026-07-22**

## 目的

この文書は、[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)の歴史的位置づけと、v0.9.0時点の基盤到達点を明確にします。

`IMPLEMENTATION_PLAN.md`はPhase 1〜18の基盤実装履歴です。v0.2.0以降のrelease単位の完成条件と実作業は、[`V1.0.0_ROADMAP.md`](./V1.0.0_ROADMAP.md)、各release plan、[`RELEASE_NOTES.md`](./RELEASE_NOTES.md)、GitHub Issues／PRsを正本とします。

## 文書の役割分担

| 文書 | 役割 | 更新方針 |
|---|---|---|
| `IMPLEMENTATION_PLAN.md` | Phase 1〜18の基盤実装履歴と設計判断 | 原則として履歴保存 |
| `FOUNDATION_IMPLEMENTATION_STATUS.md` | 基盤の現在地と後続文書への入口 | 各minor releaseで更新 |
| `V1.0.0_ROADMAP.md` | v1.0.0までのrelease sequenceと完成条件 | release境界で更新 |
| `Vx.y.z_RELEASE_PLAN.md` | release単位のscopeとacceptance criteria | 対象release中はcurrent |
| `RELEASE_NOTES.md` | 公開済み／release candidateの記録 | release gate変更時に更新 |
| GitHub Issues／PRs | 実装単位とacceptance criteria | 実作業の正本 |

## 完了済み基盤の要約

### Semantic and protocol boundary

- Canonical Eventをprotocol-independent semantic layerとして定義
- raw／normalized／canonicalの責務分離
- Adapter／Normalizer／Converter／Indexer／Standard APIの境界
- Nostr、Lingonberry、ATProtoのruntime／storage boundary
- fan-out／fan-in、protocol registry、storage runtime selection

### Ingest, storage, replay, and search

- validate／verify／dedupe／canonicalize
- raw／canonical append-only storage
- deterministic replayとderived index再構築
- Canonical Eventから再構築可能なSQLite FTS5 projection
- inquiry、observation、summary、tag、label、context、relation、provenance、review、transport metadataの検索
- structured filter、facet、related inquiry API
- lexical similarity、relation、Vocabulary mappingからidentityを自動統合しない境界

### Identity, provenance, lineage, and workflow

- opaque canonical ID
- identity key／identity claim
- provenance／rawRefの責務分離
- explicit identity mappingによるcross-transport merge
- semantic relationとlineageの記録
- Inquiry Draft、human review、publication guard
- annotation review、relation confirmation、publication approvalの分離
- mobile-first SPA／PWA、IndexedDB local persistence、explicit synchronization queue

### Asynchronous AI assistance

- ingestから分離されたduplicate-aware AI job queue
- summary／tag／generate_inquiries annotation contracts
- model／prompt／raw output／review state provenance
- deterministic providerとllama.cpp-compatible provider
- accept／edit／reject review service
- reviewed candidateからInquiry Draftへのpromotion
- AIによる無人公開を行わないpublication boundary

### v0.7.0 inquiry derivation and genealogy

- 8種類のfirst-class semantic relation
- relation type別validation
- `POST /api/v1/inquiries/:id/derive`
- mobile-first derivation form
- AI suggestionとhuman confirmationの分離
- replay後のlineage復元fixture

### v0.8.0 search, vocabulary, and reuse

- SQLite FTS5 projection
- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- `exact_identity`、`explicit_relation`、`related_candidate`の分離
- Core／Domain／Local Vocabulary contract
- provenance、review state、locality、人間確認境界を保持するmapping claim
- fixed reference ranking／filter datasetとreplay-equivalence validation

### v0.9.0 collaborative operation, durability, and conformance

- actor roles: `reader`、`contributor`、`reviewer`、`publisher`、`moderator`、`operator`
- authentication identity、actor identity、transport identity、Canonical Event identityの分離
- `TOITOI_AUTH_REQUIRED=true`による認証強制server mode
- stable JSON errors、request IDs、rate limiting、mutation idempotency
- hash-chained append-only audit records
- `GET /health/live`、`GET /health/ready`、operator-only audit inspection
- JSONL durable queue、restart recovery、bounded retry、dead-letter、graceful shutdown
- backup manifest、SHA-256 verification、restore corruption detection
- migration plan、dry-run、target version、apply
- externally runnable `toitoi-conformance` CLI
- Canonical validation、ID preservation、provenance/rawRef boundary
- Nostr／Lingonberry／ATProto semantic round-trip fixture
- live ingest／replay equivalence
- TIP、schema compatibility、deprecation、Vocabulary change、moderation、information protection、correction／withdrawal／deletion-request process

## v0.9.0の不変条件

- Canonical storageが正本
- FTS5、queue index、metrics、health viewはderived state
- actor identityとCanonical Event identityを統合しない
- annotation acceptance、relation confirmation、publication approval、moderation、operator authorityを別判断として扱う
- transport failureはCanonical persistenceを無効化しない
- idempotencyは重複effectを防ぐが、別のreviewed actionを抑制しない
- moderationとwithdrawalは監査可能な状態遷移として記録し、履歴を黙って書き換えない
- Conformance Suiteはprivate implementationではなくobservable contractを検証する

## 現在の実装基準点

v0.9.0 implementation baseline:

- [`V0.9.0_RELEASE_PLAN.md`](./V0.9.0_RELEASE_PLAN.md)
- [`V0.9.0_RELEASE_RUNBOOK.md`](./V0.9.0_RELEASE_RUNBOOK.md)
- [`V0.9.0_GITHUB_RELEASE.md`](./V0.9.0_GITHUB_RELEASE.md)
- [`V0.9.0_RELEASE_RECORD.md`](./V0.9.0_RELEASE_RECORD.md)
- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- [implementation PR #37](https://github.com/nkkmd/Toitoi/pull/37)
- implementation head: `c064f8966bb96e8904798d670b6ec0e0dc662f31`
- final pre-merge CI: run #719 succeeded
- squash merge commit: `6a8db9022fd1db34bc81b3946c72ae714f4454ae`

タグ`v0.9.0`とGitHub Releaseの公開記録はrelease administration完了後に追記します。

## v1.0.0へ残る主要課題

- reference scenario全体のdefault CI Golden Path
- offline／onlineを含むUI E2Eの最終固定
- 一つ以上の実ローカルモデル構成による再現可能な問い生成
- small-group pilotとpilot findings
- operator／user向け導入手順の実地検証
- Canonical Event、Standard API、workflow、lineage、provenance、transport adapter、AI annotation、Conformance Suiteのv1 contract宣言
- hosted environmentのrelease headへの同期確認

embeddings、vector database、production RAG、大規模distributed queue、新規transportは、v1.0.0 Golden Pathと実地利用が安定した後に再評価します。
