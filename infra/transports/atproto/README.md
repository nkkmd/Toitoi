# ATProto Transport Ops

`infra/transports/atproto/` は、ATProto の JSONL batch ingest と Jetstream live ingest を運用するための入口を置く場所です。

ここは library 層ではなく、運用や統合確認のための薄い入口です。  
本体ロジックは `@toitoi/atproto/adapter/` と `@toitoi/atproto/storage/` にあります。

## 全体像

```text
jsonl archive
      |
      v
atproto_ingest_worker.js
      |
      +--> @toitoi/atproto/adapter/ingest_pipeline.js
      |
      +--> @toitoi/atproto/storage/persistence.js
      |
      +--> @toitoi/atproto/storage/replay.js

jetstream websocket
      |
      v
atproto_ingest_worker.js
```

## 主なファイル

- `atproto_ingest_worker.js`: ATProto batch / live ingest の運用 worker
- `test_atproto_ingest_worker.js`: worker の引数と出力の契約確認

## 呼び出し関係

- `atproto_ingest_worker.js` が `@toitoi/atproto/adapter/ingest_pipeline.js` を呼びます
- `atproto_ingest_worker.js` が `@toitoi/atproto/storage/persistence.js` を呼びます
- live mode では `ws` を使って Jetstream の websocket に接続します

## どこで使うか

- ATProto の raw JSONL を canonicalize して storage に積みたいとき
- Jetstream から常時接続で取り込みたいとき
- replay の前段として batch ingest をかけたいとき
- ingest と API の接続を通しで確認したいとき

## pnpm 入口

- 起動: `pnpm --filter @toitoi/atproto-transport start -- --in <raw.jsonl> --out <result.jsonl> --storage-dir /path/to/storage`
- live 起動: `pnpm --filter @toitoi/atproto-transport start -- --stream-url wss://jetstream.example/subscribe --storage-dir /path/to/storage`
- `start` 直後の `--` は `pnpm` の区切りですが、この worker はそれを無視します。
- テスト: `pnpm --filter @toitoi/atproto-transport test`
