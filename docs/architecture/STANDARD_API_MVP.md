# Standard API MVP

**Status: stable** | **Last updated: 2026-06-05**

## 目的

protocol を意識せずに扱える「意味アクセス面」としての Standard API を定義します。

この文書は、その前提として

- どの view を返すか
- provenance をどこまで露出するか
- どの層を薄い service layer にするか

を固定します。

---

## 採用方針

### 1. HTTP 層は薄い service layer を挟む

API 実装は、`packages/nostr/storage/indexer.js` と `packages/nostr/storage/standard_api_views.js` を直接露出するのではなく、`apps/api/standard_api_service.js` の薄い service layer を経由して canonical view を返します。

理由:

- storage/indexer の公開形を安定させやすい
- view 変換と HTTP ルーティングを分離できる
- replay fixture を contract test に流用しやすい
- `apps/api/server.js` から HTTP サーバーへ載せやすい
- Phase 14 以降は `TOITOI_TRANSPORT_SOURCES` で複数 transport の replay をまとめても、この service layer を変えずに扱いやすい

### 2. response は protocol schema ではなく canonical view を返す

UI / AI は Nostr の raw schema を直接扱わず、意味論に基づく view を受け取ります。

Phase 14 以降は、必要に応じて Nostr / ATProto をまたいだ multi-transport の canonical view も同じ契約で返します。

### 3. highlight と embeddings は契約に入れない

現行の検索は token containment ベースです。検索結果に `highlight` を要求せず、embeddings も optional な将来拡張として扱います。

---

## Canonical View

### Event Lookup View

単一 event の参照用 view です。

返すもの:

- canonical event
- provenance summary
- rawRef

### Event Detail View

単一 event に加えて、参照関係を含む view です。

返すもの:

- event
- parents
- children
- relationships

### Event List View

時系列一覧用 view です。

返すもの:

- total
- limit
- offset
- results

### Relation View

relation term で引いた event の view です。

返すもの:

- total
- limit
- offset
- results

### Lineage View

系譜ツリー用 view です。

返すもの:

- root canonical event
- children 再帰構造

---

## 推奨する identity モデル

Phase 14 以降の multi-transport 運用では、Canonical Event を次の 3 層で扱うのが最も分かりやすいです。

### 1. root canonical event

- 1 つの問いの意味的な本体
- converter の前に canonical id を確定し、以後は維持する
- Nostr / ATProto のどちらへ投影しても同じ `id` を使う

### 2. transport projection

- root canonical event を各 transport の形へ投影したもの
- transport 固有の `kind` や `uri` は projection 側で持つ
- `provenance.sources[]` に source ごとの参照を残す

### 3. derived event

- root canonical event から意味的に派生した別イベント
- 新しい canonical id を割り当てる
- `lineage` で親子関係を表現する

### 実務上の指針

- 同一性が明示できる場合は、複数 transport の source を 1 つの canonical id に集約する
- 同一性が曖昧な場合は、無理に 1 件へ畳まず別 event として保持する
- DSL は補助的な解釈層として扱い、イベント identity の本体にしない

```json
{
  "id": "tt:evt:01JVVROOT0000000000000000000000000",
  "type": "inquiry",
  "body": {
    "text": "雑草の生え方が場所によって違うのはなぜ？",
    "language": "ja"
  },
  "provenance": {
    "sources": [
      { "protocol": "nostr", "sourceId": "<nostr_event_id>" },
      { "protocol": "atproto", "sourceId": "at://did:plc:.../app.toitoi.inquiry/..." }
    ]
  }
}
```

派生 event を作る場合は、別の `id` を与え、`lineage` で root への関係を表現します。

---

## Provenance の扱い

API では provenance を追えるようにしますが、raw transport event を丸ごと返しません。

Phase 14 以降は、source 跨ぎの provenance 集約がある場合でも、API は canonical view を優先して返します。

優先して返すもの:

- source protocol
- source id
- timestamp
- references
- rawRef

補助情報として返してよいもの:

- relay
- source metadata

同一性が明示できない場合は、無理に 1 件へ畳まず、別 event として見せます。必要であれば relation / lineage で関連を示します。

---

## 現行実装との接続

現行実装では、次のモジュールが基盤になります。

- `packages/nostr/storage/indexer.js`
- `packages/nostr/storage/standard_api_views.js`
- `packages/nostr/storage/replay.js`
- `packages/nostr/storage/test_standard_api_views.js`

これらは、HTTP API の契約テストに再利用できます。

## API 参照実装

Standard API の reference implementation は次のファイルで構成します。

- `apps/api/standard_api_service.js`
- `apps/api/server.js`
- `apps/api/test_standard_api_service.js`

---

## 参照

- [../protocols/CANONICAL_EVENT.md](../protocols/CANONICAL_EVENT.md)
- [../concepts/PROVENANCE.md](../concepts/PROVENANCE.md)
