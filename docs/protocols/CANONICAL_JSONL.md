# Toitoi Canonical JSONL 仕様書

**バージョン: 0.2.0 (Draft)**

---

# 1. 目的

本ドキュメントは、Toitoi における **Canonical Object Format（正準オブジェクト形式）** を定義するものです。

Canonical Format は以下の性質を持ちます。

* transport-independent（トランスポート非依存）
* append-only oriented（追記型志向）
* semantic-first（意味論中心）
* graph-native（グラフネイティブ）
* boundary-object preserving（境界対象保持）

本仕様は以下のモジュール間で共有される内部意味表現です。

* Nostr transport
* ATProto transport
* 将来的な ActivityPub transport
* Indexer
* AI modules
* Knowledge Graph pipelines
* storage backends

Canonical Object は Toitoi Inquiry の一次的・正準的表現です。

Nostr Event や ATProto Record などの transport-specific representation は、Canonical Object の serialized projection（直列化された射影）として扱われます。

---

# 2. 設計原則

## 2.1 Boundary Object First

自然言語による問いは、常に一次的表現として保持されます。

DSL 層は問いの意味的射影であり、問いそのものを置き換えるものではありません。

```text
Boundary Object
    ↓ semantic projection
DSL / Graph Structure
```

---

## 2.2 Transport Independence

Canonical Object は transport-specific semantics を含んではなりません。

以下の概念は transport layer concern であり、Canonical Layer から除外されます。

* Nostr `kind`
* Nostr `sig`
* Nostr `pubkey`
* ATProto URI
* relay metadata
* protocol-specific serialization structure

これらは adapter layer に属します。

---

## 2.3 Graph-Native Structure

Toitoi Object は semantic graph node として扱われます。

relationship・lineage・translation chain・DSL relation は第一級概念です。

---

## 2.4 Immutable-Oriented Model

Canonical Object は append-only semantic artifact として扱われるべきです。

更新は destructive mutation ではなく、以下の relation によって表現されることを推奨します。

* `derived_from`
* `revises`
* `annotates`
* `synthesis`

---

# 3. Canonical JSONL Format

JSONL ファイルの各行は、必ず 1 つの Canonical Object を含みます。

例：

```json
{"id":"tt:obj:01JV...","type":"inquiry",...}
{"id":"tt:obj:01JW...","type":"annotation",...}
```

---

# 4. Canonical Object Schema

## 4.1 Top-Level Structure

```json
{
  "id": "tt:obj:01JV7Y8K7Y4Y2M4Q7W8J9R0ABC",

  "schemaVersion": "0.2.0",

  "type": "inquiry",

  "author": {
    "scheme": "nostr",
    "id": "npub1..."
  },

  "createdAt": "2026-05-18T12:34:56Z",

  "body": {
    "text": "雑草の生え方が場所によって違うのはなぜ？",
    "language": "ja"
  },

  "contexts": {
    "climate_zone": "warm-temperate",
    "soil_type": "volcanic_ash",
    "farming_context": "no_till",
    "crop_family": "solanaceae"
  },

  "relationships": [
    {
      "source": "microclimate",
      "target": "weed_flora"
    }
  ],

  "phase": "intermediate",

  "trigger": {
    "category": "farmer_observation",
    "value": "weed_change"
  },

  "dsl": {
    "models": [
      {
        "id": "m1",
        "name": "climate_model",

        "variables": [
          {
            "name": "microclimate",
            "role": "independent"
          },
          {
            "name": "weed_flora",
            "role": "dependent"
          }
        ],

        "relations": [
          {
            "source": "microclimate",
            "target": "weed_flora"
          }
        ]
      }
    ]
  },

  "lineage": [
    {
      "type": "derived_from",
      "target": "tt:obj:01JV..."
    }
  ],

  "labels": [
    "agroecology"
  ],

  "meta": {
    "experimental": false
  }
}
```

---

# 5. フィールド定義

## 5.1 `id`

グローバルに一意な Canonical Object Identifier。

### Requirements

* transport-independent であること
* transport を跨いでも安定していること
* Nostr event hash に依存しないこと
* ATProto URI に依存しないこと

### 推奨フォーマット

```text
tt:obj:<ulid>
```

例：

```text
tt:obj:01JV7Y8K7Y4Y2M4Q7W8J9R0ABC
```

---

## 5.2 `schemaVersion`

Canonical Schema のバージョン。

例：

```json
"schemaVersion": "0.2.0"
```

---

## 5.3 `type`

Semantic Object Type。

### 現在推奨される型

| Type          | Meaning              |
| ------------- | -------------------- |
| `inquiry`     | 問い / Boundary Object |
| `annotation`  | 注釈・解釈                |
| `observation` | 観察された現象              |
| `hypothesis`  | 仮説                   |
| `synthesis`   | 複数オブジェクトの統合          |
| `dataset`     | 外部構造化データ参照           |

追加の型は TIPs により拡張可能です。

---

## 5.4 `author`

