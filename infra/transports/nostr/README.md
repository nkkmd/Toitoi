# Nostr Transport Ops

`infra/transports/nostr/` は、Nostr relay からの ingest を運用するための入口を置く場所です。

ここは library 層ではなく、実運用や統合確認のための薄い入口です。  
本体ロジックは `@toitoi/nostr/adapter/` と `@toitoi/nostr/storage/` にあります。

このリポジトリをまだ clone していない場合は、先に取得してから読むと流れが追いやすいです。

## 全体像

```text
relay subscription
      |
      v
relay_ingest_worker.js
      |
      +--> @toitoi/nostr/adapter/relay_ingest.js
      |
      +--> @toitoi/nostr/storage/persistence.js
      |
      +--> @toitoi/nostr/storage/replay.js
      |
      +--> apps/api/standard_api_service.js (e2e checks)
```

## 主なファイル

- `relay_ingest_worker.js`: relay ingest の運用 worker
- `test_relay_ingest_worker.js`: worker の引数と出力の契約確認
- `test_operational_e2e.js`: ingest から replay までの通し確認
- `test_relay.js`: relay 実接続の統合テスト

## 呼び出し関係

- `relay_ingest_worker.js` が `@toitoi/nostr/adapter/relay_ingest.js` を呼びます
- `relay_ingest_worker.js` が `@toitoi/nostr/storage/persistence.js` を呼びます
- `test_operational_e2e.js` が `@toitoi/nostr/adapter/ingest_pipeline.js`、`@toitoi/nostr/storage/replay.js`、`apps/api/standard_api_service.js` を横断的に使います
- `test_relay_ingest_worker.js` が worker の引数解析と書き出しを検証します

## どこで使うか

- Nostr relay の ingest を実運用したいとき
- storage へ保存して replay したいとき
- ingest と API の接続を通しで確認したいとき

## pnpm 入口

- 起動: `pnpm --filter @toitoi/nostr-transport start -- --relay-url wss://relay.example.com`
- protocol 選択: `pnpm --filter @toitoi/nostr-transport start -- --relay-url wss://relay.example.com --protocol nostr`
- テスト: `pnpm --filter @toitoi/nostr-transport test`
- replay: `pnpm --filter @toitoi/nostr replay -- --storage-dir /path/to/storage --verify`
- `pnpm` に不慣れなら: [pnpm Workspace 早見表](../../../docs/operations/PNPM_WORKSPACE_GUIDE.md)

## 依存先

- `@toitoi/nostr/adapter/relay_ingest.js`
- `@toitoi/nostr/storage/persistence.js`
- `@toitoi/nostr/storage/replay.js`
- `apps/api/standard_api_service.js` を含む上位層との接続確認

## 使い分け

- `@toitoi/nostr/adapter/`: event をどう受けるかのロジック
- `@toitoi/nostr/storage/`: 保存・replay・index のロジック
- `infra/transports/nostr/`: それらをどう運用するか
