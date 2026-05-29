# 運用ガイド: Nostr インデクサーのクリーンスタート

**Version: 0.1.0** | **Status: evolving** | **Last updated: 2026-05-29**

本ドキュメントは、Nostr インデクサー側の DB を破棄して、クリーンな状態から再構築するための手順です。

**既存イベントとの互換性が失われる設定変更を行う際**に実施してください。本手順を実行すると、`toitoi_db` に保持されたインデクサー用データが完全に削除されます。**必ず内容を十分に理解した上で実行してください。**

リレー側のクリーンスタートは別手順です。必要な場合は [infra/transports/nostr/CLEAN_START.md](../../transports/nostr/CLEAN_START.md) を参照してください。

必要なら、先に [infra/transports/nostr/BACKUP_AND_RESTORE.md](../../transports/nostr/BACKUP_AND_RESTORE.md) を参照して `packages/nostr/storage` の storage を退避してください。

## どこで使うか

- 対象: インデクサー運用者
- 使用場面: DB スキーマの再作成、破損復旧、互換性のない設定変更後
- 関連実装: `infra/indexers/nostr/INDEXER_API_SETUP.md`

---

## 1. 事前確認

本手順を実行する前に、以下を確認してください。

* `toitoi-worker` と `toitoi-api` の停止が可能であること。
* 変更内容が確定していること。
* 必要に応じて `packages/nostr/storage` のバックアップがあること。

---

## 2. インデクサーの停止

```bash
pm2 stop toitoi-worker toitoi-api
```

---

## 3. インデクサー用 DB の完全削除

```bash
sudo docker exec -it nostream-db psql -U nostr_ts_relay -d postgres
```

PostgreSQL のプロンプト (`postgres=#`) が表示されたら、以下を実行します。

```sql
DROP DATABASE IF EXISTS toitoi_db;
DROP ROLE IF EXISTS toitoi_user;
CREATE USER toitoi_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE toitoi_db OWNER toitoi_user TEMPLATE template0;
GRANT ALL PRIVILEGES ON DATABASE toitoi_db TO toitoi_user;
\q
```

次に、`toitoi_db` へ接続して全文検索拡張を有効化します。

```bash
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db
```

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\q
```

---

## 4. Prisma によるテーブル再作成

作業場所: clone した Toitoi リポジトリの root  
編集対象ファイル: Prisma schema

```bash
npx prisma db push
npx prisma generate
```

完了後、GIN インデックスを作成します。

```bash
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db
```

```sql
CREATE INDEX IF NOT EXISTS idx_event_content_trgm
  ON "Event" USING gin (content gin_trgm_ops);
\q
```

SyncState（ワーカーの同期しおり）が空であることを確認します。

```bash
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db
```

```sql
SELECT * FROM "SyncState";
-- 0 rows が返れば正常（初期状態）
\q
```

---

## 5. 設定ファイルの修正と反映

### 例) `relay_ingest_worker.js` の修正

設定変更がある場合は、以下のファイルを編集してください。

```bash
nano infra/transports/nostr/relay_ingest_worker.js
```

### 例) `ecosystem.config.cjs` の修正

PM2 の起動設定を変更した場合は、clone した Toitoi リポジトリの root で設定を更新してください。

---

## 6. 全プロセスの再起動

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
```

---

## 7. 動作確認

```bash
# ワーカーのログ確認
pm2 logs toitoi-worker --lines 30

# API の疎通確認
curl https://api.your-domain.com/health
curl https://api.your-domain.com/api/v1/inquiries

# 必要に応じて再投入・再構築の確認
pnpm --filter @toitoi/nostr replay -- --storage-dir /path/to/storage --verify
```

---

## 8. 関連

- [infra/indexers/nostr/INDEXER_API_SETUP.md](./INDEXER_API_SETUP.md)
- [infra/transports/nostr/BACKUP_AND_RESTORE.md](../../transports/nostr/BACKUP_AND_RESTORE.md)
- [infra/transports/nostr/CLEAN_START.md](../../transports/nostr/CLEAN_START.md)
