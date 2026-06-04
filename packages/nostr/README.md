# Nostr Package

`packages/nostr/` は、Toitoi の first operational transport としての Nostr 実装をまとめる場所です。

この配下は、次の3層に分けて考えると追いやすいです。

- `adapter/`: raw event の検証・正規化・canonical 化
- `converter/`: canonical と Nostr 表現の相互変換
- `live/`: relay への outbound publish helper
- `storage/`: append-only 保存、replay、derived index
- transport schema template: [docs/protocols/INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md](../../docs/protocols/INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md)
- transport schema: [docs/protocols/NOSTR_INQUIRY_SCHEMA.md](../../docs/protocols/NOSTR_INQUIRY_SCHEMA.md)
- machine-readable schema: [schemas/nostr-inquiry.schema.json](../../schemas/nostr-inquiry.schema.json)

## 全体像

```text
protocol.js
   |
   +--> adapter/nostr_adapter.js
   |       |
   |       +--> adapter/ingest_pipeline.js
   |       +--> adapter/relay_ingest.js
   |       +--> adapter/ingest_jsonl.js
   |
   +--> converter/canonical_to_nostr_converter.js
   |
   +--> storage/
           |
           +--> replay.js -> indexer.js -> standard_api_views.js
```

## 主なファイル

- `protocol.js`: Nostr の protocol descriptor と公開入口
- `adapter/`: ingest と canonical 化の中心
- `converter/`: canonical から Nostr draft への変換
- `live/`: relay publish 用の helper
- `storage/`: 保存、replay、index、API 向け view
- 運用ガイド: [docs/operations/NOSTR_STORAGE_AND_REPLAY.md](../../docs/operations/NOSTR_STORAGE_AND_REPLAY.md)
- outbound 運用: [MULTI_TRANSPORT_OUTBOUND_AND_DELIVERY.md](../../docs/operations/MULTI_TRANSPORT_OUTBOUND_AND_DELIVERY.md)

## 呼び出し関係

- `protocol.js` は `packages/protocol/` の descriptor helper を使って Nostr の公開入口を作ります
- `protocol.js` は `adapter/` と `converter/` の関数を束ねます
- `infra/transports/nostr/relay_ingest_worker.js` は `adapter/` と `storage/` を運用経路として使います
- `apps/api/standard_api_service.js` は `storage/` が提供する index と view を使います
- `packages/nostr/adapter/` は raw event の受け口です
- `packages/nostr/storage/` は replay と index の受け口です
- まず運用手順を確認したい場合は [NOSTR_STORAGE_AND_REPLAY.md](../../docs/operations/NOSTR_STORAGE_AND_REPLAY.md) を見ます

## 依存関係

- `protocol.js` は `protocol/` と `adapter/` と `converter/` を束ねます
- `adapter/` は raw event を受けて分類します
- `storage/` は `adapter/` の結果を永続化し、API が読める形に整えます
- `infra/transports/nostr/` はここを運用面から呼び出します
