# ATProto Inquiry Schema

**Status: evolving** | **Last updated: 2026-06-05**

## 目的

このドキュメントは、Toitoi が ATProto 上で inquiry を流通させる際の transport schema を定義します。

`question` は一般語として使えますが、この層では `inquiry` を正式な用語として扱います。

重要なのは、これは Toitoi 全体の中心仕様ではなく、

- ATProto transport における表現
- Canonical Event の transport への projection
- ingest / replay / sync のための互換仕様

である点です。

Toitoi の内部中心モデルは [CANONICAL_EVENT.md](./CANONICAL_EVENT.md) にあります。
共通テンプレートは [INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md](./INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md) を参照してください。

---

## 位置づけ

Toitoi では次を分離します。

```text
Canonical Event
  ↓ converter
ATProto Inquiry Record
  ↓ transport
PDS / API / Archive / Replay
```

読み込み側では逆方向に、

```text
ATProto Inquiry Record
  ↓ adapter / normalizer
Canonicalized Event
```

として扱います。

つまり、

- ATProto inquiry record は transport representation
- Canonical Event は semantic representation

です。

---

## 基本原則

1. ATProto record を Toitoi の内部中心モデルと見なさない
2. inquiry の自然言語は record の `text` に保持する
3. 追加の構造化情報は optional であり、意味の中心を置き換えない
4. protocol 固有情報は transport concern として扱う
5. canonicalization は別層で行う
6. delete / replace / ordering / trust は transport 由来の判断として扱う

---

## 対象レコード

現時点では、Toitoi の ATProto inquiry transport は custom record `app.toitoi.inquiry` を利用します。

この record は、

- 問いの自然言語表現
- locality を抽象化した context
- 観察対象の relationship
- phase
- lineage
- optional な DSL projection

を運ぶ transport envelope です。

`app.bsky.feed.post` 互換 projection は存在してもよいですが、この schema の主対象ではありません。

---

## Record Shape

```json
{
  "uri": "at://did:plc:toitoi123/app.toitoi.inquiry/3jv4f4g2h6k7l8m9n0p1q2r3s4",
  "cid": "bafyreib2c4h5j6k7l8m9n0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9",
  "did": "did:plc:toitoi123",
  "collection": "app.toitoi.inquiry",
  "rkey": "3jv4f4g2h6k7l8m9n0p1q2r3s4",
  "createdAt": "2026-05-28T00:00:00.000Z",
  "indexedAt": "2026-05-28T00:00:01.000Z",
  "record": {
    "type": "inquiry",
    "text": "雑草の生え方が場所によって違うのはなぜ？",
    "language": "ja",
    "contexts": {
      "climate_zone": "warm-temperate"
    },
    "relationships": [
      { "source": "microclimate", "target": "weed_flora" }
    ],
    "phase": "intermediate",
    "labels": ["agroecology"],
    "lineage": [
      { "type": "derived_from", "target": "at://did:plc:toitoi123/app.toitoi.inquiry/root" }
    ],
    "trigger": {
      "category": "field_observation",
      "value": "weed_change"
    },
    "dsl": {
      "models": [
        {
          "id": "m1",
          "name": "climate_model",
          "variables": [
            { "name": "microclimate", "role": "independent" },
            { "name": "weed_flora", "role": "dependent" }
          ],
          "relations": [
            { "source": "microclimate", "target": "weed_flora" }
          ]
        }
      ]
    },
    "meta": {
      "origin": "bsky.social"
    }
  }
}
```

---

## 必須要素

### `uri`

- 値は `at://` URI
- ATProto record を一意に識別する transport locator
- dedupe の主キーとして扱う

### `did`

- record の repository owner を表す
- provenance と trust の基礎情報として保持する

### `collection`

- 値は `app.toitoi.inquiry`
- Toitoi inquiry transport の collection 名

### `rkey`

- record key
- ordering や source reference の補助情報として保持する

### `record.text`

- inquiry の自然言語本体
- boundary object として常に保持する
- 追加の構造化情報はこれを置き換えない

---

## 推奨要素

