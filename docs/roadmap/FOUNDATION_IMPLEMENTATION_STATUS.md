# Toitoi Foundation Implementation Status

**Status: current index / historical implementation record** | **Last updated: 2026-07-16**

## 目的

この文書は、[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) の現在の位置づけと、v0.4.0時点の基盤到達点を明確にします。

`IMPLEMENTATION_PLAN.md` は、Canonical Event、adapter / normalizer、storage / replay、Indexer、Standard API、multi-protocol、canonical identity、identity claim、Lingonberry、registry-driven runtime selectionを段階的に実装した履歴です。

Phase 18までの基盤はv0.1.0で接続され、v0.2.0ではGolden Path、Inquiry Draft、human review、publication guard、frontend render boundary、primary transport operational smokeが追加されました。v0.3.0ではlineage tree、context exploration、reviewed derived inquiry publicationを統合し、v0.4.0ではその手前に非同期AI annotation layerを接続しました。

今後の新規機能優先順位は`IMPLEMENTATION_PLAN.md`のフェーズ番号を延長して管理せず、次を正本として扱います。

- プロジェクト全体の改善方針: [`IMPROVEMENT_ROADMAP.md`](./IMPROVEMENT_ROADMAP.md)
- AI導入方針: [`AI_ADOPTION_ROADMAP.md`](./AI_ADOPTION_ROADMAP.md)
- リリースごとのスコープとacceptance criteria: `Vx.y.z_RELEASE_PLAN.md`
- 公開基準点: [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- 実作業と進捗: GitHub Issues / Pull Requests

## 文書の役割分担

| 文書 | 役割 | 更新方針 |
|---|---|---|
| `IMPLEMENTATION_PLAN.md` | Phase 1〜18の基盤実装履歴と設計判断 | 原則として履歴保存 |
| `FOUNDATION_IMPLEMENTATION_STATUS.md` | 基盤の現在地と後続文書への入口 | 各minor releaseで更新 |
| `IMPROVEMENT_ROADMAP.md` | 中長期の利用者価値・改善方向 | 方針変更時に更新 |
| `AI_ADOPTION_ROADMAP.md` | AI補助層の段階導入と安全境界 | AI scope変更時に更新 |
| `Vx.y.z_RELEASE_PLAN.md` | リリース単位の必須・非対象・完了条件 | 対象release中はcurrent |
| `RELEASE_NOTES.md` | 公開済み／release candidateの記録 | release gate変更時に更新 |
| GitHub Issues | 実装単位とacceptance criteria | 作業の正本 |

## 完了済み基盤の要約

### Semantic and protocol boundary

- Canonical Eventをprotocol-independent semantic layerとして定義
- raw / normalized / canonicalの責務分離
- Adapter / Normalizer / Converter / Indexer / Standard APIの境界

### Ingest, storage, and replay

- validate / verify / dedupe / canonicalize
- raw / canonical append-only storage
- deterministic replayとderived index再構築
- protocol-specific operational workers

### Multi-transport

- Nostrをprimary relay-oriented transportとして接続
- Lingonberryをprimary knowledge-object projection / ingest transportとして接続
- ATProtoをsecondary compatibility transportとして維持
- fan-out / fan-in、protocol registry、storage runtime selection
- `TOITOI_PROTOCOL`によるsingle-transport selectionをv0.4 API entrypointでも維持

### Identity, provenance, and lineage

- opaque canonical ID
- identity key / identity claim
- provenance / rawRefの責務分離
- explicit identity mappingによるcross-transport merge
- ambiguous eventを無理に統合しない方針
- derived inquiryのsemantic relationを`lineage`へ記録
- workflow、AI関与、human reviewを`meta.publication`へ記録

### Access and reference experience

- Standard API canonical view
- inquiry detail / provenance / lineage / context queries
- lineage treeとcontext exploration
- Inquiry Draft / human review / publication guard
- frontend transport-independent render model
- v0.2.0〜v0.4.0のcross-feature Golden Paths

### Asynchronous AI assistance

v0.4.0で次を接続しました。

- ingestから分離されたduplicate-aware AI job queue
- bounded retryとterminal failureの区別
- summary / tag用versioned annotation contract
- model、prompt version、raw output、source event、review stateのprovenance
- append-only JSONLによるjob transition / annotation persistence
- restart recoveryと中断jobの再キュー化
- provider-neutral workerとdeterministic CI provider
- read-only Standard API AI inspection routes
- accepted annotationからlineage付きderived Inquiry Draftへのpromotion
- frontend上でAI補助と公開済みinquiryを区別するreview presentation

AI annotationはCanonical Eventとは分離され、`unreviewed`状態ではpromotionもpublicationもできません。accepted後も通常の`draft → in_review → approved` workflowを必須とします。

## 現在のリリース基準点

v0.4.0の正本:

- [`V0.4.0_RELEASE_PLAN.md`](./V0.4.0_RELEASE_PLAN.md)
- [`V0.4.0_RELEASE_RUNBOOK.md`](./V0.4.0_RELEASE_RUNBOOK.md)
- [`V0.4.0_GITHUB_RELEASE.md`](./V0.4.0_GITHUB_RELEASE.md)
- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- [PR #26](https://github.com/nkkmd/Toitoi/pull/26)

## 次の基盤課題

v0.4.0後の主な候補:

- production inference provider / local model runtime integration
- durableまたはdistributedなjob queue
- annotation reviewとpromotionのmutation API
- production authentication / authorization / rate limiting
- complete SPA integration
- embeddings、vector database、RAG
- AI quality evaluationとdomain-specific review protocol

AIによる無人公開は将来課題としても既定路線にせず、人間確認をpublication boundaryとして維持します。

## 変更判断

今後`IMPLEMENTATION_PLAN.md`を変更するのは、原則として次の場合に限定します。

- Phase 1〜18の完了記録に事実誤認がある
- ファイル移動によって参照先が壊れた
- security / data integrity上、過去の設計判断に明確な注意書きが必要になった

新しい機能、優先順位、release blockerはImprovement Roadmap、AI Adoption Roadmap、release plan、Issueで管理します。