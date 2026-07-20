# Toitoi Frontend

**Status: v0.6.0** | **Last updated: 2026-07-20**

`apps/frontend/` は、ToitoiのStandard APIを利用するmobile-first SPA／PWA reference implementationです。transport固有eventを直接扱わず、観察のローカル保存、明示的同期、AI問い候補レビュー、Inquiry Draft review、Canonical Event publicationまでを一つの利用体験として接続します。

## v0.6.0で実装した範囲

```text
field observation
  → IndexedDB local persistence
  → durable explicit sync queue
  → Standard API observation ingest
  → AI annotation review
  → Inquiry Draft promotion
  → independent publication review
  → approved Canonical Event publication
  → provenance / lineage / delivery result
```

### SPA／PWA shell

- `index.html`: mobile-first application entry point
- `styles.css`: smartphone-first responsive layout
- `manifest.webmanifest`: installable PWA metadata
- `service-worker.js`: application-shell caching
- `icon.svg`: PWA icon

Service WorkerはGET対象のapplication shellをcacheします。publication mutationをbackgroundで自動実行しません。

### オフライン観察保存

`offline_store.js`はIndexedDBに次を保持します。

- local observation
- synchronization queue item
- retry回数
- 最終error
- remote Canonical Event ID

`field_app.js`は次の状態を扱います。

- `local`
- `queued`
- `syncing`
- `sync_failed`
- `published`

接続回復だけでは公開せず、利用者の明示的な同期・公開確認を境界とします。

### privacy boundary

次のfieldが入力されている場合、公開キュー追加前に個別確認を要求します。

- `location`
- `person_names`
- `contact`
- `private_context`

local raw observationと外部公開Canonical Eventは別recordとして扱います。非公開情報を自動的にCanonical Eventへ含めません。

### AI annotation review

`workflow_ui.js`はsource event単位のannotationを読み込み、次の操作を提供します。

- accept
- edit APIへの接続
- reject
- accepted／edited annotationからInquiry Draft作成

annotation acceptanceはpublication approvalではありません。Draft作成後も別のreviewを必須とします。

### Inquiry Draft and publication

SPAは次の状態遷移を表示・操作します。

```text
draft
  → in_review
  → approved / rejected
```

`approved`以外のDraftはpublication guardによって拒否されます。公開後は次を表示します。

- Canonical Event ID
- inquiry body
- source lineage
- AI promotion provenance
- reviewerとreview日時
- publication metadata
- storage／transport delivery result

## API dependency

### Observation and workflow mutation

- `POST /api/v1/observations`
- `POST /api/v1/ai/annotations/:id/promote`
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

API runtime:

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

`apps/frontend/`を静的HTTP serverで配信し、`/api/v1/*`を同一originのAPIへ到達させます。`file://`で直接開く構成はService Workerとsame-origin APIの検証に適しません。

## Golden Paths

### v0.3.0

`test_v0_3_0_golden_path.js`はdetail、lineage、context exploration、derived draft、human approval、transport projection、re-ingest、replayを検証します。

### v0.4.0

`test_v0_4_0_golden_path.js`は非同期AI annotation、human acceptance、Draft promotion、publication guardを検証します。

### v0.5.0

`test_v0_5_0_golden_path.js`は複数の問い候補生成、review mutation、selected candidate promotion、AI provenanceを検証します。

### v0.6.0

`test_v0_6_0_offline_golden_path.js`は次を検証します。

1. observationをofflineで保存する
2. sensitive fieldの未確認publicationを拒否する
3. durable queueへ追加する
4. offline中はqueueを保持する
5. temporary failureを可視化する
6. retry後に同期する
7. remote Canonical Event IDを保持する
8. queueから完了itemを除去する

API側のworkflow testはDraft state transition、publication guard、canonical storage、multi-transport deliveryを検証します。

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
- `test_v0_3_0_golden_path.js`
- `test_v0_4_0_golden_path.js`
- `test_v0_5_0_golden_path.js`
- `test_v0_6_0_offline_golden_path.js`

## UX原則

- 問いを正解や処方として表示しない
- AI出力を公開済みinquiryと混同しない
- annotation reviewとpublication reviewを分離する
- raw local observationとpublic Canonical Eventを分離する
- sensitive fieldを公開前に明示確認する
- sync failureとretry状態を隠さない
- transport固有表現を主要UIへ露出しない
- provenance、lineage、AI関与、人間確認状態を追跡可能にする
- keyboard操作と欠損データへの耐性を維持する

## Limitations

- production authentication、authorization、rate limitingは未実装
- multi-user collaborationとreal-time editingは未実装
- Service Workerによるunattended background publicationは行わない
- browser-level E2Eは最小Golden Path中心で、全browser matrixを保証しない
- relation type自由編集、大規模graph UI、semantic searchは後続releaseの対象
- embeddings、vector search、RAG、graph inferenceは非対象
- AI生成内容の農業上の妥当性は保証しない

## 関連文書

- [Standard API](../api/README.md)
- [v0.6.0 Release Plan](../../docs/roadmap/V0.6.0_RELEASE_PLAN.md)
- [v0.6.0 Release Runbook](../../docs/roadmap/V0.6.0_RELEASE_RUNBOOK.md)
- [v0.6.0 GitHub Release Content](../../docs/roadmap/V0.6.0_GITHUB_RELEASE.md)
- [Roadmap to v1.0.0](../../docs/roadmap/V1.0.0_ROADMAP.md)
- [Inquiry Draft Contract](../../docs/protocols/INQUIRY_DRAFT.md)