少なくとも以下を持つことを推奨します。

- `record.type`
- `record.language`
- 1 個以上の `record.contexts`
- 1 個以上の `record.relationships`
- 1 個の `record.phase`

---

## レコード内フィールド仕様

### `record.type`

形式:

```text
"inquiry" | "observation" | "annotation" | "response" | "synthesis"
```

役割:

- semantic type を transport 上に残す

### `record.language`

形式:

```text
"ja" | "en" | "ja-JP" | ...
```

役割:

- inquiry の言語タグを保持する
- `und` は未指定または判定不能の既定値として扱う

### `record.contexts`

形式:

```text
{
  "<category>": "<value>"
}
```

役割:

- local raw data を直接晒さず locality を抽象化する
- cross-region な検索と参照を助ける

代表カテゴリ:

- `climate_zone`
- `soil_type`
- `farming_context`
- `crop_family`

標準語彙は [TOITOI_VOCABULARY.md](../concepts/TOITOI_VOCABULARY.md) を参照してください。

### `record.relationships`

形式:

```text
[{ "source": "<element_a>", "target": "<element_b>" }]
```

役割:

- inquiry が注目している関係対象を示す
- direction を強制しない transport-level pair として扱う

### `record.phase`

形式:

```text
"beginner" | "intermediate" | "expert"
```

役割:

- inquiry の scaffolding target を示す

### `record.trigger`

形式:

```text
{ "category": "<category>", "value": "<value>" }
```

役割:

- inquiry の直接の起点を記録する
- optional

### `record.lineage`

形式:

```text
[{ "type": "<relation_type>", "target": "<source_uri>" }]
```

`relation_type` の代表値:

- `derived_from`
- `synthesis`
- `annotates`
- `revises`

役割:

- lineage の transport representation

### `record.dsl`

形式:

```text
{
  "models": [
    {
      "id": "<model_id>",
      "name": "<model_name>",
      "variables": [
        { "name": "<var_name>", "role": "independent" | "dependent" | "mediator" | "moderator" }
      ],
      "relations": [
        { "source": "<element_a>", "target": "<element_b>" }
      ]
    }
  ]
}
```

役割:

- optional な構造化 projection を運ぶ
- non-authoritative として扱う
- 複数 model 共存可

### `record.labels`

形式:

```text
["agroecology", "soil", "microclimate"]
```

役割:

- transport projection の補助ラベル
- optional

### `record.meta`

形式:

```text
{ "<implementation_key>": "<value>" }
```

役割:

- non-semantic な実装メタデータ
- optional

---

## `createdAt` / `indexedAt`

### `createdAt`

- レコード作成時刻
- canonicalization では source timestamp として優先的に扱う

### `indexedAt`

- indexer が観測した時刻
- `createdAt` がない場合の順序補助として扱う

---

## provenance と raw reference

ATProto record から Canonical Event へ投影する際は、少なくとも次の情報を保持します。

- `uri`
- `cid`
- `did`
- `collection`
- `rkey`
- `createdAt`
- `indexedAt`

これらは Canonical Event 側では provenance / raw reference として保持されます。

---

## 実装上の制約

1. record は append-only 扱いを前提にする
2. 更新や置換は新しい event / record と lineage で表現する
3. dedupe は基本的に `uri` を使う
4. ordering は `indexedAt + uri` を基本線とする
5. trust は repository metadata 由来の MVP として扱う

---

## 関連

- [INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md](./INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md)
- [schemas/atproto-inquiry.schema.json](../../schemas/atproto-inquiry.schema.json)
- [CANONICAL_EVENT.md](./CANONICAL_EVENT.md)
- [NOSTR_INQUIRY_SCHEMA.md](./NOSTR_INQUIRY_SCHEMA.md)
- [NOSTR_TRANSPORT.md](./NOSTR_TRANSPORT.md)
- [packages/atproto/README.md](../../packages/atproto/README.md)
- [docs/operations/ATPROTO_STORAGE_AND_REPLAY.md](../operations/ATPROTO_STORAGE_AND_REPLAY.md)
