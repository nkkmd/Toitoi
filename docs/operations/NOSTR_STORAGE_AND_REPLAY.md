# 運用ガイド：Nostr Storage のバックアップと replay

**Version: 0.2.1** | **Status: evolving** | **Last updated: 2026-06-02**

本ドキュメントは、Toitoi の Nostr ingest / replay / API 運用で使う append-only storage を安全にバックアップし、障害時に復旧するための手順です。

この文書は、protocol ごとの運用テンプレート [PROTOCOL_OPERATION_TEMPLATE.md](./PROTOCOL_OPERATION_TEMPLATE.md) の Nostr 具体版です。

## どこで使うか

- 対象: Nostr 運用者、インデクサー運用者、障害対応担当
- 使用場面: 日次バックアップ、障害復旧、クリーンスタート前の退避、API 起動前の整合性確認
- 関連実装: `packages/nostr/storage/persistence.js`、`packages/nostr/storage/replay.js`

## 0. API 運用との接続

Nostr を API に載せる場合は、canonical view を返す Standard API と接続します。

- `TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start`
- `TOITOI_PROTOCOL=nostr TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start`
- `/health` で `storage.supported: true` になることを確認する
- `/api/v1/protocols/nostr` で `provenancePolicy` と `storage` を確認する
- `lookup` / `list` / `query` / `relation` / `tree` は canonical view のまま扱う
- live replay と API 疎通は、バックアップや復旧の前後で必要なときだけ実行する

### API チェック例

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/v1/protocols/nostr
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
curl "http://127.0.0.1:3000/api/v1/inquiries/query?q=soil_microbe"
```

- `/api/v1/protocols/nostr` では `provenancePolicy` と `storage` の両方を確認する
- `/api/v1/inquiries?limit=1` で canonical list の形を確認する
- `/api/v1/inquiries/query` で search path が canonical view のまま返ることを確認する

---

## 1. 基本方針

- raw event を一次保管する
- canonicalized event と index snapshot は再生成可能な成果物として扱う
- 置換や修復は上書きではなく、新しい batch として追記する
- 復旧後は replay と API 疎通で整合性を確認する
- transport archive がある場合は、storage backup と組み合わせて source of truth を二重化する

現行実装では、`packages/nostr/storage/` が append-only storage の中心です。バックアップ対象は storage ディレクトリ全体です。

---

## 2. バックアップ対象

最低限、次のファイルを含めます。

- `raw-events.jsonl`
- `canonical-events.jsonl`
- `ingest-log.jsonl`
- `index-snapshot.json`

補足:

- `raw-events.jsonl` / `canonical-events.jsonl` / `ingest-log.jsonl` は ingest 保存時に追記されます
- `index-snapshot.json` は replay の結果として再生成されます
- API を起動しただけでは作成されません
- transport archive は別レイヤーです。`nak req -k 1042` で作る raw transport archive は、storage backup を置き換えるものではありません

運用上は、storage ディレクトリを丸ごとアーカイブするのが最も安全です。これにより、raw event と canonicalized event の両方をまとめて保持できます。

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
- `~/nostr-archive/agroecology-commons/inquiry*.jsonl`
- `docs/roadmap/IMPLEMENTATION_PLAN.md`
- `docs/operations/PROTOCOL_OPERATION_TEMPLATE.md`
- `infra/transports/nostr/OPERATION_CHECKLIST.md`

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
pnpm --filter @toitoi/nostr replay -- --protocol nostr --storage-dir /path/to/storage --verify
```

`--verify` は、raw event から再 canonicalize する際に検証を再実行したい場合に使います。通常運用では、まず既存 storage を優先して復旧し、その後に必要な検証を追加してください。`provenance` や `rawRef` の欠損がないかも合わせて確認してください。

### 4.4 API の疎通確認

```bash
TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
```

`@toitoi/nostr` と `@toitoi/api` を使うと、復旧と疎通確認を workspace の入口だけで完結できます。

---

## 5. データ欠落時の再同期

raw-events.jsonl が残っている場合は、そこを source of truth として replay します。canonical-events.jsonl はそこから再生成される派生物として扱います。

raw-events.jsonl が失われている場合は、canonical-events.jsonl と index-snapshot.json を使って最低限の読み出しを復旧できますが、完全な再同期はできません。`provenance` の一部が残らない可能性があるため、復旧ログに明記します。

その場合は、可能であれば次の順で対処します。

1. 直近のバックアップを探す
2. そのバックアップから replay する
3. transport archive が残っているなら、そこから relay へ再投入する
4. relay 側の再取得が必要なら、対象期間を絞って ingest をやり直す
5. 必要に応じて `infra/transports/nostr/OPERATION_CHECKLIST.md` を参照して手順を揃える

---

## 6. 復旧後の確認項目

- `raw-events.jsonl` が読み込める
- `index-snapshot.json` が再生成される
- `/health` が 200 を返す
- `lookup` / `list` / `query` / `relation` / `tree` が期待通り動く
- replay を `--verify` 付きで実行した場合は、invalid / duplicate / verify failure の扱いが想定通りかも確認する

---

## 7. 関連

- [PROTOCOL_OPERATION_TEMPLATE.md](./PROTOCOL_OPERATION_TEMPLATE.md)
- [packages/nostr/README.md](../../packages/nostr/README.md)
- [packages/nostr/storage/README.md](../../packages/nostr/storage/README.md)
- [infra/transports/nostr/OPERATION_CHECKLIST.md](../../infra/transports/nostr/OPERATION_CHECKLIST.md)
- [packages/nostr/storage/replay_cli.js](../../packages/nostr/storage/replay_cli.js)
