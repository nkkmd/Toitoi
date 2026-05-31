# クリーンスタートについて

**Version: 0.6.1** | **Status: current** | **Last updated: 2026-05-31**

このファイルは、multi-protocol インデクサーのクリーンスタート手順を整理したものです。

現在の運用は append-only storage ベースです。クリーンスタートは、**`/path/to/storage` を削除して空にする**ことを意味します。

## 手順

1. `toitoi-api` と、protocol 固有の writer / worker を停止する
1. `/path/to/storage` を削除する、または中身を空にする
1. 必要に応じて `node packages/nostr/storage/replay_cli.js --protocol <name> --storage-dir /path/to/storage --verify` で再構築する

### 停止と再開の例

```bash
# PM2 で運用している場合
pm2 stop toitoi-api toitoi-worker

# 手動起動している場合
# 各ターミナルで Ctrl+C を押して止める
```

```bash
# PM2 で再開する場合
pm2 start ecosystem.config.cjs --env production
```

```bash
# 手動で再開する場合
TOITOI_PROTOCOL=nostr TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
node packages/nostr/storage/replay_cli.js --protocol nostr --storage-dir /path/to/storage --verify
```

`atproto` を再構築する場合は `--protocol atproto` に変えます。  
`localfs` は現時点で runtime replay が未対応なので、storage 再構築は行いません。

## 参照

- [README.md](./README.md)
- [INDEXER_API_SETUP.md](./INDEXER_API_SETUP.md)
- [docs/operations/PROTOCOL_OPERATION_TEMPLATE.md](../../docs/operations/PROTOCOL_OPERATION_TEMPLATE.md)
- [infra/indexers/nostr/CLEAN_START.md](./nostr/CLEAN_START.md)
