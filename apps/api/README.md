# Toitoi Standard API

**Status: v0.7.0** | **Last updated: 2026-07-21**

`apps/api/` は、transport-independentなcanonical read view、AI job／annotation inspection、human review mutation、Inquiry Draft workflow、semantic inquiry derivation、Canonical Event publicationを提供するStandard API reference implementationです。

protocol固有のraw event shapeを利用者向けAPIへ露出せず、Nostr、Lingonberry、ATProtoの違いをruntime／storage／converter層へ閉じ込めます。

## Main endpoints

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
| `POST` | `/api/v1/inquiries/:id/derive` | existing inquiryからderived Inquiry Draftを作成 |
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

## Workflow boundary

```text
observation ingest or existing published inquiry
  → AI annotation review or semantic derivation authoring
  → Inquiry Draft
  → draft submission
  → independent human approval
  → publication guard
  → Canonical Event persistence
  → multi-transport outbound delivery
```

## v0.7.0 derivation mutation

`POST /api/v1/inquiries/:id/derive`は、pathのinquiryをsourceとして新しいInquiry Draftを作成します。これはpublicationではありません。

Example:

```json
{
  "relationType": "contrasts_with",
  "relationConfirmedByHuman": true,
  "relationDetails": {
    "rationale": "Different soil moisture response"
  },
  "text": "Why did the same crop respond differently in the drier plot?",
  "language": "en",
  "authorId": "human:field-worker",
  "aiSuggestion": {
    "suggestedRelationType": "reframes",
    "model": "deterministic"
  }
}
```

Supported relation types:

- `derived_from`
- `translated_from`
- `observed_alongside`
- `contrasts_with`
- `synthesizes`
- `reframes`
- `annotates`
- `revises`

### Validation and review boundary

- relation typeごとのrequired fieldをstrictに検証する
- `relationConfirmedByHuman`が`true`でなければDraftを作成しない
- AI suggestionはselected／confirmed relationとは別metadataとして保持する
- `synthesizes`は2件以上のdistinct source inquiry IDを要求する
- 作成後も`draft → in_review → approved`を通過する
- relation confirmationはpublication approvalではない

### Semantic boundary

Canonical identity、semantic relation、context similarityは別契約です。

- sourceとderived eventは別Canonical Event IDを持つ
- semantic relationはlineage edgeとして保持する
- context similarityだけでidentity mergeしない
- AI suggestionだけでrelationを確定しない

## Observation and annotation workflow

`POST /api/v1/observations`はraw observationをpublic inquiryとして扱いません。SPAのIndexedDB record、workflow observation、公開済みCanonical Eventは別recordです。

`POST /api/v1/ai/annotations/:id/promote`は、human-reviewed `generate_inquiries` candidateのみをInquiry Draftへ変換します。annotation acceptanceはpublication approvalではありません。

## Inquiry Draft and publication

```text
draft
  → in_review
  → approved / rejected
```

`approved`以外のDraftに対するpublish requestは拒否されます。publication runtimeはsource lineage、semantic derivation、AI involvement、human review、storage ID、delivered／skipped／quarantined transport resultを保持します。

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

## Context and lineage read contract

`GET /api/v1/inquiries/query`は`climate_zone`、`soil_type`、`farming_context`、`crop_family`等をAND条件で処理します。context similarityはcanonical identity mergeを意味しません。

`GET /api/v1/inquiries/:id/tree`はtransport projection／re-ingest／replay後もsemantic lineageを復元するためのread boundaryです。

## Implementation entry points

- `server_v0_4.js`: integrated HTTP server
- `toitoi_api_service.js`: Standard API／AI／workflow routing
- `standard_api_service.js`: canonical read routing
- `ai_http_service.js`: AI inspection／review mutation routes
- `workflow_http_service.js`: observation、promotion、derivation、Draft review、publication routes
- `canonical_publisher.js`: canonical storageとmulti-transport outbound adapter
- `packages/protocol/derived_inquiry.js`: relation vocabulary、validation、derived Draft contract
- `packages/protocol/inquiry_draft.js`: Draft state transitionとpublication guard

## Test

```bash
corepack pnpm --filter @toitoi/api test
corepack pnpm test
```

v0.7.0 validation includes:

- all eight relation types
- relation-specific rejection
- `POST /api/v1/inquiries/:id/derive`
- AI suggestion and human confirmation separation
- existing Draft publication guard
- transport round trip and replay lineage recovery
- v0.6.0 and earlier regressions

## Limitations

- authentication、authorization、rate limitingは未実装
- workflow mutationはreference contractでありproduction access controlを備えない
- workflow Draft／publication lookupのproduction-grade shared databaseは未実装
- live external transport availabilityはdeterministic CIの保証範囲外
- semantic search、embeddings、vector database、RAG、graph inferenceは非対象
- automatic identity mergeは行わない
- AI relation自動確定と無人公開は非対応

## Related documents

- [Frontend SPA/PWA](../frontend/README.md)
- [v0.7.0 Release Plan](../../docs/roadmap/V0.7.0_RELEASE_PLAN.md)
- [v0.7.0 Release Runbook](../../docs/roadmap/V0.7.0_RELEASE_RUNBOOK.md)
- [v0.7.0 GitHub Release Content](../../docs/roadmap/V0.7.0_GITHUB_RELEASE.md)
- [Roadmap to v1.0.0](../../docs/roadmap/V1.0.0_ROADMAP.md)
- [Canonical Identity and Provenance](../../docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md)