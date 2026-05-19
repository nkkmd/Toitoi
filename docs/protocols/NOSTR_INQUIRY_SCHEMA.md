# Nostr Inquiry Schema

## 目的

このドキュメントは、Toitoi が Nostr 上で inquiry を流通させる際の transport schema を定義します。

重要なのは、これは Toitoi 全体の中心仕様ではなく、

- Nostr transport における表現
- Canonical Event の projection
- relay / fetch / sync のための互換仕様

であるという点です。

Toitoi の内部中心モデルは [CANONICAL_EVENT.md](./CANONICAL_EVENT.md) にあります。

---

## 位置づけ

Toitoi では次を分離します。

```text
Canonical Event
  ↓ converter
Nostr Inquiry Event
  ↓ transport
Relay / Sync / Archive
```

読み込み側では逆方向に、

```text
Nostr Inquiry Event
  ↓ adapter / normalizer
Canonicalized Event
```

として扱います。

つまり、

- Nostr inquiry event は transport representation
- Canonical Event は semantic representation

です。

---

## 基本原則

1. Nostr event を Toitoi の内部中心モデルと見なさない
2. inquiry の自然言語は `content` に保持する
3. DSL は optional かつ non-authoritative とする
4. protocol 固有情報は transport concern として扱う
5. canonicalization は別層で行う

---

## 対象イベント

現時点では、Toitoi の inquiry transport は Nostr `kind: 1042` を利用します。

この event は、

- 問いの自然言語表現
- locality を抽象化した context
- 観察対象の relationship
- phase
- lineage
- optional な DSL projection

を運ぶ transport envelope です。

---

## Event Shape

```json
{
  "kind": 1042,
  "pubkey": "<32-byte hex>",
  "created_at": 1778245037,
  "content": "雑草の生え方が場所によって違うのはなぜ？",
  "tags": [
    ["t", "agroecology"],
    ["context", "climate_zone", "warm-temperate"],
    ["context", "soil_type", "volcanic_ash"],
    ["relationship", "microclimate", "weed_flora"],
    ["phase", "intermediate"],
    ["trigger", "farmer_observation", "weed_change"],
    ["e", "parent_event_id_hex", "wss://relay.example", "derived_from"],
    ["dsl:model", "m1", "climate_model"],
    ["dsl:var", "m1", "microclimate", "independent"],
    ["dsl:var", "m1", "weed_flora", "dependent"],
    ["dsl:rel", "m1", "microclimate", "weed_flora"]
  ],
  "id": "<32-byte hex>",
  "sig": "<64-byte hex>"
}
```

---

## 必須要素

### `kind`

- 値は `1042`
- Toitoi inquiry transport event を表す

### `content`

- inquiry の自然言語本体
- Boundary Object として常に保持する
- DSL や将来の構造化情報はこれを置き換えない

### `tags`

少なくとも以下を持つことを推奨します。

- `["t", "agroecology"]`
- 1 個以上の `context`
- 1 個以上の `relationship`
- 1 個の `phase`

### `id`, `sig`, `pubkey`, `created_at`

- Nostr transport としての整合性維持に必要
- Canonical Event へは provenance / source metadata として引き継ぐ

---

## タグ仕様

### `context`

形式:

```text
["context", "<category>", "<value>"]
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

### `relationship`

形式:

```text
["relationship", "<element_a>", "<element_b>"]
```

役割:

- inquiry が注目している関係対象を示す
- direction を強制しない transport-level pair として扱う

### `phase`

形式:

```text
["phase", "beginner" | "intermediate" | "expert"]
```

役割:

- inquiry の scaffolding target を示す

### `trigger`

形式:

```text
["trigger", "<category>", "<value>"]
```

役割:

- inquiry の直接の起点を記録する
- optional

### `e`

形式:

```text
["e", "<parent_event_id>", "<relay_url>", "<relation_type>"]
```

`relation_type` の代表値:

- `derived_from`
- `synthesis`

役割:

- lineage の transport representation

### `dsl:*`

形式:

```text
["dsl:<sub_key>", "<model_id>", "<value_1>", "<value_2?>"]
```

利用可能な sub-key:

- `dsl:model`
- `dsl:var`
- `dsl:rel`
- `dsl:meta`

制約:

- optional
- non-authoritative
- 複数 model 共存可
- adapter / indexer は受信値を勝手に統合しない

---

## Canonical Event との関係

Nostr inquiry event から Canonical Event へ取り込む際、少なくとも次を分離します。

- transport identity: `id`
- transport author identity: `pubkey`
- transport timestamp: `created_at`
- transport signature: `sig`
- semantic body: `content`
- semantic context: `context`
- semantic relationship: `relationship`
- semantic lineage: `e`
- optional semantic projection: `dsl:*`

ここで重要なのは、

```text
Nostr event = semantic event
```

ではないことです。

validate, verify, dedupe, ordering, normalize を経た結果として、
はじめて Canonicalized Event が得られます。

---

## 非目標

この仕様は以下を定義しません。

- Canonical Event の内部 schema
- raw event 保存形式のすべて
- replay log の構造
- multi-protocol 共通仕様

それらは次を参照してください。

- [CANONICAL_EVENT.md](./CANONICAL_EVENT.md)
- [../architecture/PROTOCOL_ABSTRACTION.md](../architecture/PROTOCOL_ABSTRACTION.md)
- [../architecture/ADOPTED_ARCHITECTURE_DECISIONS.md](../architecture/ADOPTED_ARCHITECTURE_DECISIONS.md)
