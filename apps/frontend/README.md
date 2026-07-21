# Toitoi Frontend

**Status: v0.7.0** | **Last updated: 2026-07-21**

`apps/frontend/` は、ToitoiのStandard APIを利用するmobile-first SPA／PWA reference implementationです。transport固有eventを直接扱わず、観察のローカル保存、明示的同期、AI問い候補レビュー、Inquiry Draft review、Canonical Event publication、既存inquiryからのsemantic derivationまでを一つの利用体験として接続します。

## Golden Path

```text
field observation
  → IndexedDB local persistence
  → explicit synchronization
  → AI inquiry candidate review
  → Inquiry Draft
  → independent publication review
  → Canonical Event publication
  → existing inquiry discovery
  → semantic relation authoring
  → derived Inquiry Draft
  → lineage / context / provenance inspection
```

## SPA／PWA shell

- `index.html`: mobile-first application entry point
- `styles.css`: smartphone-first responsive layout
- `manifest.webmanifest`: installable PWA metadata
- `service-worker.js`: application-shell caching
- `icon.svg`: PWA icon

Service WorkerはGET対象のapplication shellをcacheします。publication mutationをbackgroundで自動実行しません。

## Offline observation workflow

`offline_store.js`はlocal observation、synchronization queue、retry回数、最終error、remote Canonical Event IDをIndexedDBへ保持します。

`field_app.js`は`local`、`queued`、`syncing`、`sync_failed`、`published`を表示します。接続回復だけでは公開せず、利用者の明示的な同期・公開確認を境界とします。

位置情報、人物名、連絡先、非公開文脈が入力されている場合は、公開キュー追加前に個別確認を要求します。local raw observationと外部公開Canonical Eventは別recordです。

## AI annotation review

`workflow_ui.js`はsource event単位のannotationを読み込み、accept、edit API接続、reject、accepted／edited candidateからのInquiry Draft作成を提供します。

annotation acceptanceはpublication approvalではありません。Draft作成後も別のreviewを必須とします。

## Inquiry Draft and publication

SPAは次の状態遷移を表示・操作します。

```text
draft
  → in_review
  → approved / rejected
```

`approved`以外のDraftはpublication guardによって拒否されます。公開後はCanonical Event ID、source lineage、AI provenance、reviewer、publication metadata、storage／transport resultを表示します。

## v0.7.0 semantic derivation

`derivation_form_model.js`と`derivation_ui.js`は、既存の公開済みinquiryから派生Inquiry Draftを作るmobile-first authoring flowを提供します。

対応relation:

- `derived_from`
- `translated_from`
- `observed_alongside`
- `contrasts_with`
- `synthesizes`
- `reframes`
- `annotates`
- `revises`

relation typeに応じて翻訳言語、観察／文脈note、contrast／reframe rationale、annotation、revision summary、複数source IDなどを入力します。AI relation suggestionは参考情報であり、利用者がrelationを明示確定しなければDraftを作成できません。

### Semantic separation

`genealogy_view_model.js`と`genealogy_view_renderer.js`は次を別概念として表示します。

- Canonical identity
- semantic relation
- context similarity

context similarityは関連候補を示すだけで、identity evidenceとして扱いません。semantic relationもidentity mergeを意味しません。

統合系譜viewではlineage tree、contexts、provenance、AI suggestion、human-confirmed relation、human publication reviewを追跡できます。

## API dependency

### Observation and workflow mutation

- `POST /api/v1/observations`
- `POST /api/v1/ai/annotations/:id/promote`
- `POST /api/v1/inquiries/:id/derive`
- `GET /api/v1/inquiry-drafts/:id`
- `POST /api/v1/inquiry-drafts/:id/submit`
- `POST /api/v1/inquiry-drafts/:id/approve`
- `POST /api/v1/inquiry-drafts/:id/reject`
- `POST /api/v1/inquiry-drafts/:id/publish`
- `GET /api/v1/publications/:id`

### AI inspection and review

- `GET /api/v1/ai/jobs`
- `GET /api/v1/ai/jobs/:id`
- `GET /api/v1/ai/annotations`
- `GET /api/v1/ai/annotations/:id`
- `GET /api/v1/ai/events/:eventId`
- `POST /api/v1/ai/annotations/:id/accept`
- `POST /api/v1/ai/annotations/:id/edit`
- `POST /api/v1/ai/annotations/:id/reject`

### Canonical read views

- `GET /api/v1/inquiries/:id/detail`
- `GET /api/v1/inquiries/:id/tree`
- `GET /api/v1/inquiries/query`

## Local execution

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

`apps/frontend/`を静的HTTP serverで配信し、`/api/v1/*`を同一originのAPIへ到達させます。`file://`で直接開く構成はService Workerとsame-origin APIの検証に適しません。

## Test

```bash
corepack pnpm --filter @toitoi/frontend test
```

workspace全体:

```bash
corepack pnpm test
```

主なfrontend test:

- `test_inquiry_view_model.js`
- `test_lineage_tree_renderer.js`
- `test_context_exploration.js`
- `test_ai_review.js`
- `test_derivation_form_model.js`
- `test_genealogy_view.js`
- `test_v0_3_0_golden_path.js`
- `test_v0_4_0_golden_path.js`
- `test_v0_5_0_golden_path.js`
- `test_v0_6_0_offline_golden_path.js`
- `test_v0_7_0_transport_replay.js`

## UX principles

- 問いを正解や処方として表示しない
- AI出力を公開済みinquiryと混同しない
- AI relation suggestionとhuman confirmationを分離する
- annotation review、relation confirmation、publication reviewを分離する
- raw local observationとpublic Canonical Eventを分離する
- sensitive fieldを公開前に明示確認する
- sync failureとretry状態を隠さない
- transport固有表現を主要UIへ露出しない
- canonical identity、semantic relation、context similarityを分離する
- provenance、lineage、AI関与、人間確認状態を追跡可能にする
- keyboard操作と欠損データへの耐性を維持する

## Limitations

- production authentication、authorization、rate limitingは未実装
- multi-user collaborationとreal-time editingは未実装
- Service Workerによるunattended background publicationは行わない
- browser-level E2Eはreference Golden Path中心で、全browser matrixを保証しない
- semantic search、embeddings、vector search、RAG、graph inferenceは非対象
- large-scale graph visualizationは非対象
- automatic identity mergeは行わない
- AI生成・派生内容の農業上の妥当性は保証しない

## Related documents

- [Standard API](../api/README.md)
- [v0.7.0 Release Plan](../../docs/roadmap/V0.7.0_RELEASE_PLAN.md)
- [v0.7.0 Release Runbook](../../docs/roadmap/V0.7.0_RELEASE_RUNBOOK.md)
- [v0.7.0 GitHub Release Content](../../docs/roadmap/V0.7.0_GITHUB_RELEASE.md)
- [Roadmap to v1.0.0](../../docs/roadmap/V1.0.0_ROADMAP.md)
- [Inquiry Draft Contract](../../docs/protocols/INQUIRY_DRAFT.md)