# Nostr Transport Ops

`infra/transports/nostr/` は、Nostr relay からの ingest を運用するための入口を置く場所です。

ここは library 層ではなく、実運用や統合確認のための薄い入口です。  
本体ロジックは `packages/nostr/adapter/` と `packages/nostr/storage/` にあります。

## 全体像

```text
relay subscription
      |
      v
relay_ingest_worker.js
      |
      +--> packages/nostr/adapter/relay_ingest.js
      |
      +--> packages/nostr/storage/persistence.js
      |
      +--> packages/nostr/storage/replay.js
      |
      +--> apps/api/standard_api_service.js (e2e checks)
```

## 主なファイル

- `relay_ingest_worker.js`: relay ingest の運用 worker
- `test_relay_ingest_worker.js`: worker の引数と出力の契約確認
- `test_operational_e2e.js`: ingest から replay までの通し確認
- `test_relay.js`: relay 実接続の統合テスト

## 呼び出し関係

- `relay_ingest_worker.js` が `packages/nostr/adapter/relay_ingest.js` を呼びます
- `relay_ingest_worker.js` が `packages/nostr/storage/persistence.js` を呼びます
- `test_operational_e2e.js` が `packages/nostr/adapter/ingest_pipeline.js`、`packages/nostr/storage/replay.js`、`apps/api/standard_api_service.js` を横断的に使います
- `test_relay_ingest_worker.js` が worker の引数解析と書き出しを検証します

## どこで使うか

- Nostr relay の ingest を実運用したいとき
- storage へ保存して replay したいとき
- ingest と API の接続を通しで確認したいとき

## 依存先

- `packages/nostr/adapter/relay_ingest.js`
- `packages/nostr/storage/persistence.js`
- `packages/nostr/storage/replay.js`
- `apps/api/standard_api_service.js` を含む上位層との接続確認

## 使い分け

- `packages/nostr/adapter/`: event をどう受けるかのロジック
- `packages/nostr/storage/`: 保存・replay・index のロジック
- `infra/transports/nostr/`: それらをどう運用するか
