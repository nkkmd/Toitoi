# クリーンスタートについて

**Version: 0.4.0** | **Status: current** | **Last updated: 2026-05-30**

このファイルは、現行仕様のクリーンスタート手順を整理したものです。

現在のインデクサー運用は append-only storage ベースです。クリーンスタートは、**`/path/to/storage` を削除して空にする**ことを意味します。

手順は次のとおりです。

1. `toitoi-api` と `toitoi-worker` を停止する
1. `/path/to/storage` を削除する、または中身を空にする
1. 必要に応じて `pnpm --filter @toitoi/nostr replay -- --storage-dir /path/to/storage --verify` で再構築する

初期化や復旧が必要な場合は、まず以下を参照してください。

- [infra/transports/nostr/BACKUP_AND_RESTORE.md](../../transports/nostr/BACKUP_AND_RESTORE.md)
- [infra/transports/nostr/README.md](../../transports/nostr/README.md)
- [infra/indexers/nostr/INDEXER_API_SETUP.md](./INDEXER_API_SETUP.md)
