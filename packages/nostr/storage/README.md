# Nostr Storage

`packages/nostr/storage/` は、Nostr ingest の保存・replay・index を担う層です。

ここは、raw event と canonicalized event を分けて保持し、再処理可能にするための基盤です。

## 全体像

```text
append_only_log.js
      |
      v
persistence.js
      |
      v
replay.js
      |
      +--> indexer.js
      |
      +--> standard_api_views.js
      |
      +--> replay_cli.js
```

## 主なファイル

- `append_only_log.js`: append-only JSONL の共通基盤
- `persistence.js`: raw / canonical / ingest log の保存
- `replay.js`: replay と derived index の再構築
- `indexer.js`: lookup / list / search / relation / lineage
- `standard_api_views.js`: API 向け canonical view
- `replay_cli.js`: replay 実行 CLI
- `index.js`: storage 系エクスポートの入口

## 呼び出し関係

- `persistence.js` は `adapter/ingest_jsonl.js` と `infra/transports/nostr/relay_ingest_worker.js` から呼ばれます
- `replay.js` は `apps/api/server.js` と `infra/transports/nostr/test_operational_e2e.js` から参照されます
- `indexer.js` は `apps/api/standard_api_service.js` の主な依存です
- `standard_api_views.js` は `apps/api/standard_api_service.js` と `test_standard_api_views.js` から使われます
- `replay_cli.js` は運用時の replay 入口です
- `replay_cli.js` は `--protocol` / `TOITOI_PROTOCOL` で protocol-aware に replay 先を選べます
- `index.js` は storage 関連の再公開用のまとめ入口です

## どこで使うか

- raw event を保存したいとき
- canonicalized event を追記したいとき
- storage snapshot から index を再生成したいとき
- API 用の canonical view を作りたいとき
- replay を CLI で実行したいとき

## テスト

- `test_persistence.js`
- `test_replay.js`
- `test_indexer.js`
- `test_standard_api_views.js`
- `test_replay_cli.js`
- `test_fixtures.js`

## 依存関係

- `persistence.js` は `append_only_log.js` を使います
- `replay.js` は `ingest_pipeline.js` の結果を元に index を再構築します
- `indexer.js` は `replay.js` が作る derived index を使います
- `standard_api_views.js` は `indexer.js` の結果を API 形に投影します
