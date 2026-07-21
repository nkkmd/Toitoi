# Toitoi Foundation Implementation Status

**Status: current index / historical implementation record** | **Last updated: 2026-07-21**

## 目的

この文書は、[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)の現在の位置づけと、v0.7.0時点の基盤到達点を明確にします。

`IMPLEMENTATION_PLAN.md`は、Canonical Event、adapter／normalizer、storage／replay、Indexer、Standard API、multi-protocol、canonical identity、identity claim、Lingonberry、registry-driven runtime selectionを段階的に実装した履歴です。

Phase 18までの基盤はv0.1.0で接続され、v0.2.0ではGolden Path、Inquiry Draft、human review、publication guard、frontend render boundary、primary transport operational smokeが追加されました。v0.3.0ではlineage tree、context exploration、reviewed derived inquiry publicationを統合し、v0.4.0では非同期AI annotation layerを接続しました。v0.5.0では実モデル互換provider、複数問い候補、annotation review mutation、Inquiry Draft promotionを統合しました。v0.6.0では、これらをmobile-first SPA／PWA、IndexedDB offline storage、明示的同期、workflow mutation、canonical storage、multi-transport publicationへ接続しました。v0.7.0では、semantic relation付きの問い派生を第一級操作へ引き上げ、relation別validation、mobile authoring、統合系譜表示、transport replay fixtureを追加しました。

今後の新規機能優先順位は`IMPLEMENTATION_PLAN.md`のphase番号を延長して管理せず、次を正本とします。

