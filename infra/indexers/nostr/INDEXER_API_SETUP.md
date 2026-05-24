# 構築ガイド：Canonical Event 中心のインデクサーAPI構築

**Version: 0.3.1** | **Status: evolving** | **Last updated: 2026-05-24**

> **現行参照実装:** `packages/nostr/adapter` が raw event の検証・正規化・canonicalize を担い、`apps/api/standard_api_service.js` と `apps/api/server.js` が canonical view を返す薄い service layer / HTTP entry です。Nostr 側の ingest は `infra/transports/nostr/relay_ingest_worker.js` が担い、`worker.js` という旧来のローカル実装名は歴史的表記として読むのが安全です。

本ドキュメントは、Toitoi の Canonical Event を前提に、Nostr transport から ingest された raw event を canonicalized event に変換し、Standard API として提供するためのセットアップ手順です。

メモリの少ない小規模なVPS（1GB〜2GB RAM）でも安定稼働させるため、保存層・再構築層・HTTP 参照層を分け、内部通信のオーバーヘッドを極力抑える設計を取ります。

## まず見るもの

- 立ち上げ手順の本体: このファイル
- リレー側の前提: [NOSTR_RELAY_SETUP.md](../../transports/nostr/NOSTR_RELAY_SETUP.md)
- API の呼び出し仕様: [apps/api/README.md](../../../apps/api/README.md)
- Nostr 変換層: [packages/nostr/adapter/](../../../packages/nostr/adapter/)
- 現行の派生 index 実装: `packages/nostr/storage/indexer.js`
- 再構築用の replay: `packages/nostr/storage/replay.js`
- canonical 変換の中核: `packages/nostr/adapter/ingest_pipeline.js`
- HTTP API の参照実装: `apps/api/server.js`, `apps/api/standard_api_service.js`
- ingest worker の参照実装: `infra/transports/nostr/relay_ingest_worker.js`

---

## 1. 統合アーキテクチャの概要とメリット

```text
[ スマホアプリ / Webフロントエンド ]
       │ (HTTPS通信)
       ▼
┌───────────────── サーバー本体 (Ubuntu Linux等) ─────────────────┐
│                                                               │
│  ①【統合Webサーバー】 Caddy                                     │
│       ├─ 役割: リレーとAPI両方のHTTPS通信を一括で引き受ける         │
│       ├──▶ リレー宛 (wss://relay...)  ──▶ 内部ポート: 8008へ転送 │
│       └──▶ API宛 (https://api...)     ──▶ 内部ポート: 3000へ転送 │
│                                                               │
│  ②【リレーエンジン】 Nostream (Docker コンテナ群)                 │
│       ├── nostream (ポート: 8008)  ◀── (ローカルループバック通信) ─┐│
│       └── nostream-db (PostgreSQL)                            ││
│            ├─ nostr_ts_relay (リレー用DB)                     ││
│            └─ toitoi_db      (インデクサー用DB) 【統合】        ││
│                 ▲ (内部ポート: 5432 でアクセス)                ││
│                 │                                             ││
│  ③【Standard API / Ingest Worker】 Node.js / PM2 (ホストOS上で稼働) ││
│       ├── toitoi-api    (apps/api/server.js, ポート: 3000)      ││
│       └── toitoi-worker (infra/transports/nostr/relay_ingest_worker.js) ─┘│
└───────────────────────────────────────────────────────────────┘
```

### 最適化の3つのポイント
1. **PostgreSQLエンジンの統合**: インデクサー用に新たなPostgreSQLをインストールせず、Nostreamのデータベースコンテナ内にインデクサー用のデータベース空間を作成します。これにより数百MB〜1GBのメモリを節約します。
2. **ワーカー通信のローカルループバック化**: ingest worker がリレーからデータを収集する際、インターネット経由ではなく、サーバー内部（`ws://localhost:8008`）で直接接続します。SSLの暗号化/復号のCPU負荷と通信のオーバーヘッドを完全にスキップします。
3. **Caddyの統合**: リレーと Standard API の両方のリバースプロキシを1つのCaddyプロセスで処理します。

---

## 2. 前提条件

- [PREREQUISITE_INSTALLATION.md] に従い、必須ソフトウェア（Git, Docker, Node.js等）のインストールが完了していること。
- [NOSTR_RELAY_SETUP.md] に従い、Nostream（リレー）の基本的な構築が完了していること。
- `packages/nostr/adapter/ingest_pipeline.js` と `packages/nostr/adapter/nostr_adapter.js` が canonicalize の参照実装として存在すること。
- `apps/api/server.js` と `apps/api/standard_api_service.js` が canonical view の参照実装として存在すること。
- `infra/transports/nostr/relay_ingest_worker.js` が ingest worker の参照実装として存在すること。

