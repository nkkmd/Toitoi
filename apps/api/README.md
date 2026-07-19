# Toitoi Standard API

**Status: v0.5.0** | **Last updated: 2026-07-19**

`apps/api/` は、protocol固有のraw eventやstorage indexを直接公開せず、transport-independentなcanonical viewと、Canonical Eventから分離されたAI job／annotation viewを返すStandard API reference implementationです。

## 主なendpoint

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | runtimeとstorage selectionの確認 |
| `GET` | `/api/v1/protocols` | protocol registryとcapability一覧 |
| `GET` | `/api/v1/protocols/:protocol` | protocol metadataとstorage対応状況 |
| `GET` | `/api/v1/inquiries` | canonical inquiry一覧 |
| `GET` | `/api/v1/inquiries/query` | text / type / context条件による探索 |
| `GET` | `/api/v1/inquiries/relation` | relationship termによる探索 |
| `GET` | `/api/v1/inquiries/:id` | 単一canonical event |
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

## AI inspection and review contract

`TOITOI_AI_STORAGE_DIR`が設定されている場合、append-only JSONL storeからjobとannotationを読み取ります。review serviceが接続されているruntimeでは、accept／edit／reject mutationも同じappend-only storeへ記録されます。

```bash
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_STORAGE_DIR=/path/to/storage \
corepack pnpm --filter @toitoi/api start
```

利用可能なfilter:

- jobs: `state`, `event_id`
- annotations: `event_id`, `task`, `review_state`

review mutation bodyの主要field:

```json
{
  "reviewedBy": "human:reviewer-id",
  "note": "確認内容"
}
```

`edit`では、annotation taskのschemaを満たす`output`も必要です。

AI annotationはCanonical Eventとは別契約です。

- workerは`unreviewed` annotationを生成する
- malformed outputはannotation保存前に拒否する
- `unreviewed`／`rejected` annotationはpromotionできない
- `accepted`／`edited`はInquiry Draft作成を許可するだけである
- publicationには別の`draft → in_review → approved` reviewが必要である

## v0.5.0 inquiry generation

`generate_inquiries` taskは一つのobservationから複数の問い候補を生成します。各候補は次を保持します。

- `inquiry`
- `context`
- `observation`
- `relationship`
- `uncertainty`
- `tags`
- `source_refs`

provenanceにはmodel、model version、prompt version、raw output、created time、generated timeを保持します。

production inferenceにはllama.cppのOpenAI互換endpointを利用できます。default CIはnetwork-freeなdeterministic providerを使用します。

## Context exploration contract

`GET /api/v1/inquiries/query`では次のcontext条件を利用できます。

- `climate_zone`
- `soil_type`
- `farming_context`
- `crop_family`

複数条件はANDとして処理されます。

- 認識できない条件だけのqueryは`400`
- 有効な条件で一致がない場合は`200`と空の`results`
- context similarityはcanonical identity mergeを意味しない

## Canonical view

APIレスポンスは必要に応じて`body`、`labels`、`contexts`、`relationships`、`lineage`、`meta`、`identity`、`provenance`、`rawRef`などを含みます。

APIはbodyの類似、label一致、時刻の近さだけではeventをmergeしません。曖昧な関連はrelationshipまたはlineageとして表現します。

## Runtime selection

単一transport:

```bash
TOITOI_PROTOCOL=nostr \
TOITOI_STORAGE_DIR=/path/to/storage \
corepack pnpm --filter @toitoi/api start
```

`TOITOI_PROTOCOL`は`nostr`、`atproto`、`lingonberry`を選択できます。環境変数によるselectionはruntime、storage、replayへ一貫して伝播します。

multi-transport fan-in:

```bash
TOITOI_TRANSPORT_SOURCES='[
  {"protocol":"nostr","storageDir":"/path/nostr"},
  {"protocol":"lingonberry","storageDir":"/path/lingonberry"},
  {"protocol":"atproto","storageDir":"/path/atproto"}
]' corepack pnpm --filter @toitoi/api start
```

選択優先順位:

1. `TOITOI_TRANSPORT_SOURCES`
2. `TOITOI_PROTOCOL`
3. default `nostr`

## Implementation entry points

- `server_v0_4.js`: current HTTP entrypoint（名称は互換性維持のため継続）
- `toitoi_api_service.js`: Standard APIとAI routingの統合
- `ai_http_service.js`: AI inspection／review mutation routes
- `standard_api_service.js`: canonical routing and response projection
- `test_ai_http_service.js`: AI HTTP contract tests
- `packages/ai/review_service.js`: append-only accept／edit／reject service
- `packages/ai/llama_cpp_provider.js`: llama.cpp OpenAI-compatible provider
- `packages/<protocol>/storage/indexer.js`: lookup / list / search / lineage index
- `packages/<protocol>/storage/standard_api_views.js`: canonical projection
- `packages/<protocol>/storage/replay.js`: persisted storage replay

## Test

```bash
corepack pnpm --filter @toitoi/api test
```

workspace全体:

```bash
corepack pnpm test
```

Default CIにはAPI contracts、AI inspection／review routes、`TOITOI_PROTOCOL` selection、v0.3.0〜v0.5.0 Golden Pathsが含まれます。

## Limitations

- authentication / authorization / rate limitingは未実装
- review APIはreference contractであり、production access controlを備えない
- AI job queueはlocal single-processでありdistributed queueではない
- 全文検索はtoken containmentベースの最小実装
- live llama.cpp validationはopt-in
- embeddings、vector database、RAG、graph inferenceは非対象
- live external relay / carrier availabilityはdeterministic CIの保証範囲外
- AIによる無人公開は非対応

## Related documents

- [Frontend](../frontend/README.md)
- [v0.5.0 Release Plan](../../docs/roadmap/V0.5.0_RELEASE_PLAN.md)
- [v0.5.0 Release Runbook](../../docs/roadmap/V0.5.0_RELEASE_RUNBOOK.md)
- [v0.5.0 GitHub Release Content](../../docs/roadmap/V0.5.0_GITHUB_RELEASE.md)
- [AI Adoption Roadmap](../../docs/roadmap/AI_ADOPTION_ROADMAP.md)
- [Canonical Identity and Provenance](../../docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md)
