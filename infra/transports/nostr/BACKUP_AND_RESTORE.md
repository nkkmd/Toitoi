# 運用ガイド：Nostr Storage のバックアップと復旧

**Version: 0.1.0** | **Status: evolving** | **Last updated: 2026-05-22**

本ドキュメントは、Toitoi の Nostr ingest / replay / API 運用で使う append-only storage を安全にバックアップし、障害時に復旧するための手順です。

このガイドは、Phase 7 の運用整備で必要な

- バックアップ方針
- 復旧手順
- 再同期の確認方法

を 1 つにまとめています。

## どこで使うか

- 対象: リレー運用者、インデクサー運用者、障害対応担当
- 使用場面: 日次バックアップ、障害復旧、クリーンスタート前の退避
- 関連実装: `packages/nostr/storage/persistence.js`、`packages/nostr/storage/replay.js`

---

## 1. 基本方針

- raw event を一次保管する
- canonical event と index snapshot は再生成可能な成果物として扱う
- 置換や修復は上書きではなく、新しい batch として追記する
- 復旧後は replay と API 疎通で整合性を確認する

現行実装では、`packages/nostr/storage/` が append-only storage の中心です。バックアップ対象は storage ディレクトリ全体です。

---

## 2. バックアップ対象

最低限、次のファイルを含めます。

- `raw-events.jsonl`
- `canonical-events.jsonl`
- `ingest-log.jsonl`
- `index-snapshot.json`

運用上は、storage ディレクトリを丸ごとアーカイブするのが最も安全です。

---

## 3. バックアップ手順

### 3.1 事前停止

バックアップの前に、書き込み系を止めます。

```bash
sudo systemctl stop toitoi-monitor
pm2 stop toitoi-worker toitoi-api
```

### 3.2 storage の退避

```bash
tar -czf toitoi-storage-backup-$(date +%Y%m%d-%H%M%S).tgz -C /path/to/storage .
```

### 3.3 補助情報の退避

必要なら次も一緒に退避します。

- `examples/sample-nostr-archive.jsonl`
- `docs/roadmap/IMPLEMENTATION_PLAN.md`
- `docs/operations/NOSTR_STORAGE_AND_REPLAY.md`

---

## 4. 復旧手順

### 4.1 書き込み系の停止確認

```bash
sudo systemctl stop toitoi-monitor
pm2 stop toitoi-worker toitoi-api
```

### 4.2 バックアップの展開

```bash
mkdir -p /path/to/storage
tar -xzf toitoi-storage-backup-YYYYMMDD-HHMMSS.tgz -C /path/to/storage
```

### 4.3 replay で再構築

```bash
node packages/nostr/storage/replay_cli.js --storage-dir /path/to/storage --verify
```

`--verify` は、raw event から再 canonicalize する際に検証を再実行したい場合に使います。通常運用では、まず既存 storage を優先して復旧し、その後に必要な検証を追加してください。

### 4.4 API の疎通確認

```bash
TOITOI_STORAGE_DIR=/path/to/storage node apps/api/server.js
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
```

---

## 5. データ欠落時の再同期

raw-events.jsonl が残っている場合は、そこを source of truth として replay します。

raw-events.jsonl が失われている場合は、canonical-events.jsonl と index-snapshot.json を使って最低限の読み出しを復旧できますが、完全な再同期はできません。

その場合は、可能であれば次の順で対処します。

1. 直近のバックアップを探す
2. そのバックアップから replay する
3. relay 側の再取得が必要なら、対象期間を絞って ingest をやり直す

---

## 6. 復旧後の確認項目

- `raw-events.jsonl` が読み込める
- `index-snapshot.json` が再生成される
- `/health` が 200 を返す
- `lookup` / `list` / `query` / `relation` / `tree` が期待通り動く

---

## 7. 関連

- まず短く確認したい場合は [PHASE7_OPERATION_CHECKLIST.md](./PHASE7_OPERATION_CHECKLIST.md) を使う
- [NOSTR_STORAGE_AND_REPLAY.md](../../docs/operations/NOSTR_STORAGE_AND_REPLAY.md)
- [MONITOR_SETUP.md](./MONITOR_SETUP.md)
- [CLEAN_START.md](./CLEAN_START.md)
