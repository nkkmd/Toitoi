# Toitoi Standard API

**Status: v0.3.0 release candidate** | **Last updated: 2026-07-15**

`apps/api/` は、protocol固有のraw eventやstorage indexを直接公開せず、transport-independentなcanonical viewを返すStandard API reference implementationです。

## v0.3.0で利用する主なendpoint

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

## Context exploration contract

`GET /api/v1/inquiries/query`では、v0.3.0のfrontendが次のcontext条件を利用します。

- `climate_zone`
- `soil_type`
- `farming_context`
- `crop_family`

複数のcontext条件はANDとして処理されます。

- 認識できない条件だけのqueryは`400`
- 有効な条件で一致がない場合は`200`と空の`results`
- context similarityはcanonical identity mergeを意味しない

例:

```http
GET /api/v1/inquiries/query?climate_zone=cool-temperate&farming_context=field-observation
```

## Canonical view

APIレスポンスは必要に応じて次を含みます。

- `id`
- `schemaVersion`
- `type`
- `createdAt`
- `body`
- `labels`
- `contexts`
- `relationships`
- `phase`
- `trigger`
- `lineage`
- `dsl`
- `meta`
- `identity`
- `provenance`
- `rawRef`
- `identityClaims`

`provenance`は通常、次のsummaryです。

```json
{
  "sourceCount": 1,
  "sourceProtocols": ["nostr"],
  "sourceIds": ["<transport source id>"],
  "rawRef": null
}
```

APIはbodyの類似、label一致、時刻の近さだけではeventをmergeしません。曖昧な関連はrelationshipまたはlineageとして表現します。

## Detail response

```json
{
  "event": { "...": "canonical view" },
  "references": {
    "parents": [],
    "children": [],
    "relationships": []
  }
}
```

## Lineage response

`GET /api/v1/inquiries/:id/tree`は指定eventをrootとしてdescendant treeを返します。各nodeにはcanonical event fieldsに加えて、index projectionの`parent_id`と`children`が含まれます。

frontendはlineage edgeのtargetをcanonical IDだけでなく、parent provenanceに含まれるtransport source IDとも照合します。これによりNostr再取り込み後も`translated_from`などのrelation typeを表示できます。

## Runtime selection

単一transport:

```bash
TOITOI_PROTOCOL=nostr \
TOITOI_STORAGE_DIR=/path/to/storage \
corepack pnpm --filter @toitoi/api start
```

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

- `server.js`: HTTP entrypoint
- `standard_api_service.js`: routing and response projection
- `test_standard_api_service.js`: API contract tests
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

Default CIにはAPI contractsに加えて、frontend lineage、context exploration、reviewed derivation、Nostr再取り込みまでを含むv0.3.0 Golden Pathが含まれます。

## Limitations

- authentication / authorization / rate limitingは未実装
- 全文検索はtoken containmentベースの最小実装
- embeddings必須のsemantic searchとgraph inferenceは非対象
- live external relay / carrier availabilityはdeterministic CIの保証範囲外

## Related documents

- [Frontend](../frontend/README.md)
- [v0.3.0 User Journey](../frontend/V0.3.0_USER_JOURNEY.md)
- [v0.3.0 Release Plan](../../docs/roadmap/V0.3.0_RELEASE_PLAN.md)
- [v0.3.0 Release Runbook](../../docs/roadmap/V0.3.0_RELEASE_RUNBOOK.md)
- [Canonical Identity and Provenance](../../docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md)
