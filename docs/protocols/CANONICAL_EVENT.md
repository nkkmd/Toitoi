# Canonical Event

## 目的

このドキュメントは、Toitoi の内部中心モデルである Canonical Event を定義します。

Canonical Event は、

- semantic layer
- protocol-independent representation
- replayable な内部基準

として扱われます。

Nostr Event や将来の ATProto Record は、Canonical Event の transport projection です。

---

## 位置づけ

Toitoi の基本構造は次の通りです。

```text
Raw Protocol Events
  ↓ adapter / normalizer
Canonicalized Events
  ↓ indexer / API / AI
Standardized Access
```

書き込み側では、

```text
Canonical Event
  ↓ converter
Protocol-specific Representation
```

の順で外部へ出します。

---

## 基本原則

1. Canonical Event は protocol schema の写しにしない
2. Canonical Event は semantic stability を優先する
3. raw event と canonicalized event を分けて保持する
4. index は Canonical Event から派生する補助構造として扱う
5. ingest と replay は同じ canonicalization ルールで動かす

---

## Canonical Event が担うもの

- inquiry / observation / annotation などの意味的型
- 自然言語本体
- locality の抽象化された context
- semantic relationship
- lineage
- optional な DSL projection
- provenance
- source references

---

## Canonical Event が直接担わないもの

- Nostr `kind`
- Nostr `sig`
- relay ごとの配送状態
- protocol-specific serialization
- transport 固有の ordering ルールそのもの

これらは transport layer または adapter / normalizer layer の責務です。

---

## 最小構造

```json
{
  "id": "tt:evt:01JV7Y8K7Y4Y2M4Q7W8J9R0ABC",
  "schemaVersion": "0.3.0",
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
    "sources": [
      {
        "protocol": "nostr",
        "sourceId": "<nostr_event_id>"
      }
    ]
  }
}
```

---

## フィールド方針

### `id`

- transport-independent であること
- protocol を跨いでも安定すること
- event hash や URI に直接従属しないこと

### `type`

代表例:

- `inquiry`
- `observation`
- `annotation`
- `response`
- `synthesis`

### `body`

- 自然言語の主表現
- Boundary Object を保持する

### `contexts`

- raw data そのものではなく抽象化された locality

### `relationships`

- semantic relation の最小構造
- transport pair をそのままコピーするのではなく、意味的に正規化された形を優先する

### `lineage`

- `derived_from`
- `synthesis`
- `annotates`
- `revises`

などの関係を保持する

### `provenance`

- どの protocol event から来たか
- canonicalization に必要だった source を追えること

---

## raw event との関係

Canonical Event を中心に据えても、raw protocol event は保持します。

理由:

- 監査可能性
- 再処理可能性
- canonicalization ルール変更時の再構築
- transport provenance の追跡

そのため、実装では次を分けます。

```text
raw event
normalized event
canonicalized event
derived index
```

---

## JSONL との関係

Canonical Event は JSONL で直列化できます。

ただし、

- `JSONL` は保存形式
- `Canonical Event` は意味モデル

であり、同義ではありません。

このドキュメントは保存形式よりも内部モデルを優先して定義します。

---

## Indexer との関係

Indexer は Canonical Event を入力として、以下の補助構造を作ります。

- full-text index
- time index
- lineage traversal
- embeddings
- graph construction

これらはすべて派生物であり、Canonical Event の意味論を置き換えません。

---

## 関連

- [NOSTR_INQUIRY_SCHEMA.md](./NOSTR_INQUIRY_SCHEMA.md)
- [../architecture/EVENT_MODEL.md](../architecture/EVENT_MODEL.md)
- [../architecture/PROTOCOL_ABSTRACTION.md](../architecture/PROTOCOL_ABSTRACTION.md)
- [../architecture/ADOPTED_ARCHITECTURE_DECISIONS.md](../architecture/ADOPTED_ARCHITECTURE_DECISIONS.md)
