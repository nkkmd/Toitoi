# Standard API

**Version: 0.3.3** | **Status: evolving** | **Last updated: 2026-06-04**

`apps/api/` は、Toitoi の Standard API reference implementation です。

Canonical Event と derived index をそのまま外に出すのではなく、薄い service layer を経由して canonical view を返します。  
この README は、API 利用者向けの単一の入口として、従来の詳細仕様を吸収しています。

Phase 13 以降の前提として、API は Nostr と ATProto を現在の対象 transport としつつ、将来の protocol 追加にも耐える canonical view を返します。  
同一性は「明示的に同一といえる場合」にだけ merge し、曖昧な case は別 event のまま返します。

このリポジトリをまだ取っていない場合は、先に `git clone` してから読んでもらうのがいちばん自然です。

## 全体像

```text
storage snapshot
      |
      v
server.js
      |
      v
standard_api_service.js
      |
      v
HTTP response
```

## まず見るもの

- API の使い方: このファイル
- HTTP エントリポイント: [server.js](./server.js)
- ルーティングと view 投影: [standard_api_service.js](./standard_api_service.js)
- テスト: [test_standard_api_service.js](./test_standard_api_service.js)
- データの元: protocol ごとの `storage/` replay module

## 呼び出し関係

- `server.js` が `standard_api_service.js` を呼びます
- `server.js` が protocol に応じた `storage/replay.js` を使って storage snapshot を読みます
- `standard_api_service.js` が protocol に応じた `storage/indexer.js` と `storage/standard_api_views.js` を使います
- `test_standard_api_service.js` が service layer の契約を確認します
- `infra/transports/nostr/test_operational_e2e.js` が API 層との通し確認で参照します

## どこで使うか

- HTTP API を外に公開するとき
- replay 由来の snapshot を API に載せたいとき
- canonical view の契約を確認したいとき
- Nostr の storage / replay から入る場合は [docs/operations/NOSTR_STORAGE_AND_REPLAY.md](../../docs/operations/NOSTR_STORAGE_AND_REPLAY.md) を先に読むと流れがつかみやすい
- ATProto の storage / replay から入る場合は [docs/operations/ATPROTO_STORAGE_AND_REPLAY.md](../../docs/operations/ATPROTO_STORAGE_AND_REPLAY.md) を先に読むと流れがつかみやすい

## pnpm 入口

- 起動: `TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start`
- protocol 選択: `TOITOI_PROTOCOL=atproto TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start`
- multi-transport fan-in: `TOITOI_TRANSPORT_SOURCES='[{"protocol":"nostr","storageDir":"/path/a"},{"protocol":"atproto","storageDir":"/path/b"}]' pnpm --filter @toitoi/api start`
- テスト: `pnpm --filter @toitoi/api test`
- 参照実装: `@toitoi/nostr/storage/` と `@toitoi/atproto/storage/`
- `pnpm` に不慣れなら: [pnpm Workspace 早見表](../../docs/operations/PNPM_WORKSPACE_GUIDE.md)

## 起動

```bash
TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
```

`TOITOI_STORAGE_DIR` が未設定の場合は、空の index snapshot で起動します。  
`TOITOI_STORAGE_DIR` が設定されている場合は、選択した protocol に replay module が必要です。replay module が無い protocol は起動時に明示エラーになります。
`TOITOI_TRANSPORT_SOURCES` が設定されている場合は、複数 transport の replay をまとめて canonical view に反映します。`/health` の `storage.protocol` は `multi-transport` になります。

`/health` には、選択中 protocol の replay 可否を示す `storage` が含まれます。  
`/api/v1/protocols/:protocol` には、`provenance` に加えて `provenancePolicy` と `storage` が含まれ、protocol ごとの差分を見分けやすくしています。

## どこで使うか

- 対象: API 利用者、フロントエンド開発者、連携先実装者
- 使用場面: エンドポイント確認、検索条件確認、レスポンス構造確認
- 関連実装: `apps/api/server.js`、`apps/api/standard_api_service.js`、protocol ごとの `storage/indexer.js`

## 実装状態

