# Toitoi Standard API

**Status: v0.8.0 released** | **Last updated: 2026-07-22**

`apps/api/` は、transport-independentなcanonical read view、検索・文脈探索、Vocabulary、AI inspection／review、Inquiry Draft workflow、semantic derivation、Canonical Event publicationを提供するStandard API reference implementationです。

protocol固有のraw event shapeを利用者向けAPIへ露出せず、Nostr、Lingonberry、ATProtoの違いをruntime／storage／converter層へ閉じ込めます。Canonical storageが正本であり、SQLite FTS5は再構築可能な派生projectionです。

## Main endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | runtimeとstorage selectionの確認 |
| `GET` | `/api/v1/protocols` | protocol registryとcapability一覧 |
| `GET` | `/api/v1/inquiries` | canonical inquiry一覧 |
| `GET` | `/api/v1/inquiries/:id` | 単一Canonical Event |
| `GET` | `/api/v1/inquiries/:id/detail` | provenance、parent、childを含む詳細 |
| `GET` | `/api/v1/inquiries/:id/tree` | descendant lineage tree |
| `GET` | `/api/v1/search` | FTS5 lexical searchとstructured filter |
| `GET` | `/api/v1/search/contexts` | context／transport／review facet |
| `GET` | `/api/v1/inquiries/:id/related` | explicit relation優先の関連inquiry |
| `GET` | `/api/v1/vocabulary/terms` | Core／Domain／Local Vocabulary term一覧 |
| `GET` | `/api/v1/vocabulary/mappings` | vocabulary mapping claim一覧 |
| `POST` | `/api/v1/inquiries/:id/derive` | existing inquiryからderived Inquiry Draftを作成 |
| `POST` | `/api/v1/observations` | private／local observationをworkflowへ保存 |
| `POST` | `/api/v1/ai/annotations/:id/promote` | reviewed candidateをInquiry Draftへ昇格 |
| `GET` | `/api/v1/inquiry-drafts/:id` | Inquiry Draft状態を取得 |
| `POST` | `/api/v1/inquiry-drafts/:id/submit` | Draftをreviewへ提出 |
| `POST` | `/api/v1/inquiry-drafts/:id/approve` | Draftを人間が承認 |
| `POST` | `/api/v1/inquiry-drafts/:id/reject` | Draftを人間が却下 |
| `POST` | `/api/v1/inquiry-drafts/:id/publish` | approved DraftをCanonical Eventとして公開 |
| `GET` | `/api/v1/publications/:id` | publication結果を取得 |

## v0.8.0 search projection

`fts5_search_projection.js`はCanonical Eventを次の検索documentへ投影します。

- canonical ID
- event type
- inquiry／observation text
- accepted summary
- tags／labels
- context keys／values
- relation types／targets
- transport／provenance
- review state
- creation timestamp

対象例:

```text
GET /api/v1/search?q=soil+moisture&region=Shikoku&review_state=approved
GET /api/v1/search?soil_type=loam&crop_family=rice&transport=nostr
GET /api/v1/search/contexts?dimension=region
```

検索結果は`related_candidate`として返され、関連inquiry APIでは次の順序を維持します。

```text
explicit_relation
  → related_candidate
```

`exact_identity`、`explicit_relation`、`related_candidate`は別分類です。`identityMerged`は`false`であり、類似性やrelationを根拠にCanonical identityを統合しません。

Canonical `provenance.sources[]`のprotocol／source identifierと、`meta.publication.humanReview.decision`のreview stateを検索projectionへ取り込みます。関連inquiry APIはoutgoing relationに加えてincoming lineage childもexplicit relationとして返します。

## Vocabulary API

Vocabulary termは`core`、`domain`、`local`のscopeを持ちます。APIでは互換性のため`layer` queryも受け付けます。

```text
GET /api/v1/vocabulary/terms?scope=local&locality=Shikoku
GET /api/v1/vocabulary/terms?layer=domain&language=ja
GET /api/v1/vocabulary/mappings?status=proposed
```

Mapping claimはsource／target termを別identifierとして保持し、relation、locality、provenance、review state、人間確認状態を失いません。MappingはCanonical Event identityを生成しません。

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

検索、Vocabulary、AI annotation acceptance、relation confirmationはいずれもpublication approvalではありません。

## Runtime configuration

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

- `TOITOI_STORAGE_DIR`: canonical append-only storage、replay、workflow publicationを有効化
- `TOITOI_AI_STORAGE_DIR`: AI job／annotation inspectionとreview mutationを有効化
- `TOITOI_SEARCH_INDEX_FILE`: persistent FTS5 projection。省略時は`:memory:`
- `TOITOI_PROTOCOL`: `nostr`、`lingonberry`、`atproto`からruntimeを選択

multi-transport fan-in read runtime:

```bash
TOITOI_TRANSPORT_SOURCES='[
  {"protocol":"nostr","storageDir":"/path/nostr"},
  {"protocol":"lingonberry","storageDir":"/path/lingonberry"},
  {"protocol":"atproto","storageDir":"/path/atproto"}
]' corepack pnpm --filter @toitoi/api start
```

## Implementation entry points

- `server_v0_4.js`: integrated HTTP serverとsearch／vocabulary runtime wiring
- `toitoi_api_service.js`: Standard API／search／vocabulary／AI／workflow routing
- `fts5_search_projection.js`: rebuildable SQLite FTS5 projection
- `search_http_service.js`: search／facet routes
- `related_inquiry_http_service.js`: explicit relation優先のrelated inquiry route
- `search_result_classifier.js`: match classification boundary
- `vocabulary_http_service.js`: Vocabulary term／mapping routes
- `standard_api_service.js`: canonical read routing
- `workflow_http_service.js`: observation、promotion、derivation、review、publication
- `canonical_publisher.js`: canonical storageとmulti-transport outbound adapter
- `packages/protocol/vocabulary.js`: Vocabulary／mapping claim contract

## Test

```bash
corepack pnpm --filter @toitoi/api test
corepack pnpm test
```

v0.8.0 validation includes:

- FTS5 projection、lexical search、filter、facet、upsert
- canonical provenance-source indexingとpublication review-state indexing
- search HTTP routingとresult classification
- fixed reference ranking/filter dataset
- Vocabulary contractとHTTP endpoint
- outgoing relationとincoming lineage childを含むrelated inquiry
- replay前後のsearch result／facet同値性
- v0.7.0以前のworkspace regression
- final pre-merge GitHub Actions run #654

## Limitations

- authentication、authorization、rate limitingは未実装
- workflow mutationはproduction access controlを備えないreference contract
- FTS5はderived projectionであり、canonical persistence authorityではない
- embeddings、vector database、production RAG、graph inferenceは非対象
- automatic identity mergeは行わない
- AI relation自動確定と無人公開は非対応

## Related documents

- [Frontend SPA/PWA](../frontend/README.md)
- [v0.8.0 Release Plan](../../docs/roadmap/V0.8.0_RELEASE_PLAN.md)
- [v0.8.0 Release Runbook](../../docs/roadmap/V0.8.0_RELEASE_RUNBOOK.md)
- [v0.8.0 GitHub Release Content](../../docs/roadmap/V0.8.0_GITHUB_RELEASE.md)
- [Roadmap to v1.0.0](../../docs/roadmap/V1.0.0_ROADMAP.md)
- [Canonical Identity and Provenance](../../docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md)
