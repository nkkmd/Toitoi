# 構築ガイド：リレー＆インデクサー統合・低負荷アーキテクチャ設計書
**バージョン：0.1.5**　｜　前バージョン (v0.1.4) からの主な修正：
* §5.2：APIレスポンスのプロパティ名における `created_at`（スネークケース）と `createdAt`（キャメルケース）の表記揺れを解消。フロントエンド開発者の開発体験向上のため、Prismaのスキーマに合わせて全エンドポイントで `createdAt` に統一しました。

本ドキュメントは、「デジタル・アグロエコロジー・コモンズ」における**Nostrリレー（Nostream）** と**インデクサーAPI（Toitoi）** を、同一サーバー内で最も負荷を少なく、かつ効率的に運用するための「統合・低負荷アーキテクチャ」のセットアップ手順書です。

メモリの少ない小規模なVPS（1GB〜2GB RAM）でも安定稼働させるため、データベースプロセスとWebサーバーを統合し、内部通信のオーバーヘッドを極限まで削ぎ落とした設計となっています。

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
│  ③【API＆ワーカー】 Node.js / PM2 (ホストOS上で稼働)              ││
│       ├── toitoi-api    (ポート: 3000)                        ││
│       └── toitoi-worker (リレーから直に問いを収集)  ────────────┘│
└───────────────────────────────────────────────────────────────┘
```

### 最適化の3つのポイント
1. **PostgreSQLエンジンの統合**: インデクサー用に新たなPostgreSQLをインストールせず、Nostreamのデータベースコンテナ内にインデクサー用のデータベース空間を作成します。これにより数百MB〜1GBのメモリを節約します。
2. **ワーカー通信のローカルループバック化**: ワーカーがリレーからデータを収集する際、インターネット経由ではなく、サーバー内部（`ws://localhost:8008`）で直接接続します。SSLの暗号化/復号のCPU負荷と通信のオーバーヘッドを完全にスキップします。
3. **Caddyの統合**: リレーとAPIの両方のリバースプロキシを1つのCaddyプロセスで処理します。

---

## 2. 前提条件

- [PREREQUISITE_INSTALLATION.md] に従い、必須ソフトウェア（Git, Docker, Node.js等）のインストールが完了していること。
- [NOSTR_RELAY_SETUP.md] に従い、Nostream（リレー）の基本的な構築が完了していること。

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

> **注意：** `networks:` の後ろにコロン（`:`）が必要です。元のファイルにtypoがある場合は合わせて修正してください。

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

次に、作成した `toitoi_db` へ接続し直し、全文検索に使用する `pg_trgm` 拡張を有効化します。`pg_trgm` は PostgreSQL に標準で同梱されており、追加のソフトウェアインストールは不要です。

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