---

## 3. データベースの統合設定

NostreamのDBコンテナ（PostgreSQL）にホストOSからアクセスできるようにし、インデクサー用のデータベースを作成します。

### Step 3.1: Nostream側のポート開放

```bash
cd ~/nostream
nano docker-compose.yml
```

`nostream-db` サービスを以下のように修正します。`ports:` ブロックを追加し、外部からの直接アクセスを防ぐため、必ず `127.0.0.1:` を付与してください。また、イメージを `postgres:15-alpine` に変更します。

```yaml
  nostream-db:
    image: postgres:15-alpine   # postgres:15 から変更
    container_name: nostream-db
    environment:
      POSTGRES_DB: nostr_ts_relay
      POSTGRES_USER: nostr_ts_relay
      POSTGRES_PASSWORD: nostr_ts_relay
    volumes:
      - ${PWD}/.nostr/data:/var/lib/postgresql/data
      - ${PWD}/.nostr/db-logs:/var/log/postgresql
      - ${PWD}/postgresql.conf:/postgresql.conf
    ports:
      - 127.0.0.1:5432:5432   # この ports: ブロックを追加
    networks:
      default:
    command: postgres -c 'config_file=/postgresql.conf'
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nostr_ts_relay"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 360s
```

設定を反映するためにNostreamを再起動します。

```bash
sudo docker compose up -d
```

### Step 3.2: インデクサー用データベースの作成と全文検索インデックスの設定

稼働中のNostream DBコンテナ内に、Toitoi用のデータベースとユーザーを作成します。

まず、コンテナ名を確認します。

```bash
sudo docker ps
```

`container_name: nostream-db` と設定されている場合、コンテナ名は `nostream-db` になります（`nostream-db-1` ではありません）。

```bash
# NostreamのDBコンテナのPostgreSQLに接続
sudo docker exec -it nostream-db psql -U nostr_ts_relay -d postgres
```

PostgreSQLのプロンプト（`postgres=#`）が表示されたら、以下を実行します。（パスワードは任意の安全なものに変更してください）

```sql
CREATE USER toitoi_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE toitoi_db OWNER toitoi_user TEMPLATE template0;
GRANT ALL PRIVILEGES ON DATABASE toitoi_db TO toitoi_user;
\q
```

次に、作成した `toitoi_db` へ接続し直し、全文検索に使用する `pg_trgm` 拡張を有効化します。これはこの文書が想定する DB ベース API 用の手順であり、現行の storage/indexer 実装では必須ではありません。`pg_trgm` は PostgreSQL に標準で同梱されており、追加のソフトウェアインストールは不要です。

```bash
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db
```

```sql
-- pg_trgm 拡張を有効化（追加インストール不要・PostgreSQL標準）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- content カラムへのトライグラム GIN インデックスは、
-- Prisma が "Event" テーブルを作成した後（Step 4.3 実施後）に以下を実行してください。
-- ここではメモとして記載します（Step 4.3 完了後に改めて手順を案内します）。

\q
```

