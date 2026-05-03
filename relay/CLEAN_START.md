# 運用ガイド：既存データを破棄してクリーンスタートする方法

**バージョン：1.0**

本ドキュメントは、リレーおよびインデクサーに蓄積された既存データをすべて破棄し、クリーンな状態から再構築するための手順書です。

**既存イベントとの互換性が失われる設定変更を行う際**に実施してください。本手順を実行すると、リレーのPostgreSQLデータベースおよびインデクサーのデータベースに保存されたすべてのイベントが完全に削除されます。**必ず内容を十分に理解した上で実行してください。**

---

## 1. 事前確認

本手順を実行する前に、以下を確認してください。

* JSONLアーカイブが存在する場合、必要に応じて手元に退避させておくこと。
* `settings.yaml` および `worker.js` の変更内容が確定していること。
* 本番稼働中のリレーに外部からのアクセスがないか確認すること。

---

## 2. 全プロセスの停止

```
# インデクサーAPIとワーカーを停止
pm2 stop toitoi-worker toitoi-api

# Nostreamを停止
cd ~/nostream
sudo docker compose down
```

---

## 3. PostgreSQLデータの完全削除

```
# リレーおよびインデクサーが使用するDBデータを削除
sudo rm -rf ~/nostream/.nostr/data/*
sudo rm -rf ~/nostream/.nostr/db-logs/*
```

---

## 4. Nostreamの再起動とDB再初期化

```
cd ~/nostream
sudo docker compose up -d
```

DBの初期化が完了するまで30秒ほど待ってから、以下でログを確認してください。

```
sudo docker compose logs nostream | tail -20
```

以下のログが出力されていれば初期化成功です。

```
nostream  | ... "2 client workers started"
nostream  | ... "1 maintenance worker started"
```

---

## 5. インデクサー用DBの再作成

```
sudo docker exec -it nostream-db psql -U nostr_ts_relay -d postgres
```

PostgreSQLのプロンプト（`postgres=#`）が表示されたら、以下を実行します。

```
DROP DATABASE IF EXISTS toitoi_db;
DROP USER IF EXISTS toitoi_user;
CREATE USER toitoi_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE toitoi_db OWNER toitoi_user TEMPLATE template0;
GRANT ALL PRIVILEGES ON DATABASE toitoi_db TO toitoi_user;
\q
```

次に、`toitoi_db` へ接続して全文検索拡張を有効化します。

```
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db
```

```
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\q
```

---

## 6. Prismaによるテーブル再作成

```
cd ~/toitoi-indexer
npx prisma db push
npx prisma generate
```

完了後、GINインデックスを作成します。

```
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db
```

```
CREATE INDEX IF NOT EXISTS idx_event_content_trgm
  ON "Event" USING gin (content gin_trgm_ops);
\q
```

SyncState（ワーカーの同期しおり）が空であることを確認します。

```
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db
```

```
SELECT * FROM "SyncState";
-- 0 rows が返れば正常（初期状態）
\q
```

---

## 7. 設定ファイルの修正と反映

### settings.yaml の修正

設定変更がある場合は、以下のファイルを編集してください。

```
nano ~/nostream/.nostr/settings.yaml
```

修正後、Nostreamを再起動して設定を反映します。

```
cd ~/nostream
sudo docker compose restart nostream
```

### worker.js の修正

設定変更がある場合は、以下のファイルを編集してください。

```
nano ~/toitoi-indexer/worker.js
```

---

## 8. 全プロセスの再起動

```
cd ~/toitoi-indexer
pm2 start ecosystem.config.cjs --env production
pm2 save
```

---

## 9. 動作確認

```
# ワーカーのログ確認
pm2 logs toitoi-worker --lines 30

# リレーへのテスト送信
node test_relay.js

# リレーへの蓄積確認
nak req -k <kind番号> wss://relay.your-domain.com | jq .

# APIの疎通確認
curl https://api.your-domain.com/health
curl https://api.your-domain.com/api/v1/inquiries
```

---

## 10. JSONLアーカイブのリセット（任意）

クリーンスタートに合わせてJSONLアーカイブも初期化する場合は、以下を実行してください。

```
cd ~/nostr-archive/agroecology-commons

# 既存のJSONLファイルを削除
rm -f questions.jsonl questions_*.jsonl archive.log

# Gitに記録
git add -A
git commit -m "archive: Reset for clean start"
```

アーカイブを残したまま運用を継続する場合は、この手順は不要です。

---

*このガイドはデジタル・アグロエコロジー・コモンズ推進プロジェクトの一環として作成されました。*
*v1.0 — 2026年5月*