Transport-independent identity descriptor。

### Structure

```json
{
  "scheme": "nostr",
  "id": "npub1..."
}
```

### Example Schemes

| Scheme     | Example       |
| ---------- | ------------- |
| `nostr`    | `npub1...`    |
| `atproto`  | `did:plc:...` |
| `ethereum` | `0x...`       |

---

## 5.5 `createdAt`

ISO8601 UTC timestamp。

例：

```json
"createdAt": "2026-05-18T12:34:56Z"
```

---

# 6. Boundary Object Layer

## 6.1 `body`

自然言語による一次的表現。

### Structure

```json
{
  "text": "雑草の生え方が場所によって違うのはなぜ？",
  "language": "ja"
}
```

### Design Principle

body は Inquiry の primary semantic interface です。

構造化解釈は body を置き換えてはなりません。

---

# 7. Context Layer

## 7.1 `contexts`

生態学的・翻訳的文脈を表す構造化メタデータ。

### Example

```json
{
  "climate_zone": "warm-temperate",
  "soil_type": "volcanic_ash",
  "farming_context": "no_till",
  "crop_family": "solanaceae"
}
```

### Extensibility

custom key を許容します。

例：

```json
{
  "custom:water_regime": "seasonal"
}
```

---

# 8. Relationship Layer

## 8.1 `relationships`

生態学的・概念的 relationship を定義します。

### Structure

```json
[
  {
    "source": "microclimate",
    "target": "weed_flora"
  }
]
```

### Semantics

relationship は graph edge として扱われます。

方向性は causal・correlational・translational のいずれとしても解釈可能です。

---

# 9. Phase Layer

## 9.1 `phase`

熟達段階・scaffolding level を表します。

### Allowed Values

| Value          | Meaning       |
| -------------- | ------------- |
| `beginner`     | 可視現象の観察       |
| `intermediate` | 多要素推論         |
| `expert`       | システムレベルの生態系推論 |

---

# 10. Trigger Layer

## 10.1 `trigger`

問い生成の直接的原因を表します。

### Structure

```json
{
  "category": "farmer_observation",
  "value": "weed_change"
}
```

---

# 11. DSL Layer

## 11.1 Purpose

DSL model は Boundary Object の構造化意味射影です。

複数 DSL model の共存を許容します。

DSL は interpretive であり authoritative ではありません。

---

## 11.2 Structure

```json
{
  "models": [
    {
      "id": "m1",
      "name": "climate_model",
      "variables": [...],
      "relations": [...]
    }
  ]
}
```

---

## 11.3 Variables

```json
{
  "name": "microclimate",
  "role": "independent"
}
```

### Allowed Roles

| Role          | Meaning |
| ------------- | ------- |
| `independent` | 説明変数    |
| `dependent`   | 応答変数    |
| `mediator`    | 媒介変数    |
| `moderator`   | 条件付け変数  |

---

## 11.4 Relations

```json
{
  "source": "microclimate",
  "target": "weed_flora"
}
```

---

# 12. Lineage Layer

## 12.1 `lineage`

問いの系譜を表します。

### Structure

```json
[
  {
    "type": "derived_from",
    "target": "tt:obj:01JV..."
  }
]
```

### Recommended Types

| Type           | Meaning       |
| -------------- | ------------- |
| `derived_from` | 他文脈への翻訳・派生    |
| `synthesis`    | 複数系譜の統合       |
| `annotates`    | 他 object への注釈 |
| `revises`      | 後継・改訂関係       |

---

# 13. Labels

## 13.1 `labels`

軽量分類タグ。

例：

```json
[
  "agroecology",
  "soil"
]
```

---

# 14. Meta Layer

## 14.1 `meta`

非意味論的 implementation metadata。

例：

```json
{
  "experimental": true
}
```

この field に transport-specific data を含めるべきではありません。

---

# 15. Transport Adapters

Canonical Object は transport-specific representation に serialize されます。

## 15.1 Nostr Adapter

```text
Canonical Object
    ↓ encode
Nostr Event
```

Responsibilities:

* `kind`
* `tags`
* `sig`
* relay publishing
* event hashing

---

## 15.2 ATProto Adapter

```text
Canonical Object
    ↓ encode
ATProto Record
```

Responsibilities:

* Lexicon conversion
* DID integration
* record publishing
* repo operations

---

# 16. Future Extensions

将来的な拡張候補：

* Knowledge Graph export
* CRDT integration
* semantic embeddings
* ontology mapping
* external graph linking
* decentralized storage reference
* AI reasoning trace

これらは canonical compatibility を壊さずに追加されるべきです。

---

# 17. Core Principle Summary

Toitoi は単なる social-post protocol ではありません。

Toitoi は：

```text
Distributed Semantic Knowledge Formation Protocol
```

です。

そのため Canonical Object は transport-native social media semantics よりも、以下を優先します。

* semantic structure
* graph relationship
* interpretive plurality
* transport independence
* boundary-object preservation
