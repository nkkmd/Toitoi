# Toitoi Standard API

**Status: v0.9.0 implementation baseline** | **Last updated: 2026-07-22**

`apps/api/` は、transport-independentなcanonical read view、検索・Vocabulary、AI inspection／review、Inquiry Draft workflow、semantic derivation、Canonical Event publication、およびv0.9.0の共同運用境界を提供するStandard API reference implementationです。

Canonical storageが正本であり、SQLite FTS5、queue index、metrics、health viewは再構築可能な派生状態です。protocol固有のraw event shapeは利用者向けAPIへ露出しません。

## Main endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | protocol runtimeとstorage selection |
| `GET` | `/health/live` | process liveness |
| `GET` | `/health/ready` | dependency readiness |
| `GET` | `/api/v1/audit` | operator向けaudit inspection |
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

## v0.9.0 operations boundary

実HTTP serverでは`operations_http_boundary.js`が次を担当します。

- actor identityの抽出
- role／capability authorization
- stable JSON error envelope
- request ID
- fixed-window rate limiting
- mutation idempotency
- append-only hash-chained audit record
- liveness／readiness endpoint

ロール:

- `reader`
- `contributor`
- `reviewer`
- `publisher`
- `moderator`
- `operator`

認証強制モード:

```bash
TOITOI_AUTH_REQUIRED=true \
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

参照認証header:

```text
X-Toitoi-Actor-Id: actor-123
X-Toitoi-Roles: contributor,reviewer
Idempotency-Key: mutation-unique-key
```

`Idempotency-Key`は認証強制モードのmutationで必須です。同じactor、operation、key、request digestの再送は保存済み結果を返し、異なるrequestでkeyを再利用すると`idempotency_conflict`になります。

このheader providerはdeterministic reference implementationです。OAuth／OIDC provider certificationはv0.9.0の対象外です。

## Workflow and authority boundaries

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

次は別の判断です。

- annotation acceptance
- relation confirmation
- publication approval
- moderation
- operator authority

検索結果、Vocabulary mapping、AI提案、relation候補はpublication approvalやCanonical identity mergeを意味しません。

## Search and Vocabulary

FTS5 projectionはinquiry／observation text、accepted summary、tag、label、context、relation、transport、provenance、review state、timestampを検索対象にします。

```text
GET /api/v1/search?q=soil+moisture&region=Shikoku&review_state=approved
GET /api/v1/search?soil_type=loam&crop_family=rice&transport=nostr
GET /api/v1/search/contexts?dimension=region
GET /api/v1/vocabulary/terms?scope=local&locality=Shikoku
GET /api/v1/vocabulary/mappings?status=proposed
```

`exact_identity`、`explicit_relation`、`related_candidate`は別分類です。類似性、relation、Vocabulary mappingからCanonical identityを自動統合しません。

## Runtime configuration

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

- `TOITOI_STORAGE_DIR`: canonical append-only storage、replay、workflow publication
- `TOITOI_AI_STORAGE_DIR`: AI job／annotation inspectionとreview mutation
- `TOITOI_SEARCH_INDEX_FILE`: persistent FTS5 projection。省略時は`:memory:`
- `TOITOI_PROTOCOL`: `nostr`、`lingonberry`、`atproto`
- `TOITOI_AUTH_REQUIRED`: `true`でactor認証、権限、mutation idempotencyを強制

multi-transport fan-in read runtime:

```bash
TOITOI_TRANSPORT_SOURCES='[
  {"protocol":"nostr","storageDir":"/path/nostr"},
  {"protocol":"lingonberry","storageDir":"/path/lingonberry"},
  {"protocol":"atproto","storageDir":"/path/atproto"}
]' corepack pnpm --filter @toitoi/api start
```

## Durable operation and conformance

v0.9.0ではAPI外の運用基盤として次を追加しています。

- `packages/operations/durable_queue.js`
- `packages/operations/recovery.js`
- `packages/conformance/cli.js`
- `fixtures/conformance/v0.9.0-transport-round-trips.json`

Conformance Suite:

```bash
corepack pnpm --filter @toitoi/conformance exec \
  toitoi-conformance --input fixtures/conformance/v0.9.0-transport-round-trips.json --pretty
```

## Implementation entry points

- `server_v0_4.js`: integrated HTTP serverとoperations boundary wiring
- `operations_http_boundary.js`: actor、authorization、rate limit、idempotency、audit、health
- `toitoi_api_service.js`: Standard API／search／vocabulary／AI／workflow routing
- `fts5_search_projection.js`: rebuildable SQLite FTS5 projection
- `search_http_service.js`: search／facet routes
- `related_inquiry_http_service.js`: explicit relation優先のrelated inquiry route
- `vocabulary_http_service.js`: Vocabulary term／mapping routes
- `workflow_http_service.js`: observation、promotion、derivation、review、publication
- `canonical_publisher.js`: canonical storageとmulti-transport outbound adapter

## Test

```bash
corepack pnpm --filter @toitoi/api test
corepack pnpm --filter @toitoi/operations test
corepack pnpm --filter @toitoi/conformance test
corepack pnpm test
```

v0.9.0 validation includes authority separation、stable errors、idempotency、rate limiting、audit integrity、health endpoints、durable queue recovery、dead-letter handling、backup verification、migration behavior、Conformance CLI、three-transport semantic fixtures、replay equivalence、およびv0.8.0以前のworkspace regressionです。

## Limitations

- reference authentication is header-based and not OAuth／OIDC certified
- idempotency storeとrate limiterはdeployment-specific durable adapterへ置換可能なreference process components
- durable queueはsingle-node JSONLでありdistributed queueではない
- FTS5はderived lexical／structured projection
- embeddings、vector database、production RAG、graph inferenceは非対象
- automatic identity merge、AI relation自動確定、無人公開は行わない

## Related documents

- [v0.9.0 Release Plan](../../docs/roadmap/V0.9.0_RELEASE_PLAN.md)
- [v0.9.0 Release Runbook](../../docs/roadmap/V0.9.0_RELEASE_RUNBOOK.md)
- [Single-node durability](../../docs/operations/V0.9.0_SINGLE_NODE_DURABILITY.md)
- [Governance](../../docs/governance/TOITOI_GOVERNANCE.md)
- [Roadmap to v1.0.0](../../docs/roadmap/V1.0.0_ROADMAP.md)
- [Canonical Identity and Provenance](../../docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md)
