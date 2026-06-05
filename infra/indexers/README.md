# Indexer Ops

`infra/indexers/` は、Canonical Event を共通入力にする indexer の運用入口です。
ここには実装本体は置かず、起動・復旧・再構築の共通手順だけを置きます。

## 全体像

```text
infra/indexers/
├─ INDEXER_API_SETUP.md   -> multi-protocol indexer の構築手順
├─ CLEAN_START.md         -> storage / snapshot / multi-transport の初期化手順
```

## 使い分け

- [INDEXER_API_SETUP.md](./INDEXER_API_SETUP.md)
- [CLEAN_START.md](./CLEAN_START.md)
- [docs/architecture/MULTI_PROTOCOL_INDEXER.md](../../docs/architecture/MULTI_PROTOCOL_INDEXER.md)
- [docs/roadmap/IMPLEMENTATION_PLAN.md](../../docs/roadmap/IMPLEMENTATION_PLAN.md)

## 実行の入口

- API 起動: `TOITOI_PROTOCOL=<name> TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start`
- multi-transport API 起動: `TOITOI_TRANSPORT_SOURCES='[{"protocol":"nostr","storageDir":"/path/to/nostr-storage"},{"protocol":"atproto","storageDir":"/path/to/atproto-storage"}]' pnpm --filter @toitoi/api start`
- 複数 Nostr relay を扱う場合は、relay ごとに storage を分けて `TOITOI_TRANSPORT_SOURCES` に並べる
- replay: `node packages/nostr/storage/replay_cli.js --protocol <name> --storage-dir /path/to/storage --verify`
- multi-transport replay の統合: `apps/api/server.js` と `packages/protocol/multi_transport_replay.js`
- protocol 選択の基盤: `packages/protocol/protocol_runtime.js` と `packages/protocol/protocol_storage_runtime.js`
