# Toitoi Standard API

**Status: v0.6.0** | **Last updated: 2026-07-20**

`apps/api/` は、transport-independentなcanonical read view、AI job／annotation inspection、human review mutation、Inquiry Draft workflow、Canonical Event publicationを提供するStandard API reference implementationです。

protocol固有のraw event shapeを利用者向けAPIへ露出せず、Nostr、Lingonberry、ATProtoの違いをruntime／storage／converter層へ閉じ込めます。

## 主なendpoint

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | runtimeとstorage selectionの確認 |
| `GET` | `/api/v1/protocols` | protocol registryとcapability一覧 |
| `GET` | `/api/v1/protocols/:protocol` | protocol metadataとstorage対応状況 |
| `GET` | `/api/v1/inquiries` | canonical inquiry一覧 |
| `GET` | `/api/v1/inquiries/query` | text／type／context条件による探索 |
| `GET` | `/api/v1/inquiries/relation` | relationship termによる探索 |
| `GET` | `/api/v1/inquiries/:id` | 単一Canonical Event |
| `GET` | `/api/v1/inquiries/:id/detail` | provenance、parent、childを含む詳細 |
| `GET` | `/api/v1/inquiries/:id/tree` | descendant lineage tree |
| `GET` | `/api/v1/ai/jobs` | AI job一覧と状態確認 |
| `GET` | `/api/v1/ai/jobs/:id` | 単一AI jobの確認 |
| `GET` | `/api/v1/ai/annotations` | AI annotation一覧とfilter |
| `GET` | `/api/v1/ai/annotations/:id` | 単一AI annotationの確認 |
| `GET` | `/api/v1/ai/events/:eventId` | source event単位のAI inspection view |
| `POST` | `/api/v1/ai/annotations/:id/accept` | annotationを人間がaccept |
| `POST` | `/api/v1/ai/annotations/:id/edit` | 修正済みoutputでannotationをaccept |
| `POST` | `/api/v1/ai/annotations/:id/reject` | annotationを人間がreject |
| `POST` | `/api/v1/observations` | private／local observationをworkflowへ保存 |
| `POST` | `/api/v1/ai/annotations/:id/promote` | accepted／edited candidateをInquiry Draftへ昇格 |
| `GET` | `/api/v1/inquiry-drafts/:id` | Inquiry Draft状態を取得 |
| `POST` | `/api/v1/inquiry-drafts/:id/submit` | Draftをreviewへ提出 |
| `POST` | `/api/v1/inquiry-drafts/:id/approve` | Draftを人間が承認 |
| `POST` | `/api/v1/inquiry-drafts/:id/reject` | Draftを人間が却下 |
| `POST` | `/api/v1/inquiry-drafts/:id/publish` | approved DraftをCanonical Eventとして公開 |
| `GET` | `/api/v1/publications/:id` | publication結果を取得 |

## v0.6.0 workflow boundary

```text
observation ingest
  → AI annotation inspection / review
  → accepted or edited annotation
  → Inquiry Draft promotion
  → draft submission
  → independent human approval
  → publication guard
  → Canonical Event persistence
  → multi-transport outbound delivery
```

### Observation

`POST /api/v1/observations`はraw observationをpublic inquiryとして扱いません。初期状態では次のmetadataを保持します。

```json
{
  "meta": {
    "visibility": "private",
    "localOnly": true,
    "sensitive": {}
  }
}
```

SPAのIndexedDB recordはlocal application stateであり、このAPIが返すworkflow observationとも、公開済みCanonical Eventとも区別されます。

### Annotation promotion

`POST /api/v1/ai/annotations/:id/promote`は`generate_inquiries` annotationのselected candidateをInquiry Draftへ変換します。

- `unreviewed`／`rejected` annotationはpromotionできない
- `accepted`／`edited` annotationのみ利用できる
- source event、annotation ID、model、model version、prompt version、review stateをprovenanceとして保持する
- promotionはpublication approvalではない

### Inquiry Draft review

既存protocol contractの状態遷移を利用します。

```text
draft
  → in_review
  → approved / rejected
```

`approved`以外のDraftに対するpublish requestは拒否されます。annotation reviewerとpublication reviewerは別の監査境界です。

### Canonical publication

publication runtimeは次を実行します。

1. approved DraftからCanonical Eventを構築
2. source lineage、AI involvement、human reviewをmetadataへ保持
3. existing multi-transport outbound runtimeでfan-out planを作成・実行
4. selected protocolのappend-only storageへcanonical recordを保存
5. delivered／skipped／quarantined transport結果とstorage IDをpublication provenanceへ保持

