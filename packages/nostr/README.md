# Nostr Package

`packages/nostr/` は、Toitoi の first operational transport としての Nostr 実装をまとめる場所です。

この配下は、次の3層に分けて考えると追いやすいです。

- `adapter/`: raw event の検証・正規化・canonical 化
- `converter/`: canonical と Nostr 表現の相互変換
- `storage/`: append-only 保存、replay、derived index

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
- `storage/`: 保存、replay、index、API 向け view

## 呼び出し関係

- `protocol.js` は `packages/protocol/` の descriptor helper を使って Nostr の公開入口を作ります
- `protocol.js` は `adapter/` と `converter/` の関数を束ねます
- `infra/transports/nostr/relay_ingest_worker.js` は `adapter/` と `storage/` を運用経路として使います
- `apps/api/standard_api_service.js` は `storage/` が提供する index と view を使います
- `packages/nostr/adapter/` は raw event の受け口です
- `packages/nostr/storage/` は replay と index の受け口です

## 依存関係

- `protocol.js` は `protocol/` と `adapter/` と `converter/` を束ねます
- `adapter/` は raw event を受けて分類します
- `storage/` は `adapter/` の結果を永続化し、API が読める形に整えます
- `infra/transports/nostr/` はここを運用面から呼び出します
