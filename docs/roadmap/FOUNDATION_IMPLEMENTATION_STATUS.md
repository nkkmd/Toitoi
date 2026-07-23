# Toitoi Foundation Implementation Status

**Status: current index / historical implementation record** | **Latest public release: v0.9.0** | **v1.0.0 candidate implementation: PR #39** | **Last updated: 2026-07-22**

## 目的

この文書は、[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)の歴史的位置づけ、公開済みv0.9.0の基盤到達点、v1.0.0候補実装の現在地を明確にします。

`IMPLEMENTATION_PLAN.md`はPhase 1〜18の基盤実装履歴です。v0.2.0以降のrelease単位の完成条件と実作業は、[`V1.0.0_ROADMAP.md`](./V1.0.0_ROADMAP.md)、各release plan、[`RELEASE_NOTES.md`](./RELEASE_NOTES.md)、GitHub Issues／PRsを正本とします。

## 文書の役割分担

| 文書 | 役割 | 更新方針 |
|---|---|---|
| `IMPLEMENTATION_PLAN.md` | Phase 1〜18の基盤実装履歴と設計判断 | 原則として履歴保存 |
| `FOUNDATION_IMPLEMENTATION_STATUS.md` | 公開基準点、候補実装、後続文書への入口 | 各releaseで更新 |
| `V1.0.0_ROADMAP.md` | v1.0.0までのrelease sequenceと完成条件 | release境界で更新 |
| `Vx.y.z_RELEASE_PLAN.md` | release単位のscopeとacceptance criteria | 対象release中はcurrent |
| `Vx.y.z_RELEASE_RECORD.md` | 実装証拠とrelease administrationの状態 | gate変更時に更新 |
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

## v1.0.0候補実装で統合済みの内容

PR #39では、ロードマップの最小参照実装を一つの固定シナリオへ接続しています。

- 「畑の東側だけ雑草の種類が違う」という観察から始まるconnected reference fixture
- 観察、AI候補、annotation review、Inquiry Draft、独立したpublication approval、Canonical Event公開のstable IDs
- 別地域の問いの検索、明示的な語彙mapping、cross-region synthesis、lineage／provenance追跡
- FTS5検索、context facet、structured filter、reverse-order replay後の検索同値性
- offline local save、機微情報確認、queue保持、同期失敗、明示的retry、Canonical publicationのfrontend Golden Path
- Canonical Event v1形状へ整合したConformance Suite 1.0.0
- `body`、`schemaVersion`、`tt:evt:` ID、`provenance.sources`、top-level `rawRef`、lineageの検証
- v1 strict profileと明示的なv0.9.0 compatibility profileの分離
- 外部CLI用固定JSON入力とmachine-readable report
- backup manifest、restore、corruption detection、migration plan／dry-run／apply、derived-state rebuild
- v1 contract index、reference walkthrough、setup／demo guide、pilot protocol、release runbook、release draft、release record

## v1候補の不変条件

- Canonical storageが正本
- raw observationと公開Canonical Eventを同一の保存・公開境界として扱わない
- FTS5、queue index、metrics、health viewはderived state
- actor identity、transport identity、Canonical Event identityを統合しない
- annotation acceptance、relation confirmation、publication approval、moderation、operator authorityを別判断として扱う
- transport failureはCanonical persistenceを無効化しない
- semantic relation、similarity、Vocabulary mappingはCanonical identityを自動統合しない
- local vocabularyを保持し、shared conceptへのmappingを明示的claimとして記録する
- AI outputは候補であり、人間のreviewとpublication approvalを通さず公開しない
- Conformance Suiteはprivate implementationではなくobservable contractを検証する
- legacy shapeは明示的compatibility profileでのみ受理し、native v1適合と混同しない

## 公開済み実装基準点

Latest public release: v0.9.0

- [`V0.9.0_RELEASE_PLAN.md`](./V0.9.0_RELEASE_PLAN.md)
- [`V0.9.0_RELEASE_RUNBOOK.md`](./V0.9.0_RELEASE_RUNBOOK.md)
- [`V0.9.0_GITHUB_RELEASE.md`](./V0.9.0_GITHUB_RELEASE.md)
- [`V0.9.0_RELEASE_RECORD.md`](./V0.9.0_RELEASE_RECORD.md)
- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- [implementation PR #37](https://github.com/nkkmd/Toitoi/pull/37)
- squash merge commit: `6a8db9022fd1db34bc81b3946c72ae714f4454ae`

## v1.0.0候補実装の入口

- [`V1.0.0_RELEASE_PLAN.md`](./V1.0.0_RELEASE_PLAN.md)
- [`V1.0.0_RELEASE_RUNBOOK.md`](./V1.0.0_RELEASE_RUNBOOK.md)
- [`V1.0.0_GITHUB_RELEASE.md`](./V1.0.0_GITHUB_RELEASE.md)
- [`V1.0.0_RELEASE_RECORD.md`](./V1.0.0_RELEASE_RECORD.md)
- [`../reference/V1_CONTRACT_INDEX.md`](../reference/V1_CONTRACT_INDEX.md)
- [`../reference/V1.0.0_REFERENCE_SCENARIO.md`](../reference/V1.0.0_REFERENCE_SCENARIO.md)
- [`../reference/V1.0.0_SETUP_AND_DEMO.md`](../reference/V1.0.0_SETUP_AND_DEMO.md)
- [`../pilot/V1.0.0_PILOT_PROTOCOL.md`](../pilot/V1.0.0_PILOT_PROTOCOL.md)
- [`../pilot/V1.0.0_PILOT_FINDINGS.md`](../pilot/V1.0.0_PILOT_FINDINGS.md)
- [implementation PR #39](https://github.com/nkkmd/Toitoi/pull/39)

## v1.0.0 release gateの現在地

### Repository-controlled gates completed

- deterministic connected reference scenario
- protocol、API search／replay、frontend offline、Conformance CLI、recovery／migration tests
- v1 observable contract index
- explicit v0.9 compatibility profile
- setup／demo documentation
- release runbookとrelease evidence record
- integrated PR CI green checkpoints

### Evidence or administration still open

- latest documentation-sync headのgreen CI
- final contract review record
- PR reviewとmerge
- merged `main`のCI確認
- hosted environmentをrelease headへ同期した証拠
- clean external setup evidence beyond GitHub Actions where available
- 一つ以上の実ローカルモデル構成による再現可能な問い生成の実地証拠
- real participant pilot findings、またはpilot未実施を既知制約として公開するrelease-owner判断
- annotated `v1.0.0` tagとGitHub Release公開

実参加者パイロット、タグ作成、GitHub Release公開は自動テストで代替しません。

embeddings、vector database、production RAG、大規模distributed queue、新規transportは、v1.0.0 Golden Pathと実地利用が安定した後に再評価します。
