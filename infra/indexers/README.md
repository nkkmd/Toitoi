# Indexer Ops

`infra/indexers/` は、Canonical Event を共通入力にする indexer の運用入口です。

ここには protocol 固有の実装本体は置かず、`apps/api/` と `packages/<protocol>/storage/` を組み合わせて、どの protocol でも同じ運用手順で起動・復旧・再構築できるようにする入口を置きます。

## 全体像

```text
infra/indexers/
├─ INDEXER_API_SETUP.md   -> multi-protocol indexer の構築手順
├─ CLEAN_START.md         -> storage / snapshot の初期化手順
└─ nostr/                 -> Nostr 固有の補助資料・移行用 wrapper
```

## 現行の考え方

- indexer は canonical semantics を変形しない
- protocol 固有の validate / verify / normalize / dedupe / ordering は adapter 側に閉じる
- replay と API の参照形は protocol 横断で揃える
- protocol ごとの差分は registry と metadata に寄せる

## まず読むもの

- [INDEXER_API_SETUP.md](./INDEXER_API_SETUP.md)
- [CLEAN_START.md](./CLEAN_START.md)
- [docs/architecture/MULTI_PROTOCOL_INDEXER.md](../../docs/architecture/MULTI_PROTOCOL_INDEXER.md)
- [docs/roadmap/IMPLEMENTATION_PLAN.md](../../docs/roadmap/IMPLEMENTATION_PLAN.md)

## 実行の入口

- API 起動: `TOITOI_PROTOCOL=<name> TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start`
- replay: `node packages/nostr/storage/replay_cli.js --protocol <name> --storage-dir /path/to/storage --verify`
- protocol 選択の基盤: `packages/protocol/protocol_runtime.js` と `packages/protocol/protocol_storage_runtime.js`

## プロトコルごとの差分

- `nostr`: 現行の first operational transport に対応
- `atproto`: append-only storage と replay が利用可能
- `localfs`: runtime replay は未対応

Nostr 固有の初期化や relay 側の作業は、`infra/indexers/nostr/` と `infra/transports/nostr/` に残します。