現在の API は、protocol ごとの `storage/indexer.js` と `storage/replay.js` で構築された派生 index を入力にして、`apps/api/standard_api_service.js` が canonical view を組み立てます。  
デフォルトの参照実装は Nostr ですが、`TOITOI_PROTOCOL` に応じて `atproto` へ切り替えられます。

現在の主要関数は次の通りです。

- `lookupEvent(indexSnapshot, eventId)`
- `listEvents(indexSnapshot, options)`
- `searchEvents(indexSnapshot, query, options)`
- `findEventsByRelationTerm(indexSnapshot, term, options)`
- `getEventReferences(indexSnapshot, eventId)`
- `buildLineageTree(indexSnapshot, rootId, options)`

全文検索は現時点では token containment ベースの最小実装です。`pg_trgm` や highlight 出力は前提にしていません。

## 共通仕様

| 項目 | 内容 |
|---|---|
| プロトコル | HTTPS |
| データ形式 | JSON (`Content-Type: application/json`) |
| 文字コード | UTF-8 |
| 認証 | なし（オープンAPI） |
| レート制限 | 現バージョンでは未実装 |

## エンドポイント一覧

| メソッド | パス | 概要 |
|---|---|---|
| `GET` | `/health` | サーバーの稼働確認 |
| `GET` | `/api/v1/protocols` | registry に登録された protocol 一覧と capability を取得 |
| `GET` | `/api/v1/protocols/:protocol` | 単一 protocol の metadata を取得 |
| `GET` | `/api/v1/inquiries` | 最新の canonicalized event 一覧を取得 |
| `GET` | `/api/v1/inquiries/query` | 全文検索・タグ絞り込み・DSL フィルタリングによる複合検索 |
| `GET` | `/api/v1/inquiries/relation` | relationship 条件で絞り込んだ一覧を取得 |
| `GET` | `/api/v1/inquiries/:id` | 単一の canonical event を取得 |
| `GET` | `/api/v1/inquiries/:id/detail` | 関連参照を含む詳細ビューを取得 |
| `GET` | `/api/v1/inquiries/:id/tree` | 問いの系譜ツリーを取得 |

## レスポンスの見方

`lookup` 系のレスポンスは canonical event の投影です。代表的なフィールドは次の通りです。

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
- `provenance`
- `rawRef`

`provenance` は要約情報で、`sourceCount` / `sourceProtocols` / `sourceIds` / `rawRef` を含みます。  
`rawRef` は raw event または raw payload を再取得・再 canonicalize するための参照です。
`/api/v1/protocols/:protocol` の `provenancePolicy` は、`provenance` を API 上でどう扱うかを示すメタデータです。

API の identity 解決は保守的です。`body` の類似、`labels` の一致、時刻の近さだけでは merge しません。  
同一と判断できない event は、必要に応じて `relation` / `lineage` で関連を表現します。

`list` / `query` / `relation` 系のレスポンスは、基本的に次の形です。

```json
{
  "total": 2,
  "limit": 20,
  "offset": 0,
  "results": [
    {
      "event": { "... canonical view ..." },
      "provenance": { "... summary ..." }
    }
  ]
}
```

## `GET /api/v1/protocols`

registry に登録されている protocol の一覧と capability matrix を返します。  
起動時の introspection や運用確認に使います。

### レスポンス

```json
{
  "selectedProtocol": "nostr",
  "availableProtocols": ["atproto", "localfs", "nostr"],
  "capabilityMatrix": "| Capability | atproto | localfs | nostr | ...",
  "protocols": [
    {
      "protocol": "nostr",
      "name": "Nostr",
      "capabilities": { "...": "..." }
    }
  ]
}
```

`protocols[]` の各要素には、`provenancePolicy` と `storage` も含まれます。`localfs` のような metadata-only protocol は、`storage.supported` が `false` になります。

## `GET /health`

サーバーが正常に稼働しているかを確認します。監視ツールや接続テストに使用します。

### リクエスト

パラメータなし。

```bash
curl https://api.your-domain.com/health
```

### レスポンス

