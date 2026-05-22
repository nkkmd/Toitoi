# Standard API MVP

**Status: stable** | **Last updated: 2026-05-22**

## 目的

Phase 6 では、protocol を意識せずに扱える最初の意味アクセス面を作ります。

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

### 2. response は protocol schema ではなく canonical view を返す

UI / AI は Nostr の raw schema を直接扱わず、意味論に基づく view を受け取ります。

### 3. highlight と embeddings は Phase 6 契約に入れない

Phase 5 の現行検索は token containment ベースです。Phase 6 では検索結果に `highlight` を要求せず、embeddings も optional な将来拡張として扱います。

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

## Provenance の扱い

API では provenance を追えるようにしますが、raw transport event を丸ごと返しません。

優先して返すもの:

- source protocol
- source id
- timestamp
- references
- rawRef

補助情報として返してよいもの:

- relay
- source metadata

---

## Phase 5 との接続

現在のフェーズ5実装では、次のモジュールが基盤になります。

- `packages/nostr/storage/indexer.js`
- `packages/nostr/storage/standard_api_views.js`
- `packages/nostr/storage/replay.js`
- `packages/nostr/storage/test_standard_api_views.js`

これらは、Phase 6 の HTTP API 契約テストに再利用できます。

## Phase 6 実装との接続

Phase 6 の reference implementation は次のファイルで構成します。

- `apps/api/standard_api_service.js`
- `apps/api/server.js`
- `apps/api/test_standard_api_service.js`

---

## 参照

- [OVERVIEW.md](./OVERVIEW.md)
- [PROTOCOL_ABSTRACTION.md](./PROTOCOL_ABSTRACTION.md)
- [EVENT_MODEL.md](./EVENT_MODEL.md)
- [../concepts/PROVENANCE.md](../concepts/PROVENANCE.md)
