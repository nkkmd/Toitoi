# 運用ガイド：ATProto Storage のバックアップと replay

**Version: 0.2.2** | **Status: evolving** | **Last updated: 2026-06-03**

本ドキュメントは、Toitoi の ATProto ingest / replay / API 運用で使う append-only storage を安全にバックアップし、障害時に復旧するための手順です。

この文書は、protocol ごとの運用テンプレート [PROTOCOL_OPERATION_TEMPLATE.md](./PROTOCOL_OPERATION_TEMPLATE.md) の ATProto 具体版です。

## どこで使うか

- 対象: ATProto 運用者、インデクサー運用者、障害対応担当
- 使用場面: 日次バックアップ、障害復旧、クリーンスタート前の退避、live smoke 前の確認
- 関連実装: `packages/atproto/storage/persistence.js`、`packages/atproto/storage/replay.js`

## 0. API 運用との接続

ATProto を API に載せる場合は、Nostr と同じ Standard API の見え方に合わせます。

- `TOITOI_PROTOCOL=atproto TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start`
- `/health` で `storage.supported: true` になることを確認する
- `/api/v1/protocols/atproto` で `provenancePolicy` と `storage` を確認する
- `lookup` / `list` / `query` / `relation` / `tree` は canonical view のまま扱う
- live smoke は API 運用とは分けて、必要なときだけ gated で実行する
- live smoke の実行コマンドは `ATPROTO_LIVE_SMOKE_TEST=1 node packages/atproto/test_smoke.js`
- ATProto 内の duplicate はここで扱うが、Nostr など他 transport との semantic merge はここでは決めない

### API チェック例

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/v1/protocols/atproto
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
curl "http://127.0.0.1:3000/api/v1/inquiries/query?q=atproto"
```

- `/api/v1/protocols/atproto` では `provenancePolicy` と `storage` の両方を確認する
- `/api/v1/inquiries?limit=1` で canonical list の形を確認する
- `/api/v1/inquiries/query` で search path が canonical view のまま返ることを確認する

---

## 1. 基本方針

- raw record を一次保管する
- canonicalized event と index snapshot は再生成可能な成果物として扱う
- 置換や修復は上書きではなく、新しい batch として追記する
- 復旧後は replay と API 疎通で整合性を確認する
- live write は gated smoke test として扱い、本番運用の前提にしない

現行実装では、`packages/atproto/storage/` が append-only storage の中心です。バックアップ対象は storage ディレクトリ全体です。

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
- live smoke は `createRecord` のあとに `com.atproto.repo.getRecord` で再取得して、PDS 上の record 本文を照合します
- cross-source の同一性は保守的に扱い、明示的な根拠がない限り merge しません

---

## 3. バックアップ手順

### 3.1 事前停止

```bash
pm2 stop toitoi-api
```

必要に応じて、ATProto ingest を動かしている別プロセスも止めます。

### 3.2 storage の退避

```bash
tar -czf toitoi-atproto-storage-backup-$(date +%Y%m%d-%H%M%S).tgz -C /path/to/storage .
```

### 3.3 補助情報の退避

必要なら次も一緒に退避します。

- `packages/atproto/test_fixtures.js`
- `packages/atproto/test_smoke.js`
- `packages/atproto/README.md`
- `docs/operations/PROTOCOL_OPERATION_TEMPLATE.md`

---

## 4. 復旧手順

### 4.1 バックアップの展開

```bash
mkdir -p /path/to/storage
tar -xzf toitoi-atproto-storage-backup-YYYYMMDD-HHMMSS.tgz -C /path/to/storage
```

### 4.2 replay で再構築

ATProto は現時点で専用 CLI を持たないため、storage replay module を使って復旧します。

```bash
node -e "require('./packages/atproto/storage/replay').replayStorage('/path/to/storage')"
```

### 4.3 API の疎通確認

```bash
TOITOI_STORAGE_DIR=/path/to/storage TOITOI_PROTOCOL=atproto pnpm --filter @toitoi/api start
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
```

---

## 5. データ欠落時の再同期

raw-events.jsonl が残っている場合は、それを source of truth として replay します。canonical-events.jsonl はそこから再生成される派生物として扱います。

raw-events.jsonl が失われている場合は、canonical-events.jsonl と index-snapshot.json を使って最低限の読み出しを復旧できますが、完全な再同期はできません。`provenance` の一部が残らない可能性があるため、復旧ログに明記します。

その場合は、可能であれば次の順で対処します。

1. 直近のバックアップを探す
2. そのバックアップから replay する
3. `packages/atproto/test_fixtures.js` 由来の fixture で回帰確認する
4. 必要に応じて `ATPROTO_LIVE_SMOKE_TEST=1 node packages/atproto/test_smoke.js` を再実行する

---

## 6. 復旧後の確認項目

- `raw-events.jsonl` が読み込める
- `index-snapshot.json` が再生成される
- `/health` が 200 を返す
- `lookup` / `list` / `query` / `relation` / `tree` が期待通り動く
- gated live smoke を使う場合は `ATPROTO_LIVE_SMOKE_TEST=1 node packages/atproto/test_smoke.js` の条件下でのみ実施する

---

## 7. 関連

- [PROTOCOL_OPERATION_TEMPLATE.md](./PROTOCOL_OPERATION_TEMPLATE.md)
- [packages/atproto/README.md](../../packages/atproto/README.md)
- [packages/atproto/test_smoke.js](../../packages/atproto/test_smoke.js)
