# Toitoi Foundation Implementation Status

**Status: current index / historical implementation record** | **Last updated: 2026-07-22**

## 目的

この文書は、[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)の現在の位置づけと、v0.8.0時点の基盤到達点を明確にします。

`IMPLEMENTATION_PLAN.md`はPhase 1〜18の基盤実装履歴です。v0.2.0以降のrelease単位の完成条件と実作業は、V1.0.0 Roadmap、release plan、Release Notes、GitHub Issues／PRsを正本とします。

v0.3.0ではlineage treeとcontext exploration、v0.4.0では非同期AI annotation、v0.5.0では複数問い候補とreview mutation、v0.6.0ではmobile-first SPA／PWAとoffline workflow、v0.7.0ではhuman-reviewed semantic derivation、v0.8.0ではrebuildable search、Vocabulary、related inquiry reuseを統合しました。

## 文書の役割分担

| 文書 | 役割 | 更新方針 |
|---|---|---|
| `IMPLEMENTATION_PLAN.md` | Phase 1〜18の基盤実装履歴と設計判断 | 原則として履歴保存 |
| `FOUNDATION_IMPLEMENTATION_STATUS.md` | 基盤の現在地と後続文書への入口 | 各minor releaseで更新 |
| `V1.0.0_ROADMAP.md` | v1.0.0までのrelease sequenceと完成条件 | release境界または完成条件変更時に更新 |
| `Vx.y.z_RELEASE_PLAN.md` | release単位のscopeとacceptance criteria | 対象release中はcurrent |
| `RELEASE_NOTES.md` | 公開済み／release candidateの記録 | release gate変更時に更新 |
| GitHub Issues／PRs | 実装単位とacceptance criteria | 実作業の正本 |

## 完了済み基盤の要約

### Semantic and protocol boundary

- Canonical Eventをprotocol-independent semantic layerとして定義
- raw／normalized／canonicalの責務分離
- Adapter／Normalizer／Converter／Indexer／Standard APIの境界

### Ingest, storage, and replay

- validate／verify／dedupe／canonicalize
- raw／canonical append-only storage
- deterministic replayとderived index再構築
- protocol-specific operational workers

### Multi-transport

- Nostr、Lingonberry、ATProtoのruntime／storage boundary
- fan-out／fan-in、protocol registry、storage runtime selection
- `TOITOI_PROTOCOL`によるsingle-transport selection
- delivered／skipped／quarantined result保持

### Identity, provenance, and lineage

- opaque canonical ID
- identity key／identity claim
- provenance／rawRefの責務分離
- explicit identity mappingによるcross-transport merge
- ambiguous eventを無理に統合しない方針
- semantic relationをlineageへ記録
- AI関与、human review、storage ID、transport resultの追跡
- canonical identity、semantic relation、context similarityの明示的分離

### Access and reference experience

- Standard API canonical view
- inquiry detail／provenance／lineage／context queries
- lineage treeとcontext exploration
- Inquiry Draft／human review／publication guard
- transport-independent frontend model
- mobile-first SPA／PWA application shell
- v0.2.0〜v0.8.0のcross-feature Golden Pathsと回帰fixture

### Asynchronous AI assistance

- ingestから分離されたduplicate-aware AI job queue
- bounded retryとterminal failure
- summary／tag／generate_inquiries annotation contracts
- model／prompt／raw output／review state provenance
- append-only job／annotation persistence
- deterministic providerとllama.cpp-compatible provider
- accept／edit／reject review service
- reviewed candidateからInquiry Draftへのpromotion
- annotation reviewとpublication approvalの分離

### v0.6.0 application and offline workflow

- smartphone-first observation input
- IndexedDB local persistence
- explicit synchronization queueとretry state
- sensitive fieldの公開前確認
- raw local observationとpublic Canonical Eventの分離
- approved Draftのみを許可するpublication guard
- canonical storageとmulti-transport publication
- unattended background publicationを行わないService Worker boundary

### v0.7.0 inquiry derivation and genealogy

- 8種類のfirst-class semantic relation
- relation type別validation
- `POST /api/v1/inquiries/:id/derive`
- mobile-first derivation form
- AI suggestionとhuman confirmationの分離
- lineage、context、provenance、identity、AI、human reviewの統合presentation
- transport replay後のlineage復元fixture

### v0.8.0 search, vocabulary, and reuse

- Canonical Eventから再構築可能なSQLite FTS5 projection
- inquiry、observation、accepted summary、tag、label、context、relation、provenance、review、transport metadataの検索
- region、climate、soil、crop、season、transport、provenance、review state filter
- context／transport／review facet
- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- `exact_identity`、`explicit_relation`、`related_candidate`の分離
- outgoing relationとincoming lineage childを含むexplicit relation優先の関連問い取得
- Core／Domain／Local Vocabulary contract
- locality、provenance、review state、人間確認境界を保持するmapping claim
- `GET /api/v1/vocabulary/terms`
- `GET /api/v1/vocabulary/mappings`
- search／context exploration ViewModelとrenderer
- fixed reference ranking／filter dataset
- canonical replay前後のsearch result／facet同値性
- canonical `provenance.sources[]`とpublication human review decisionのprojection対応

## v0.8.0の不変条件

- Canonical storageが正本
- FTS5はderived projectionであり、削除・再構築可能
- search failureはingest、review、publication authorityへ影響しない
- lexical similarity、context overlap、relation、Vocabulary mappingからidentityを自動統合しない
- local vocabularyをshared termへsilent normalizationしない
- mapping claimはsource／target、relation、locality、provenance、review stateを保持する
- 既存の`draft → in_review → approved → published`境界を維持する

## 現在のリリース基準点

v0.8.0 released baselineの正本:

- [`V0.8.0_RELEASE_PLAN.md`](./V0.8.0_RELEASE_PLAN.md)
- [`V0.8.0_RELEASE_RUNBOOK.md`](./V0.8.0_RELEASE_RUNBOOK.md)
- [`V0.8.0_GITHUB_RELEASE.md`](./V0.8.0_GITHUB_RELEASE.md)
- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- [PR #36](https://github.com/nkkmd/Toitoi/pull/36)
- tag: `v0.8.0`
- tag target／merge commit: `d04e4354325ebd68f270f844cd7130a47ae4e660`
- final pre-merge CI: run #654 succeeded

## 次の基盤課題

v0.9.0以降は[`V1.0.0_ROADMAP.md`](./V1.0.0_ROADMAP.md)を正本とします。直近の主な課題:

- production authentication／authorization／rate limiting
- shared persistent workflow repositoryとmulti-user boundary
- Conformance Suiteとschema migration tooling
- AI quality evaluationとdomain-specific review protocol
- search quality evaluationの実地dataset拡張
- Vocabulary governanceとdispute／alternative mapping運用

embeddings、vector database、production RAG、大規模distributed queue、新規transportは、lexical／structured baselineと実地利用が安定した後に再評価します。

AIによる無人公開は既定路線にせず、人間確認をpublication boundaryとして維持します。