> **`pg_trgm` について：** トライグラム（3文字の連続部分文字列）を使った部分一致・曖昧検索を実現します。日本語は1文字が複数バイトのため、アルファベットほどの精度は出ませんが、追加パッケージなしで動作し、小規模VPS環境に適しています。検索は `ILIKE '%キーワード%'` 構文で動作し、GINインデックスによって高速化されます。現在の全文検索は、主に storage/indexer 側の token containment 実装を前提にしています。
>
> **高度な日本語検索（PGroonga）へのアップグレードについて：**　本ガイドでは、追加インストールが不要でリソース消費が少ない `pg_trgm` を採用していますが、本格的な運用において**より高い日本語の検索精度と速度**が求められるようになった場合は、PostgreSQL拡張である **[PGroonga (ピージールンガ)](https://pgroonga.github.io/ja/)** の導入を推奨します。まずは本ガイドの `pg_trgm` 構成で小さく立ち上げ、コミュニティの活動が活発になり検索要件が高まったタイミングで PGroonga への移行を検討してください。

---

## 4. インデクサーAPIの準備と設定

ホストOS上にNode.js環境を構築し、データベースへの接続設定を行います。ここでいう `~/toitoi-indexer/` は、このリポジトリの作業コピーを置く想定のディレクトリです。`apps/`、`infra/`、`packages/` の実装はすでにリポジトリ内にあるため、再入力ではなく配置済みのソースを使います。

> **注意：** `~/toitoi-indexer/` はNostreamとは別の独立したディレクトリです。`~/nostream/` 配下ではありません。

### Step 4.1: パッケージのインストールと初期化

Node.js(v20 LTS以上)とPM2をインストールし、プロジェクトを初期化します。

```bash
# Node.js と PM2 のインストール（未実施の場合）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# プロジェクトディレクトリの作成
mkdir -p ~/toitoi-indexer
cd ~/toitoi-indexer

# プロジェクト初期化
npm init -y
npm pkg set type=module

# 必須ライブラリのインストール（Prisma v5系で固定）
npm install express nostr-tools node-cron @prisma/client@5 ws
npm install --save-dev prisma@5
```

> **Prismaバージョンについて：** Prisma v7系では `schema.prisma` の書き方が大きく変わり、追加設定が必要になります。本ガイドでは安定して動作する **v5系に固定** することを推奨します。

### Step 4.2: Prismaスキーマの作成

```bash
mkdir -p prisma
nano prisma/schema.prisma
```

以下の内容をそのまま貼り付けます。

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Event {
  id         String    @id
  pubkey     String
  content    String
  createdAt  Int
  rawJson    Json
  tags       Tag[]
  lineages   Lineage[] @relation("ChildEvent")
}

model Tag {
  id         Int    @id @default(autoincrement())
  eventId    String
  tagKey     String // "context", "relationship", "dsl:model", "dsl:var", "dsl:rel", "dsl:meta" など
  tagValue1  String // context なら分類キー、dsl:* なら model_id
  tagValue2  String?  // context なら値、dsl:* なら value_1（変数名・モデル名・起点変数など）
  event      Event  @relation(fields: [eventId], references:[id])
}

model Lineage {
  id            Int    @id @default(autoincrement())
  childEventId  String
  parentEventId String
  relationType  String
  childEvent    Event  @relation("ChildEvent", fields:[childEventId], references: [id])
}

model SyncState {
  relayUrl   String @id // リレーURL（しおりの役割）
  lastSynced Int    // 最後に同期したUnixタイム
}
```

> **DSLタグとスキーマの関係：** `dsl:*` タグは既存の `Tag` テーブルに**スキーマ変更なし**で格納されます。`tagKey` にサブキー（例：`dsl:var`）、`tagValue1` に `model_id`、`tagValue2` に主要な値（変数名・モデル名・起点変数など）を格納します。`dsl:var` の変数ロール（`independent` 等）や `dsl:rel` の終点変数など、`tagValue2` に収まらない第2の値は、**同一 `tagKey` と `model_id` を持つ2行目の Tag レコード**として保存します（§5.1 の `saveEventToDB` 実装を参照）。

### Step 4.3: 環境変数の設定とデータベースへの反映

`.env` ファイルは `~/toitoi-indexer/` 直下に作成します。Step 3.2 で設定したパスワードを記述し、Prismaでテーブルを生成します。

```bash
cd ~/toitoi-indexer

# .env ファイルの作成（your_secure_password を Step 3.2 で設定したものに変更）
echo 'DATABASE_URL="postgresql://toitoi_user:your_secure_password@127.0.0.1:5432/toitoi_db?schema=public"' > .env

# テーブルの作成とクライアントの生成
npx prisma db push
npx prisma generate
```

**Prisma によるテーブル生成後、全文検索インデックスを作成します。** Step 3.2 で `pg_trgm` 拡張を有効化した `toitoi_db` に接続し、以下を実行してください。

```bash
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db
```

```sql
-- "Event" テーブルの content カラムに GIN インデックスを作成
-- （pg_trgm による ILIKE 検索の高速化）
CREATE INDEX IF NOT EXISTS idx_event_content_trgm
  ON "Event" USING gin (content gin_trgm_ops);

\q
```

ディレクトリ構成はこのようになります。

```
~/toitoi-indexer/
├── .env                ← DATABASE_URL を記述
├── prisma/
│   └── schema.prisma
├── package.json
└── node_modules/
```

---

## 5. アプリケーションの接続と配置

API と ingest worker は既存の実装を使います。canonicalize の入口は `packages/nostr/adapter`、ingest の実行入口は `infra/transports/nostr/relay_ingest_worker.js`、HTTP 参照は `apps/api/server.js` です。worker は raw event を adapter / normalizer に通して canonicalized event を作り、ローカルのリレープロセス（ポート8008）へ直接通信するように設定します。

### Step 5.1: 取り込みワーカーの配置確認 (`infra/transports/nostr/relay_ingest_worker.js`)

```bash
ls infra/transports/nostr/relay_ingest_worker.js
```

このファイルはすでにリポジトリに存在します。実装の中では `packages/nostr/adapter/relay_ingest.js` と `packages/nostr/adapter/ingest_pipeline.js` を通って raw event を normalize / canonicalize し、その結果を保存します。必要ならこの時点で内容を確認し、`RELAY_URL` や保存先だけ環境に合わせてください。

### Step 5.2: Standard API サーバーの配置確認 (`apps/api/server.js`)

> **注意：** この節は、Canonical Event の canonical view を返す HTTP API の参照先を示すものです。同等の参照・検索機能は `packages/nostr/storage/indexer.js` と `apps/api/standard_api_service.js` が担っています。DB 直結の内容は歴史的な参考実装として読み、現行運用では `apps/api/server.js` を中心に扱ってください。

```bash
ls apps/api/server.js apps/api/standard_api_service.js
```

このファイルも既に存在します。API レイヤーは `apps/api/server.js` が HTTP entry、`apps/api/standard_api_service.js` が canonical view の整形を担当します。

---

## 6. PM2 と Caddy の統合デプロイ

### Step 6.1: PM2の設定と起動

PM2を使って Standard API と ingest worker をバックグラウンドで起動し、監視します。 `ecosystem.config.cjs` を `~/toitoi-indexer/` 直下に作成する例ですが、リポジトリ直下で運用する場合はパスを合わせてください。

```bash
nano ecosystem.config.cjs
```

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "toitoi-api",
      script: "./apps/api/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      env_production: { NODE_ENV: "production" }
    },
    {
      name: "toitoi-worker",
      script: "./infra/transports/nostr/relay_ingest_worker.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      env_production: { NODE_ENV: "production" }
    }
  ]
}
```

起動と自動再起動設定を行います。

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup # 画面に表示されるコマンドをコピーして実行してください
```

### Step 6.2: Caddyfileの統合設定

リレーとAPI両方のドメインに対するリクエストを、1つのCaddyサーバーで捌きます。

```bash
sudo nano /etc/caddy/Caddyfile
```

以下の内容をコピーし、ドメイン部分（`relay.your-domain.com` と `api.your-domain.com`）を環境に合わせて書き換えてください。

```caddyfile
# -----------------------------
# ① Nostream リレー用 (WebSocket)
# -----------------------------
relay.your-domain.com {
    reverse_proxy localhost:8008 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }

    @options {
        method OPTIONS
    }
    header {
        Access-Control-Allow-Origin "*"
        Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization"
    }
    respond @options 204
}