transport delivery failureを隠さず、Canonical Eventの承認事実と外部transportの配信結果を区別します。

## Runtime configuration

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

- `TOITOI_STORAGE_DIR`: canonical append-only storage、replay、workflow publicationを有効化
- `TOITOI_AI_STORAGE_DIR`: AI job／annotation inspectionとreview mutationを有効化
- `TOITOI_PROTOCOL`: `nostr`、`lingonberry`、`atproto`からsingle runtimeを選択

multi-transport fan-in read runtime:

```bash
TOITOI_TRANSPORT_SOURCES='[
  {"protocol":"nostr","storageDir":"/path/nostr"},
  {"protocol":"lingonberry","storageDir":"/path/lingonberry"},
  {"protocol":"atproto","storageDir":"/path/atproto"}
]' corepack pnpm --filter @toitoi/api start
```

outbound transport credentialsやhandlersが利用できない場合、その結果は`skipped`または`quarantined`としてpublication metadataへ残ります。

## AI inspection and review contract

review mutation body:

```json
{
  "reviewedBy": "human:reviewer-id",
  "note": "確認内容"
}
```

`edit`ではannotation task schemaを満たす`output`も必要です。AI annotationはCanonical Eventとは別契約であり、AI outputを農業上の正解として保証しません。

## Context exploration contract

`GET /api/v1/inquiries/query`で利用可能な代表的context条件:

- `climate_zone`
- `soil_type`
- `farming_context`
- `crop_family`

複数条件はANDとして処理されます。context similarityはcanonical identity mergeを意味しません。

## HTTP server behavior

`server_v0_4.js`は互換性のため名称を維持していますが、v0.6.0ではintegrated API entrypointとして次を組み立てます。

- protocol runtime
- protocol storage runtime
- canonical Standard API service
- AI inspection／review service
- workflow mutation service
- canonical publisher adapter

POST bodyをJSONとして読み取り、同期read serviceと非同期workflow mutationの双方を扱います。

## Implementation entry points

- `server_v0_4.js`: integrated HTTP server
- `toitoi_api_service.js`: Standard API／AI／workflow routing
- `standard_api_service.js`: canonical read routing
- `ai_http_service.js`: AI inspection／review mutation routes
- `workflow_http_service.js`: observation、promotion、Draft review、publication routes
- `canonical_publisher.js`: canonical storageとmulti-transport outbound adapter
- `packages/ai/review_service.js`: append-only annotation review
- `packages/ai/promotion_service.js`: selected candidate promotion
- `packages/protocol/inquiry_draft.js`: Draft state transitionとpublication guard
- `packages/protocol/multi_transport_delivery.js`: outbound delivery execution
- `packages/<protocol>/storage/persistence.js`: append-only canonical persistence

## Test

API package:

```bash
corepack pnpm --filter @toitoi/api test
```

workspace全体:

```bash
corepack pnpm test
```

v0.6.0で追加された主要検証:

- workflow HTTP mutation contract
- draft／in_review／approved／rejected transition
- unapproved publication rejection
- canonical publisher adapter
- append-only canonical storage record
- multi-transport delivered／skipped／quarantined result
- v0.3.0〜v0.5.0 Golden Path regression
- frontend offline retry Golden Path

## Limitations

- authentication、authorization、rate limitingは未実装
- workflow mutationはreference contractでありproduction access controlを備えない
- AI queueはlocal single-processでありdistributed queueではない
- workflow Draft／publication lookupのproduction-grade shared databaseは未実装
- live external transport availabilityはdeterministic CIの保証範囲外
- embeddings、vector database、RAG、graph inference、semantic identity mergeは非対象
- AIによる無人公開は非対応

## Related documents

- [Frontend SPA/PWA](../frontend/README.md)
- [v0.6.0 Release Plan](../../docs/roadmap/V0.6.0_RELEASE_PLAN.md)
- [v0.6.0 Release Runbook](../../docs/roadmap/V0.6.0_RELEASE_RUNBOOK.md)
- [v0.6.0 GitHub Release Content](../../docs/roadmap/V0.6.0_GITHUB_RELEASE.md)
- [Roadmap to v1.0.0](../../docs/roadmap/V1.0.0_ROADMAP.md)
- [Canonical Identity and Provenance](../../docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md)
