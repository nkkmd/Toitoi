# 運用ガイド: Nostr DB-backed Production Mode のクリーンスタート

**Version: 0.3.0** | **Status: evolving** | **Last updated: 2026-05-30**

本ドキュメントは、`infra/indexers/nostr/INDEXER_API_SETUP.md` の **DB-backed Production Mode** で構築した環境を、`nostream-db` と `toitoi_db` からクリーンに再初期化するための手順です。

現行のリポジトリ内には Prisma の実装はありません。したがって、この手順では `prisma db push` は使わず、DB コンテナと `toitoi_db` を SQL で再作成し、PM2 と監視を再起動します。

**既存イベントとの互換性が失われる設定変更を行う際**に実施してください。**必ず内容を十分に理解した上で実行してください。**

リレー側のクリーンスタートは別手順です。必要な場合は [infra/transports/nostr/CLEAN_START.md](../../transports/nostr/CLEAN_START.md) を参照してください。

必要なら、先に [infra/transports/nostr/BACKUP_AND_RESTORE.md](../../transports/nostr/BACKUP_AND_RESTORE.md) を参照して `packages/nostr/storage` の storage を退避してください。

## どこで使うか

- 対象: DB-backed Production Mode のインデクサー運用者
- 使用場面: `nostream-db` の再初期化、`toitoi_db` の再作成、互換性のない設定変更後
- 関連実装: `infra/indexers/nostr/INDEXER_API_SETUP.md`、`infra/transports/nostr/MONITOR_SETUP.md`

---

## 1. 事前確認

本手順を実行する前に、以下を確認してください。

* `toitoi-worker` と `toitoi-api` の停止が可能であること。
* 変更内容が確定していること。
* 必要に応じて `packages/nostr/storage` のバックアップがあること。
* `~/nostream/` の作業権限があること。

---

## 2. 監視とプロセスの停止

```bash
sudo systemctl stop toitoi-monitor
pm2 stop toitoi-worker toitoi-api
```

---

## 3. Nostream と PostgreSQL データの初期化

作業場所: `~/nostream/`

```bash
cd ~/nostream
sudo docker compose up -d
```

この手順では relay 側の永続データは削除しません。`nostream` / `nostream-db` は起動したままにして、`toitoi_db` だけを再作成します。

コンテナの起動が落ち着くまで少し待ってから、リレーのログを確認します。

```bash
sudo docker compose logs nostream | tail -20
```

---

## 4. `toitoi_db` の再作成

`postgres` データベースに入り、Toitoi 用のユーザーと DB を作成します。

```bash
sudo docker exec -it nostream-db psql -U nostr_ts_relay -d postgres
```

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

`SyncState` を使う運用で構築している場合は、初期状態が空であることを確認します。

```bash
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db
```

```sql
SELECT * FROM "SyncState";
-- 0 rows が返れば正常（初期状態）
\q
```

---

## 5. PM2 と設定の再反映

作業場所: clone した Toitoi リポジトリの root

PM2 の設定を変更している場合は、`ecosystem.config.cjs` を反映し直します。

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
```

必要なら、worker の設定も確認します。

```bash
nano infra/transports/nostr/relay_ingest_worker.js
```

---

## 6. 動作確認

```bash
# PM2 の確認
pm2 logs toitoi-worker --lines 30

# API の疎通確認
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"

# DB-backed mode の確認
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db -c 'SELECT 1;'
```

`nostream-db` が共有 DB として運用されている場合は、`toitoi-api` / `toitoi-worker` の両方が復帰していることを確認します。

---

## 7. 関連

- [infra/indexers/nostr/INDEXER_API_SETUP.md](./INDEXER_API_SETUP.md)
- [infra/transports/nostr/MONITOR_SETUP.md](../../transports/nostr/MONITOR_SETUP.md)
- [infra/transports/nostr/BACKUP_AND_RESTORE.md](../../transports/nostr/BACKUP_AND_RESTORE.md)
- [infra/transports/nostr/CLEAN_START.md](../../transports/nostr/CLEAN_START.md)
