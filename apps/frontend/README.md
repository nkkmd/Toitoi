# Toitoi Frontend

**Status: v0.8.0 released** | **Last updated: 2026-07-22**

`apps/frontend/` は、ToitoiのStandard APIを利用するmobile-first SPA／PWA reference implementationです。transport固有eventを直接扱わず、観察のローカル保存、AI問い候補レビュー、Inquiry Draft、Canonical Event publication、semantic derivation、検索・文脈探索を接続します。

## Golden Path

```text
field observation
  → IndexedDB local persistence
  → explicit synchronization
  → AI inquiry candidate review
  → Inquiry Draft and publication review
  → Canonical Event publication
  → lexical / structured search
  → context and related-inquiry exploration
  → canonical detail / lineage / provenance
  → optional semantic derivation
```

## SPA／PWA shell

- `index.html`: mobile-first application entry point
- `styles.css`: smartphone-first responsive layout
- `manifest.webmanifest`: installable PWA metadata
- `service-worker.js`: application-shell caching
- `icon.svg`: PWA icon

Service WorkerはGET対象のapplication shellをcacheします。publication mutationをbackgroundで自動実行しません。

## v0.8.0 search and context exploration

`search_exploration_view_model.js`は、UI状態をtransport-independentなAPI requestへ変換します。

対応条件:

- query text
- region
- climate zone
- soil type
- crop family
- season
- transport
- review state

利用API:

- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- `GET /api/v1/vocabulary/terms`
- `GET /api/v1/vocabulary/mappings`

`search_exploration_renderer.js`はloading、empty、error、ready状態をHTMLへ描画し、次を表示します。

- result classification
- context values
- transport
- review state
- provenance
- canonical detailへのnavigation
- 「関連候補を同一の問いとして自動統合しない」という境界

結果分類:

- `exact_identity`: canonical IDによる直接一致
- `explicit_relation`: 保存済みsemantic relation
- `related_candidate`: lexical／structured contextによる候補

explicit relationはrelated candidateより先に表示します。どの分類もautomatic identity mergeを意味しません。

## Offline observation workflow

`offline_store.js`はlocal observation、synchronization queue、retry回数、最終error、remote Canonical Event IDをIndexedDBへ保持します。

位置情報、人物名、連絡先、非公開文脈が入力されている場合は、公開キュー追加前に個別確認を要求します。local raw observationと外部公開Canonical Eventは別recordです。

## AI annotation review and publication

`workflow_ui.js`はannotationのaccept、edit、reject、reviewed candidateからのInquiry Draft作成を提供します。annotation acceptanceはpublication approvalではありません。

```text
draft
  → in_review
  → approved / rejected
```

`approved`以外のDraftはpublication guardによって拒否されます。

## Semantic derivation and genealogy

`derivation_form_model.js`と`derivation_ui.js`は、既存inquiryから派生Inquiry Draftを作成します。AI relation suggestionは参考情報であり、利用者がrelationを明示確定しなければDraftを作成できません。

`genealogy_view_model.js`と`genealogy_view_renderer.js`は次を別概念として表示します。

- Canonical identity
- semantic relation
- context similarity

context similarity、semantic relation、Vocabulary mappingはいずれもidentity evidenceとして自動採用しません。

## Local execution

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

`apps/frontend/`を静的HTTP serverで配信し、`/api/v1/*`を同一originのAPIへ到達させます。`file://`で直接開く構成はService Workerとsame-origin APIの検証に適しません。

## Test

```bash
corepack pnpm --filter @toitoi/frontend test
corepack pnpm test
```

主なfrontend test:

- `test_inquiry_view_model.js`
- `test_lineage_tree_renderer.js`
- `test_context_exploration.js`
- `test_ai_review.js`
- `test_search_exploration_view_model.js`
- `test_search_exploration_renderer.js`
- `test_v0_3_0_golden_path.js`
- `test_v0_4_0_golden_path.js`
- `test_v0_5_0_golden_path.js`
- `test_v0_6_0_offline_golden_path.js`
- `test_v0_7_0_transport_replay.js`

## UX principles

- 問いを正解や処方として表示しない
- AI出力を公開済みinquiryと混同しない
- exact identity、explicit relation、related candidateを分離する
- local vocabularyをshared termへsilent normalizationしない
- annotation review、relation confirmation、mapping review、publication reviewを分離する
- raw local observationとpublic Canonical Eventを分離する
- sync failureとretry状態を隠さない
- transport固有表現を主要UIへ露出しない
- provenance、lineage、AI関与、人間確認状態を追跡可能にする
- keyboard操作、HTML escape、欠損データへの耐性を維持する

## Limitations

- production authentication、authorization、rate limitingは未実装
- multi-user collaborationとreal-time editingは未実装
- Service Workerによるunattended background publicationは行わない
- browser-level E2Eはreference Golden Path中心
- FTS5 lexical／structured searchを実装済みだが、embeddings、vector search、production RAG、graph inferenceは非対象
- large-scale graph visualizationは非対象
- automatic identity mergeは行わない
- AI生成・派生・関連候補の農業上の妥当性は保証しない

## Related documents

- [Standard API](../api/README.md)
- [v0.8.0 Release Plan](../../docs/roadmap/V0.8.0_RELEASE_PLAN.md)
- [v0.8.0 Release Runbook](../../docs/roadmap/V0.8.0_RELEASE_RUNBOOK.md)
- [v0.8.0 GitHub Release Content](../../docs/roadmap/V0.8.0_GITHUB_RELEASE.md)
- [Roadmap to v1.0.0](../../docs/roadmap/V1.0.0_ROADMAP.md)
- [Inquiry Draft Contract](../../docs/protocols/INQUIRY_DRAFT.md)