> **`pg_trgm` について：** トライグラム（3文字の連続部分文字列）を使った部分一致・曖昧検索を実現します。日本語は1文字が複数バイトのため、アルファベットほどの精度は出ませんが、追加パッケージなしで動作し、小規模VPS環境に適しています。検索は `ILIKE '%キーワード%'` 構文で動作し、GINインデックスによって高速化されます。
>
> **高度な日本語検索（PGroonga）へのアップグレードについて：**　本ガイドでは、追加インストールが不要でリソース消費が少ない `pg_trgm` を採用していますが、本格的な運用において**より高い日本語の検索精度と速度**が求められるようになった場合は、PostgreSQL拡張である **[PGroonga (ピージールンガ)](https://pgroonga.github.io/ja/)** の導入を推奨します。まずは本ガイドの `pg_trgm` 構成で小さく立ち上げ、コミュニティの活動が活発になり検索要件が高まったタイミングで PGroonga への移行を検討してください。

---

## 4. インデクサーAPIの準備と設定

ホストOS上にNode.js環境を構築し、データベースへの接続設定を行います。

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
  tagKey     String // "context", "relationship" など
  tagValue1  String // "volcanic_ash" など
  tagValue2  String?
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

## 5. アプリケーションの実装（ローカルループバック版）

APIとワーカーのコードを `~/toitoi-indexer/` 直下に作成します。ワーカーはローカルのリレープロセス（ポート8008）へ直接通信するように設定します。

### Step 5.1: ワーカープロセスの実装 (`worker.js`)

```bash
nano worker.js
```

```javascript
// worker.js
import WebSocket from 'ws';
global.WebSocket = WebSocket;

import cron from 'node-cron';
import { Relay, verifyEvent } from 'nostr-tools';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Caddy経由の本番URLに変更
const RELAY_URL = 'wss://relay.your-domain.com';
let isRunning = false;

async function saveEventToDB(event) {
    await prisma.$transaction(async (tx) => {
        await tx.event.create({
            data: {
                id:        event.id,
                pubkey:    event.pubkey,
                content:   event.content,
                createdAt: event.created_at, // Nostrのcreated_atをPrismaのcreatedAtにマッピング
                rawJson:   event,
            }
        });

        for (const tag of event.tags) {
            if (tag.length >= 2) {
                await tx.tag.create({
                    data: {
                        eventId:   event.id,
                        tagKey:    tag[0],
                        tagValue1: tag[1],
                        tagValue2: tag[2] ?? null,
                    }
                });
            }
        }

        const eTags = event.tags.filter(t => t[0] === 'e');
        for (const eTag of eTags) {
            await tx.lineage.create({
                data: {
                    childEventId:  event.id,
                    parentEventId: eTag[1],
                    relationType:  eTag[3] ?? 'reply',
                }
            });
        }
    });
}

// メインの処理を関数化（すぐ呼び出せるように）
async function runWorker() {
    if (isRunning) return;
    isRunning = true;
    console.log(`[${new Date().toISOString()}] Worker started. Connecting to ${RELAY_URL}...`);

    try {
        const state = await prisma.syncState.findUnique({ where: { relayUrl: RELAY_URL } });
        const since = state ? state.lastSynced : 0;
        let latestCreatedAt = since;

        const relay = await Relay.connect(RELAY_URL);

        // sinceが0の場合は条件を外す（リレー側のエラー回避）
        const filter = since > 0 ? { kinds: [1042], since: since } : { kinds: [1042] };
        console.log(`📡 送信する条件:`, filter);

        relay.subscribe([filter], {
            async onevent(event) {
                console.log(`イベント受信: ${event.id}`);
                if (!verifyEvent(event)) return;

                const exists = await prisma.event.findUnique({ where: { id: event.id } });
                if (!exists) {
                    await saveEventToDB(event);
                }
                if (event.created_at > latestCreatedAt) {
                    latestCreatedAt = event.created_at;
                }
            },
            async oneose() {
                relay.close();
                await prisma.syncState.upsert({
                    where:  { relayUrl: RELAY_URL },
                    update: { lastSynced: latestCreatedAt },
                    create: { relayUrl: RELAY_URL, lastSynced: latestCreatedAt }
                });
                isRunning = false;
                console.log(`[${new Date().toISOString()}] Worker finished. Latest: ${latestCreatedAt}`);
            },
            // リレーから拒否された場合の理由を表示する
            onclose(reason) {
                console.log(`サブスクリプション終了/拒否理由: ${reason}`);
            }
        });
    } catch (error) {
        console.error("Worker Error:", error);
        isRunning = false;
    }
}

// 10分ごとの定期実行
cron.schedule('*/10 * * * *', runWorker);

// プロセス起動直後にも即座に1回実行する
runWorker();
```

### Step 5.2: APIサーバーの実装 (`api.js`)

```bash
nano api.js
```

```javascript
// api.js
import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// ツリー構造の再帰組み立て
function buildNestedTree(rows, rootId) {
    const nodeMap = new Map();
    for (const row of rows) {
        nodeMap.set(row.id, { ...row, children: [] });
    }

    let root = null;
    for (const node of nodeMap.values()) {
        if (node.parent_id === null) {
            root = node;
        } else {
            const parent = nodeMap.get(node.parent_id);
            if (parent) {
                parent.children.push(node);
            }
        }
    }
    return root;
}

// ヘルスチェック
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────────────
// GET /api/v1/inquiries
// 最新の問い一覧を取得（ページネーション対応）
// クエリパラメータ:
//   limit  : 取得件数（デフォルト: 20、上限: 100）
//   offset : オフセット（デフォルト: 0）
// ──────────────────────────────────────────────────
app.get('/api/v1/inquiries', async (req, res) => {
    try {
        const limit  = Math.min(parseInt(req.query.limit  ?? '20', 10), 100);
        const offset = parseInt(req.query.offset ?? '0', 10);

        const [total, events] = await Promise.all([
            prisma.event.count(),
            prisma.event.findMany({
                orderBy: { createdAt: 'desc' },
                take:    limit,
                skip:    offset,
                include: { tags: true },
            }),
        ]);

        res.json({ total, limit, offset, results: events });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────────
// GET /api/v1/inquiries/query
// 全文検索（pg_trgm / ILIKE）＋ タグ絞り込み 統合エンドポイント
//
// クエリパラメータ:
//   q              : 検索キーワード（content 全文検索）                ※ 任意
//   climate_zone   : 気候帯フィルタ                                  ※ 任意
//   soil_type      : 土壌タイプフィルタ                               ※ 任意
//   farming_context: 農法フィルタ                                    ※ 任意
//   crop_family    : 作物群フィルタ                                   ※ 任意
//   relationship   : 関係性フィルタ（要素名を1つ指定）                 ※ 任意
//   phase          : 熟達フェーズ (beginner / intermediate / expert)  ※ 任意
//   since          : Unix timestamp（この日時以降）                   ※ 任意
//   until          : Unix timestamp（この日時以前）                   ※ 任意
//   limit          : 取得件数（デフォルト: 20、上限: 100）             ※ 任意
//   offset         : ページネーション用オフセット                      ※ 任意
//
// レスポンス:
//   { total, limit, offset, results: [ { id, pubkey, createdAt,
//     content, highlight, tags }, ... ] }
//   highlight: q 指定時、マッチ箇所を <em>...</em> で囲んだスニペット
// ──────────────────────────────────────────────────
app.get('/api/v1/inquiries/query', async (req, res) => {
    try {
        const {
            q,
            climate_zone,
            soil_type,
            farming_context,
            crop_family,
            relationship,
            phase,
            since,
            until,
        } = req.query;

        const limit  = Math.min(parseInt(req.query.limit  ?? '20', 10), 100);
        const offset = parseInt(req.query.offset ?? '0', 10);

        // パラメータが何も指定されていない場合は 400 を返す
        const hasAnyParam = [
            q, climate_zone, soil_type, farming_context,
            crop_family, relationship, phase, since, until,
        ].some(v => v !== undefined);

        if (!hasAnyParam) {
            return res.status(400).json({
                error: 'At least one query parameter is required.',
                hint:  'Use /api/v1/inquiries for the full list.',
            });
        }

        // ── 動的 WHERE 句の構築 ──────────────────────────────
        // 全パラメータを $1, $2 ... にバインドし SQLインジェクションを防ぐ。
        // Prisma の $queryRawUnsafe は条件が可変な動的クエリに使用する。
        const conditions = [];
        const values     = [];
        let   p          = 1; // パラメータインデックス

        // 1. 全文検索（content）
        //    pg_trgm の GIN インデックスを使った ILIKE による部分一致検索。
        //    日本語では1文字単位での一致も有効。
        if (q) {
            conditions.push(`e.content ILIKE $${p}`);
            values.push(`%${q}%`);
            p++;
        }

        // 2. context タグによる絞り込み
        //    各カテゴリを EXISTS サブクエリで AND 結合する。
        //    複数の context カテゴリを同時に指定した場合、すべてを満たす
        //    イベントのみが返る（AND 条件）。
        const contextFilters = [
            ['climate_zone',    climate_zone],
            ['soil_type',       soil_type],
            ['farming_context', farming_context],
            ['crop_family',     crop_family],
        ];

        for (const [category, value] of contextFilters) {
            if (value) {
                conditions.push(`
                    EXISTS (
                        SELECT 1 FROM "Tag" t
                        WHERE t."eventId"   = e.id
                          AND t."tagKey"    = 'context'
                          AND t."tagValue1" = $${p}
                          AND t."tagValue2" = $${p + 1}
                    )
                `);
                values.push(category, value);
                p += 2;
            }
        }

        // 3. relationship タグによる絞り込み
        //    TOITOI_PROTOCOL_SCHEMA §2.2 の「AとBの順序はインデクサー側で
        //    同一視する」仕様に従い、tagValue1 または tagValue2 の
        //    いずれかに一致すればよい。
        if (relationship) {
            conditions.push(`
                EXISTS (
                    SELECT 1 FROM "Tag" t
                    WHERE t."eventId" = e.id
                      AND t."tagKey"  = 'relationship'
                      AND (t."tagValue1" = $${p} OR t."tagValue2" = $${p})
                )
            `);
            values.push(relationship);
            p++;
        }

        // 4. phase タグによる絞り込み
        if (phase) {
            conditions.push(`
                EXISTS (
                    SELECT 1 FROM "Tag" t
                    WHERE t."eventId"   = e.id
                      AND t."tagKey"    = 'phase'
                      AND t."tagValue1" = $${p}
                )
            `);
            values.push(phase);
            p++;
        }

        // 5. 時間範囲フィルタ
        if (since) {
            conditions.push(`e."createdAt" >= $${p}`);
            values.push(parseInt(since, 10));
            p++;
        }
        if (until) {
            conditions.push(`e."createdAt" <= $${p}`);
            values.push(parseInt(until, 10));
            p++;
        }

        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        // ── ハイライト生成（q がある場合のみ） ─────────────────
        // pg_trgm にはネイティブのハイライト関数がないため、
        // アプリ側で <em> タグを挿入するシンプルな実装を使用する。
        // フロントエンドは highlight フィールドをそのまま innerHTML に
        // 渡すことでキーワード強調表示が可能。
        function buildHighlight(content, keyword) {
            if (!keyword) return null;
            // XSS 対策: content に含まれる HTML 特殊文字をエスケープしてから
            // キーワードを <em> で囲む。
            const escaped = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            const re = new RegExp(
                keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                'gi'
            );
            return escaped.replace(re, match => `<em>${match}</em>`);
        }

        // ── 総件数カウント（ページネーション用） ────────────────
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM "Event" e
            ${whereClause}
        `;

        // ── メインクエリ ─────────────────────────────────────
        const dataQuery = `
            SELECT
                e.id,
                e.pubkey,
                e.content,
                e."createdAt"
            FROM "Event" e
            ${whereClause}
            ORDER BY e."createdAt" DESC
            LIMIT  $${p}
            OFFSET $${p + 1}
        `;

        // limit と offset はカウントクエリには不要なため末尾に追加する
        const dataValues = [...values, limit, offset];

        const [countResult, rows] = await Promise.all([
            prisma.$queryRawUnsafe(countQuery, ...values),
            prisma.$queryRawUnsafe(dataQuery,  ...dataValues),
        ]);

        // ── タグを一括取得して N+1 を回避 ──────────────────────
        const eventIds = rows.map(r => r.id);
        const tags = eventIds.length > 0
            ? await prisma.tag.findMany({ where: { eventId: { in: eventIds } } })
            : [];

        const tagsByEventId = tags.reduce((acc, tag) => {
            (acc[tag.eventId] ??= []).push(tag);
            return acc;
        }, {});

        // ── レスポンスの組み立て ────────────────────────────────
        const results = rows.map(row => ({
            id:         row.id,
            pubkey:     row.pubkey,
            createdAt:  Number(row.createdAt),
            content:    row.content,
            highlight:  buildHighlight(row.content, q),
            tags:       tagsByEventId[row.id] ?? [],
        }));

        res.json({
            total:  Number(countResult[0]?.total ?? 0),
            limit,
            offset,
            results,
        });

    } catch (e) {
        console.error('[/api/v1/inquiries/query]', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────────
// GET /api/v1/inquiries/:id/tree
// 指定したイベントIDをルートとし、lineages テーブルを再帰結合して
// N階層の子ノード（派生・結合された問い）をツリー構造の JSON で返す。
// ──────────────────────────────────────────────────
app.get('/api/v1/inquiries/:id/tree', async (req, res) => {
    const rootId = req.params.id;
    try {
        const treeData = await prisma.$queryRaw`
            WITH RECURSIVE tree AS (
                SELECT e.id, e.content, e."createdAt", NULL::text AS parent_id
                FROM "Event" e WHERE e.id = ${rootId}

                UNION ALL

                SELECT e.id, e.content, e."createdAt", l."parentEventId" AS parent_id
                FROM "Event" e
                INNER JOIN "Lineage" l ON e.id = l."childEventId"
                INNER JOIN tree t ON l."parentEventId" = t.id
            )
            SELECT * FROM tree;
        `;

        if (treeData.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const structuredTree = buildNestedTree(treeData, rootId);
        res.json(structuredTree);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(3000, () => {
    console.log('🚀 API Server running on port 3000');
});
```

---

## 6. PM2 と Caddy の統合デプロイ

### Step 6.1: PM2の設定と起動

PM2を使ってAPIとワーカーをバックグラウンドで起動し、監視します。 `ecosystem.config.cjs`を`~/toitoi-indexer/` 直下に作成します。

```bash
nano ecosystem.config.cjs
```

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "toitoi-api",
      script: "./api.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      env_production: { NODE_ENV: "production" }
    },
    {
      name: "toitoi-worker",
      script: "./worker.js",
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

---
*このガイドはデジタル・アグロエコロジー・コモンズ推進プロジェクトの一環として作成されました。*
*v0.1.5 — 2026年5月*