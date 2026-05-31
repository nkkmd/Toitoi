# Nostr Indexer Wrapper

`infra/indexers/nostr/` は、Nostr 固有の移行用 wrapper と補助資料を置く場所です。

共通の multi-protocol indexer 構築手順は [../INDEXER_API_SETUP.md](../INDEXER_API_SETUP.md) を参照してください。

## ここで扱うもの

- Nostr transport と接続するときの補助情報
- 既存 Nostr 運用から multi-protocol へ移行するときの参照先
- transport ingest と indexer 共通手順の接続点

## Nostr 側の見方

- transport ingest: `infra/transports/nostr/`
- replay CLI: `packages/nostr/storage/replay_cli.js --protocol nostr`
- API 起動: `TOITOI_PROTOCOL=nostr TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start`

## Nostr だけに残る差分

- relay ingest worker は Nostr 専用
- transport archive や relay 設定は Nostr 側で管理する
- indexer / API / replay の基本形は protocol-aware に共通化済み

## 関連

- [../README.md](../README.md)
- [../CLEAN_START.md](../CLEAN_START.md)
- [../../transports/nostr/README.md](../../transports/nostr/README.md)
