# Nostr Storage and Replay

**Status: evolving** | **Last updated: 2026-05-21**

## 目的

Toitoi の Nostr ingest を append-only に保存し、raw event から再 canonicalize し直せるようにするための運用メモです。

`nak req -k 1042` で作る transport archive とは別に、こちらは `packages/nostr/storage` が保持する storageDir の運用メモです。

## 保存レイアウト

- `raw-events.jsonl`
- `canonical-events.jsonl`
- `ingest-log.jsonl`
- `index-snapshot.json`

この4つは `storageDir` の中に置かれる運用ファイルです。

- `raw-events.jsonl` / `canonical-events.jsonl` / `ingest-log.jsonl` は ingest の保存処理で追記されます
- `index-snapshot.json` は replay の結果として再生成されます
- API を起動しただけでは作成されません

## 使い方

- JSONL ingest では `--storage-dir <dir>` を付ける
- relay worker では `--storage-dir <dir>` または `RELAY_STORAGE_DIR` を使う
- 保存後の replay は `packages/nostr/storage/replay.js` の `replayStorage()` を使う
- CLI で replay する場合は `node packages/nostr/storage/replay_cli.js --storage-dir <dir>` を使う

## 復旧手順

1. `raw-events.jsonl` が残っていればそれを source of truth として replay する
2. `replayStorage(storageDir)` を実行して canonical event と index snapshot を再生成する
3. 必要なら `index-snapshot.json` をバックアップから比較して差分確認する

バックアップと復旧の詳細な運用手順は [infra/transports/nostr/BACKUP_AND_RESTORE.md](../../infra/transports/nostr/BACKUP_AND_RESTORE.md) を参照してください。

## 注意

- raw event を消さない
- canonical event を上書きしない
- replay の結果は別 batch として追記する
- 置換や修復は新しい event として表現する