# -----------------------------
# ② Toitoi インデクサーAPI用 (REST JSON)
# -----------------------------
api.your-domain.com {
    reverse_proxy localhost:3000

    header {
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Access-Control-Allow-Origin "*"
    }
}
```

Caddyを再起動し、SSL証明書を自動取得させます。

```bash
sudo systemctl restart caddy
```

---

## 7. 運用時の注意点とバックアップ

この構成では、Nostream（リレーデータ）とToitoi（系統樹インデックス）のデータが、同じDockerボリューム（`.nostr/data`）内に同居しています。

### バックアップの一元化
バックアップは以下のコマンド一つで、リレーのイベントデータとインデクサーの系統樹データを一括で保存できます。

```bash
# 両方のDB（nostr_ts_relay と toitoi_db）を含んだ全バックアップ
sudo docker exec -t nostream-db pg_dumpall -c -U postgres > full_dump_$(date +%Y-%m-%d).sql
```

> **注意：** コンテナ名は `docker-compose.yml` の `container_name:` に従います。`container_name: nostream-db` と設定している場合は `nostream-db` を使用してください（`nostream-db-1` ではありません）。`pg_dumpall` 実行時は、権限エラーを避けるために `postgres` ユーザーを使用します。

### スケールアウトのタイミング
APIへのアクセスが急増し、Toitoiインデクサー側の複雑な再帰クエリ（WITH RECURSIVE）でDBのCPUリソースが枯渇した場合、同じDBエンジンを使っているNostream（リレー）の応答も遅くなる可能性があります。
VPSのCPU使用率が慢性的に80%を超えるようになった場合は、この統合構成から「DBコンテナの分離」または「サーバーの分割」を検討してください。

## 関連リンク

- 入口一覧: [README.md](../../../README.md)
- ディレクトリ責務: [DIRECTORY_BOUNDARIES.md](../../../docs/architecture/DIRECTORY_BOUNDARIES.md)
- リレー構築: [NOSTR_RELAY_SETUP.md](../../transports/nostr/NOSTR_RELAY_SETUP.md)
- API リファレンス: [apps/api/README.md](../../../apps/api/README.md)
- Nostr adapter / normalizer: [`packages/nostr/adapter/`](../../../packages/nostr/adapter/)
- API 参照実装: [`apps/api/`](../../../apps/api/)
- 派生 index 実装: [`packages/nostr/storage/`](../../../packages/nostr/storage/)
