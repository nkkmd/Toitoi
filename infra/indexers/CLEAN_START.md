# クリーンスタートについて

**Status: current** | **Last updated: 2026-06-08**

`infra/indexers/` のクリーンスタート手順です。  
ここでいうクリーンスタートは、**API の参照先になっている storage / snapshot を初期化し、必要なら replay で再構築してから再起動すること**を意味します。

現行仕様では、単一 protocol の運用でも multi-transport の運用でも、まず `TOITOI_PROTOCOL` か `TOITOI_TRANSPORT_SOURCES` に対応する storage を空にします。  
Nostr relay が複数ある場合は、relay ごとに storage を分けて個別に初期化します。

## 手順

1. `toitoi-api` と、対象 protocol の ingest worker / writer を停止する
1. 対象の `storage-dir` を削除する、または中身を空にする
1. 必要に応じて `replay_cli.js` で raw event から `canonical-events.jsonl` / `ingest-log.jsonl` / `index-snapshot.json` を再構築する
1. 同じ `TOITOI_PROTOCOL` / `TOITOI_TRANSPORT_SOURCES` で API を再起動する

## 初期化対象

- 単一 protocol 運用: `TOITOI_PROTOCOL=<name>` に対応する `TOITOI_STORAGE_DIR`
- multi-transport 運用: `TOITOI_TRANSPORT_SOURCES` に列挙した各 `storageDir`
- 複数 Nostr relay 運用: relay ごとに分けた storage

保存対象の目安は次の 4 つです。

- `raw-events.jsonl`
- `canonical-events.jsonl`
- `ingest-log.jsonl`
- `index-snapshot.json`

`raw-events.jsonl` を source of truth とし、canonicalized event と index snapshot は replay で再生成します。

## 停止と再開の例

```bash
# PM2 で運用している場合
pm2 stop toitoi-api toitoi-nostr-worker toitoi-atproto-worker

# systemd timer で Nostr worker を回している場合
sudo systemctl stop toitoi-nostr-worker.timer
sudo systemctl stop toitoi-nostr-worker.service

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

```bash
# ATProto の場合
TOITOI_PROTOCOL=atproto TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
node packages/nostr/storage/replay_cli.js --protocol atproto --storage-dir /path/to/storage --verify
```

```bash
# multi-transport の場合
TOITOI_TRANSPORT_SOURCES='[{"protocol":"nostr","storageDir":"/path/to/nostr-storage"},{"protocol":"atproto","storageDir":"/path/to/atproto-storage"}]' pnpm --filter @toitoi/api start
```

`TOITOI_TRANSPORT_SOURCES` で起動していた場合は、再開時も同じ source 配列を指定します。  
Nostr relay が複数ある場合は、replay 後も relay ごとに分けた storage を `TOITOI_TRANSPORT_SOURCES` に並べます。

## 補足

- `--protocol` は対象 protocol に合わせて切り替えます
- `--verify` 付き replay は、再構築後の整合性確認に使います
- API だけを再起動しても、storage が空のままなら検索結果は空になります

## 参照

- [README.md](./README.md)
- [INDEXER_API_SETUP.md](./INDEXER_API_SETUP.md)
- [docs/architecture/MULTI_PROTOCOL_INDEXER.md](../../docs/architecture/MULTI_PROTOCOL_INDEXER.md)
- [docs/operations/PROTOCOL_OPERATION_TEMPLATE.md](../../docs/operations/PROTOCOL_OPERATION_TEMPLATE.md)