- v1.0.0までのrelease sequenceと完成条件: [`V1.0.0_ROADMAP.md`](./V1.0.0_ROADMAP.md)
- プロジェクト全体の改善方針: [`IMPROVEMENT_ROADMAP.md`](./IMPROVEMENT_ROADMAP.md)
- AI導入方針: [`AI_ADOPTION_ROADMAP.md`](./AI_ADOPTION_ROADMAP.md)
- リリースごとのscopeとacceptance criteria: `Vx.y.z_RELEASE_PLAN.md`
- 公開基準点: [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- 実作業と進捗: GitHub Issues／Pull Requests

## 文書の役割分担

| 文書 | 役割 | 更新方針 |
|---|---|---|
| `IMPLEMENTATION_PLAN.md` | Phase 1〜18の基盤実装履歴と設計判断 | 原則として履歴保存 |
| `FOUNDATION_IMPLEMENTATION_STATUS.md` | 基盤の現在地と後続文書への入口 | 各minor releaseで更新 |
| `V1.0.0_ROADMAP.md` | v1.0.0までのrelease sequenceと完成条件 | release境界または完成条件変更時に更新 |
| `IMPROVEMENT_ROADMAP.md` | 中長期の利用者価値・改善方向 | 方針変更時に更新 |
| `AI_ADOPTION_ROADMAP.md` | AI補助層の段階導入と安全境界 | AI scope変更時に更新 |
| `Vx.y.z_RELEASE_PLAN.md` | release単位の必須・非対象・完了条件 | 対象release中はcurrent |
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

- Nostrをprimary relay-oriented transportとして接続
- Lingonberryをprimary knowledge-object projection／ingest transportとして接続
- ATProtoをsecondary compatibility transportとして維持
- fan-out／fan-in、protocol registry、storage runtime selection
- `TOITOI_PROTOCOL`によるsingle-transport selection
- publication時のdelivered／skipped／quarantined結果保持

### Identity, provenance, and lineage

- opaque canonical ID
- identity key／identity claim
- provenance／rawRefの責務分離
- explicit identity mappingによるcross-transport merge
- ambiguous eventを無理に統合しない方針
- derived inquiryのsemantic relationを`lineage`へ記録
- workflow、AI関与、human reviewをpublication metadataへ記録
- canonical storage IDとtransport delivery resultの追跡
- canonical identity、semantic relation、context similarityの明示的分離

### Access and reference experience

- Standard API canonical view
- inquiry detail／provenance／lineage／context queries
- lineage treeとcontext exploration
- Inquiry Draft／human review／publication guard
- transport-independent frontend model
- mobile-first SPA／PWA application shell
- v0.2.0〜v0.7.0のcross-feature Golden Pathsと回帰fixture

### Asynchronous AI assistance

v0.4.0〜v0.5.0で次を接続しました。

- ingestから分離されたduplicate-aware AI job queue
- bounded retryとterminal failureの区別
- summary／tag／generate_inquiries annotation contracts
- model、model version、prompt version、raw output、source event、review stateのprovenance
- append-only JSONL job／annotation persistence
- restart recoveryと中断jobの再キュー化
- provider-neutral worker、deterministic CI provider、llama.cpp-compatible provider
- Standard API AI inspection routes
- append-only accept／edit／reject review service
- accepted／edited candidateからInquiry Draftへのpromotion
- annotation reviewとpublication approvalの分離

AI annotationはCanonical Eventとは分離され、`unreviewed`／`rejected`状態ではpromotionできません。`accepted`／`edited`後も通常の`draft → in_review → approved` workflowを必須とします。

### v0.6.0 application and offline workflow

- smartphone-first observation input
- IndexedDB local observation persistence
- durable explicit synchronization queue
- online／offline、queued、syncing、failed、retry、published状態の表示
- location、person names、contact、private contextの公開前確認
- raw local observationとpublic Canonical Eventの分離
- observation ingest、annotation promotion、Draft review、publication mutation API
- approved Draftのみを許可するpublication guard
- existing append-only canonical storageへのpublication
- existing multi-transport runtimeへのoutbound delivery
- source lineage、AI involvement、human approval、storage ID、transport resultの表示
- unattended background publicationを行わないService Worker boundary

### v0.7.0 inquiry derivation and genealogy

- 8種類のfirst-class semantic relation vocabulary
- relation type別の入力補助とstrict validation
- `POST /api/v1/inquiries/:id/derive`
- existing inquiryからderived Inquiry Draftを作るmobile-first form
- AI-suggested relationとhuman-confirmed relationの分離
- synthesisにおける複数source inquiry保持
- existing Draft review／publication guardへの接続
- lineage、context、provenance、identity、AI、human reviewの統合presentation model
- transport projection、re-ingest、storage replay後のlineage復元fixture
- similarityを根拠とするautomatic identity mergeの禁止

## 現在のリリース基準点

v0.7.0の正本:

- [`V0.7.0_RELEASE_PLAN.md`](./V0.7.0_RELEASE_PLAN.md)
- [`V0.7.0_RELEASE_RUNBOOK.md`](./V0.7.0_RELEASE_RUNBOOK.md)
- [`V0.7.0_GITHUB_RELEASE.md`](./V0.7.0_GITHUB_RELEASE.md)
- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- [PR #35](https://github.com/nkkmd/Toitoi/pull/35)

v0.7.0以降の工程:

- [`V1.0.0_ROADMAP.md`](./V1.0.0_ROADMAP.md)

## 次の基盤課題

v0.8.0以降は[`V1.0.0_ROADMAP.md`](./V1.0.0_ROADMAP.md)を正本とします。直近の主な課題は次のとおりです。

- SQLite FTS5による横断検索
- context、relation、transport、provenance、review state filter
- Core／Domain／Local Vocabularyとmapping claim
- exact identityとrelated candidateのUI／API分離
- production authentication／authorization／rate limiting
- shared persistent workflow repositoryとmulti-user boundary
- Conformance Suiteとschema migration tooling
- AI quality evaluationとdomain-specific review protocol

embeddings、vector database、RAG、大規模distributed queue、新規transportは、Golden Pathと実地利用が安定した後に再評価します。

AIによる無人公開は既定路線にせず、人間確認をpublication boundaryとして維持します。

## 変更判断

今後`IMPLEMENTATION_PLAN.md`を変更するのは、原則として次の場合に限定します。

- Phase 1〜18の完了記録に事実誤認がある
- ファイル移動によって参照先が壊れた
- security／data integrity上、過去の設計判断に明確な注意書きが必要になった

新しい機能、優先順位、release blockerはV1.0.0 Roadmap、Improvement Roadmap、AI Adoption Roadmap、release plan、Issueで管理します。