```json
{
  "status": "ok",
  "timestamp": "2026-05-01T10:00:00.000Z"
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `status` | string | 常に `ok` |
| `timestamp` | string | サーバー現在時刻（ISO 8601形式） |

## `GET /api/v1/inquiries`

蓄積された canonicalized event を新着順で取得します。ページネーションに対応しています。

### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 上限 | 説明 |
|---|---|---|---|---|---|
| `limit` | integer | - | `20` | `100` | 1回で取得する件数 |
| `offset` | integer | - | `0` | - | 取得開始位置 |
| `order` | string | - | `desc` | - | `asc` または `desc` |

### レスポンス

```json
{
  "total": 128,
  "limit": 20,
  "offset": 0,
  "results": [
    {
      "event": {
        "id": "tt:evt:01JV7Y8K7Y4Y2M4Q7W8J9R0ABC",
        "schemaVersion": "0.3.1",
        "type": "inquiry",
        "createdAt": "2026-05-19T00:00:00Z",
        "body": {
          "text": "雑草の生え方が場所によって違うのはなぜ？",
          "language": "ja"
        },
        "contexts": {
          "climate_zone": "warm-temperate",
          "soil_type": "volcanic_ash"
        },
        "relationships": [
          {
            "source": "microclimate",
            "target": "weed_flora"
          }
        ],
        "phase": "intermediate",
        "lineage": [
          {
            "type": "derived_from",
            "target": "tt:evt:01JV..."
          }
        ],
        "provenance": {
          "sourceCount": 1,
          "sourceProtocols": ["nostr"],
          "sourceIds": ["<nostr_event_id>"],
          "rawRef": {
            "protocol": "nostr",
            "sourceId": "<nostr_event_id>",
            "relay": "wss://relay.example",
            "storage": "append-log",
            "storageId": "log-000123",
            "payloadHash": "<raw_payload_hash>"
          }
        }
      },
      "provenance": {
        "sourceCount": 1,
        "sourceProtocols": ["nostr"],
        "sourceIds": ["<nostr_event_id>"],
        "rawRef": {
          "protocol": "nostr",
          "sourceId": "<nostr_event_id>",
          "relay": "wss://relay.example",
          "storage": "append-log",
          "storageId": "log-000123",
          "payloadHash": "<raw_payload_hash>"
        }
      }
    }
  ]
}
```

## `GET /api/v1/inquiries/query`

`content` に対する全文検索と、`contexts`・`relationships`・`phase`・`dsl` などの条件を組み合わせて絞り込むエンドポイントです。  
`q` や各種フィルタを1つ以上指定してください。未指定の場合は `400` になります。

### クエリパラメータ

**検索パラメータ**

| パラメータ | 型 | 説明 |
|---|---|---|
| `q` | string | `body.text` に対する部分一致検索 |
| `climate_zone` | string | 気候帯で絞り込み |
| `soil_type` | string | 土壌タイプで絞り込み |
| `farming_context` | string | 農法・栽培環境で絞り込み |
| `crop_family` | string | 対象作物群で絞り込み |
| `relationship` | string | 関係性の要素名で絞り込み |
| `type` | string | canonical event type で絞り込み |
| `phase` | string | 熟達フェーズで絞り込み |
| `dsl_model` | string | DSL モデル名で絞り込み |
| `dsl_var` | string | DSL 変数名で絞り込み |
| `dsl_role` | string | DSL 変数ロールで絞り込み |
| `since` | integer | この Unix timestamp 以降 |
| `until` | integer | この Unix timestamp 以前 |

**ページネーション**

| パラメータ | 型 | デフォルト | 上限 | 説明 |
|---|---|---|---|---|
| `limit` | integer | `20` | `100` | 1回で取得する件数 |
| `offset` | integer | `0` | - | 取得開始位置 |
| `order` | string | `desc` | - | `asc` または `desc` |

### 例

```bash
# 全文検索
curl "https://api.your-domain.com/api/v1/inquiries/query?q=スギナ"

# context 絞り込み
curl "https://api.your-domain.com/api/v1/inquiries/query?soil_type=volcanic_ash&climate_zone=cool-temperate"

# relationship 絞り込み
curl "https://api.your-domain.com/api/v1/inquiries/query?relationship=weed_flora"

