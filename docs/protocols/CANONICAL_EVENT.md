# Canonical Event

**Version: 0.3.1** | **Status: stable** | **Last updated: 2026-05-20**

## 目的

このドキュメントは、Toitoi の内部中心モデルである Canonical Event を定義します。

Canonical Event は、

- semantic layer
- protocol-independent representation
- replayable な内部基準

として扱われます。

Nostr Event や将来の ATProto Record は、Canonical Event の transport への projection です。

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

このときの transport への projection では、`lineage` に由来する `e` タグを `dsl:*` タグより前に出力し、同一入力に対する再現性を高めます。

### Event Model の要点

Toitoi の event model は append-only です。公開後の event は破壊的に更新せず、修正や再解釈は新しい event と lineage relation で表現します。

- raw event: transport からそのまま取得した生の protocol event
- normalized event: raw event を検証し、protocol 固有の差異を整理した中間表現
- canonicalized event: normalized event を Canonical Event に変換した結果
- derived index: 検索・参照用の派生構造
- storage snapshot: raw / canonical / ingest log を保持した replay 基盤

保存は append-only を基本にし、raw event と canonicalized event を分けて保持します。これにより、canonicalization ルール変更後の再処理、index の再生成、履歴監査が可能になります。

### Protocol Abstraction の要点

Toitoi は現在 Nostr を最初の operational transport としますが、内部構造は protocol-independent を目指します。

- Adapter / Normalizer は validate / verify / dedupe / ordering / normalize / canonicalize を担う
- Converter は Canonical Event と protocol-specific representation の相互変換を担う
- Transport は relay / PDS / filesystem 等への配送と保存を担う
- Indexer は Canonical Event から派生構造を作る
- Standard API は protocol schema ではなく意味アクセスを返す

delete / replace / ordering / trust は transport 由来の判断として扱い、semantic layer へ直接持ち込まない。

---

## 用語

このドキュメントでは、次の用語を固定して使います。

### raw event

- transport からそのまま取得した生の protocol event
- 署名検証、重複排除、順序付けの前段階にある

### normalized event

- raw event を検証し、protocol 固有の差異を整理した中間表現
- まだ semantic な正規化は完了していない

### canonical event

- Toitoi 内部の意味的共通表現
- protocol schema の写しではない
- replay 可能な内部基準として扱う

### canonicalized event

- normalized event を Canonical Event に変換した結果
- 以後の index / API / AI はこの層を前提に扱う

### derived index

- Canonical Event から派生した検索・参照用の補助構造
- 意味論そのものではない

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
    "sources": [
      {
        "protocol": "nostr",
        "sourceId": "<nostr_event_id>"
      }
    ]
  },
  "rawRef": {
    "protocol": "nostr",
    "sourceId": "<nostr_event_id>",
    "relay": "wss://relay.example",
    "storage": "append-log",
    "storageId": "log-000123",
    "payloadHash": "<raw_payload_hash>"
  }
}
```

## スキーマ補足

`schemas/canonical-event.schema.json` は、このドキュメントの最小構造を機械可読にしたものです。

実装上は、次の任意フィールドを追加できます。

- `trigger`
- `labels`
- `meta`
- `rawRef`
- `dsl.models[].meta`

`provenance.sources[]` は、どの protocol event から来たかを追跡するための必須情報です。
`rawRef` は raw event または raw payload の参照先を保持するための専用フィールドです。
`provenance` は来歴、`rawRef` は再取得・再 canonicalize のための参照を担います。
`id` は `tt:evt:<ULID>` を推奨し、移行期間の互換として `tt:obj:<ULID>` も受け入れられます。

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
- `sources` 配列で source reference を保持すること

`sources` の各要素は少なくとも次を持ちます。

- `protocol`
- `sourceId`

必要に応じて `relay` や `kind` を補助情報として持てます。

### `rawRef`

- raw event または raw payload への参照
- provenance と分離して、再取得・再 canonicalize 用の入口を明示する
- protocol ごとの参照形を吸収する

`rawRef` は少なくとも次を持ちます。

- `protocol`
- `sourceId`

必要に応じて次の補助情報を持てます。

- `relay`
- `storage`
- `storageId`
- `payloadHash`

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
- [../architecture/AI_SYSTEM_OVERVIEW.md](../architecture/AI_SYSTEM_OVERVIEW.md)
- [../architecture/STANDARD_API_MVP.md](../architecture/STANDARD_API_MVP.md)