# DSL 絞り込み
curl "https://api.your-domain.com/api/v1/inquiries/query?dsl_var=microclimate&dsl_role=independent"
```

### レスポンス

`/api/v1/inquiries` と同じ形で、`results` に canonical view と provenance summary が入ります。

```json
{
  "total": 42,
  "limit": 20,
  "offset": 0,
  "results": [
    {
      "event": {
        "id": "tt:evt:01JV7Y8K7Y4Y2M4Q7W8J9R0ABC",
        "type": "inquiry",
        "createdAt": "2026-05-19T00:00:00Z",
        "body": { "text": "雑草の生え方が場所によって違うのはなぜ？" },
        "phase": "intermediate",
        "provenance": {
          "sourceCount": 1,
          "sourceProtocols": ["nostr"],
          "sourceIds": ["<nostr_event_id>"],
          "rawRef": {
            "protocol": "nostr",
            "sourceId": "<nostr_event_id>"
          }
        }
      },
      "provenance": {
        "sourceCount": 1,
        "sourceProtocols": ["nostr"],
        "sourceIds": ["<nostr_event_id>"],
        "rawRef": {
          "protocol": "nostr",
          "sourceId": "<nostr_event_id>"
        }
      }
    }
  ]
}
```

## `GET /api/v1/inquiries/relation`

`relationship` パラメータで関連語を絞り込んだ一覧を返します。  
`relationship` は必須です。未指定なら `400` になります。

### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `relationship` | string | ✅ | 関係性の要素名 |
| `limit` | integer | - | 取得件数 |
| `offset` | integer | - | 取得開始位置 |
| `order` | string | - | `asc` / `desc` |

### レスポンス

`/api/v1/inquiries/query` と同じ `results` 形状です。

## `GET /api/v1/inquiries/:id`

指定した event ID に対応する canonical event を1件返します。lookup 用です。

### パスパラメータ

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `:id` | string | ✅ | canonical event ID |

### レスポンス

`projectCanonicalEvent()` による canonical view が返ります。`provenance` と `rawRef` を含みます。

### エラー

- `404 Not Found`: `Inquiry not found`

## `GET /api/v1/inquiries/:id/detail`

単一イベントの詳細ビューを返します。`event` に加えて、`references.parents` / `references.children` / `references.relationships` を含みます。

### レスポンス

```json
{
  "event": { "... canonical view ..." },
  "references": {
    "parents": [],
    "children": [],
    "relationships": []
  }
}
```

### エラー

- `404 Not Found`: `Inquiry not found`

## `GET /api/v1/inquiries/:id/tree`

指定したイベントをルートとし、lineage を再帰的に辿ったツリーを返します。  
フロントエンドのマインドマップや系譜表示に使います。

### レスポンス

ルートノードと `children` を持つ再帰構造です。

### エラー

- `404 Not Found`: `Inquiry not found`

## 使い方の例

### JavaScript

```javascript
async function fetchInquiries({ q, soilType, phase, limit = 20, offset = 0 }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (soilType) params.set('soil_type', soilType);
  if (phase) params.set('phase', phase);
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  const res = await fetch(`https://api.your-domain.com/api/v1/inquiries/query?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

### Python

```python
import requests

BASE_URL = "https://api.your-domain.com"

def fetch_inquiries(q=None, soil_type=None, phase=None, limit=20, offset=0):
    params = {"limit": limit, "offset": offset}
    if q:
        params["q"] = q
    if soil_type:
        params["soil_type"] = soil_type
    if phase:
        params["phase"] = phase

    res = requests.get(f"{BASE_URL}/api/v1/inquiries/query", params=params)
    res.raise_for_status()
    return res.json()
```

## 関連リンク

- 入口一覧: [README.md](../../README.md)
- ディレクトリ責務: [DIRECTORY_BOUNDARIES.md](../../docs/architecture/DIRECTORY_BOUNDARIES.md)
- HTTP エントリポイント: [server.js](./server.js)
- ルーティングと投影: [standard_api_service.js](./standard_api_service.js)
- テスト: [test_standard_api_service.js](./test_standard_api_service.js)
- 派生 index の元データ: [`@toitoi/nostr/storage/`](../../packages/nostr/storage/)
