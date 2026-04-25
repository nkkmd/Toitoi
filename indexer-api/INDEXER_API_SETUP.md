# Toitoi インデクサー・アーキテクチャ設計書：問いの系譜の抽出とAPI提供
**バージョン: 2.3**　｜　前バージョン (v2.2) からの主な修正：`worker.js` の `saveEventToDB` 省略部分を完全実装（Event・Tag・Lineageのトランザクション処理）。`api.js` のSQL型エラー（`NULL as parent_id` → `NULL::text`）を修正、`buildNestedTree` 省略部分を完全実装、ヘルスチェックエンドポイントおよびエラーハンドリングを追加。`ecosystem.config.js` を `type: "module"` 環境に対応した `ecosystem.config.cjs` に修正し、APIの実行モードをワーカーと競合しない `fork` モードに変更。`2.1` にNode.js/PostgreSQLの実際のインストールコマンドを追記。`2.2` にプロジェクトディレクトリ作成コマンドを追記。

本ドキュメントは、デジタル・アグロエコロジー・コモンズ「Toitoi」における **コモンズAPI・インデクサー層** のリファレンス実装および本番環境構築ガイドです。

分散ネットワーク（Nostr）から「問い（Kind: 11042）」をリアルタイムで収集・整理し、フロントエンド（スマホアプリやWeb画面）に超高速なAPIを提供するシステムの **「開発から本番稼働（24時間運用）」** までの全設計を定義します。本バージョンでは、Webサーバーにモダンな **Caddy** を採用し、よりセキュアでメンテナンスフリーな構成としています。

---

## 1. 本番環境のアーキテクチャ

Toitoiのインデクサーをインターネット上に安全かつ安定して公開するため、以下の5層構造（レイヤー）でシステムを構築します。

```text
[ スマホアプリ / Webフロントエンド ]
       │ (HTTPS通信 : https://api.toitoi.cultivationdata.net)
       ▼
┌───────────────── サーバー本体 (Ubuntu Linux等) ─────────────────┐
│                                                               │
│  ①【受付係】 Caddy (自動HTTPS・リバースプロキシ)                │
│       ├─ 役割: SSL証明書の自動取得・更新、通信の安全な中継          │
│       │                                                       │
│       ▼ (内部ポート: 3000へ転送)                                │
│                                                               │
│  ②【 店長 】 PM2 (プロセスマネージャー)                          │
│       ├─ 役割: 24時間監視、クラッシュ時の「1秒以内の自動蘇生」      │
│       │                                                       │
│       ├──▶ ③【窓口担当】 APIサーバー (Express / Node.js)        │
│       │        └─ 役割: アプリからの検索要求に応え、データを返す   │
│       │                                                       │
│       └──▶ ④【裏方職人】 インデクサー・ワーカー (node-cron)     │
│                └─ 役割: 10分毎にリレーから「問い」を集めDBへ保存   │
│                                                               │
│  ⑤【整理棚】 PostgreSQL (リレーショナル・データベース)            │
│       └─ 役割: 複雑なツリー構造の高速検索(WITH RECURSIVE)       │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. 事前準備（必要なパッケージとDBの初期化）

本システムを構築するために、あらかじめ実行が必要なコマンド群です。

### 2.1 サーバー・OSレベルの必須ソフトウェア

サーバー本体（Ubuntu 22.04 LTS等を想定）に以下のミドルウェアをインストールします。

*   **Node.js (v20 LTS 推奨):** APIとワーカーを動かすための実行環境。本システムはESM（`import` 構文）を使用するため、**v18以上が必須**です。

    ```bash
    # NodeSourceのリポジトリを登録してNode.js 20 LTSをインストール
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs

    # バージョン確認
    node --version   # v20.x.x と表示されればOK
    npm --version
    ```

*   **PostgreSQL (v14以上推奨):** 系統樹の再帰クエリを超高速に処理するための必須データベース。

    ```bash
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql

    # DBとユーザーを作成（パスワードは任意の値に変更してください）
    sudo -u postgres psql <<'SQL'
    CREATE USER toitoi_user WITH PASSWORD 'your_password';
    CREATE DATABASE toitoi_db OWNER toitoi_user;
    GRANT ALL PRIVILEGES ON DATABASE toitoi_db TO toitoi_user;
    \q
    SQL
    ```

*   **Caddy:** リバースプロキシおよび自動HTTPS化を担うWebサーバー。

    ```bash
    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update
    sudo apt install caddy
    ```

*   **PM2:** Node.jsプロセスを24時間監視・自動再起動させるための管理ツール。

    ```bash
    sudo npm install -g pm2
    ```

### 2.2 プロジェクトレベルのパッケージインストール

プロジェクトのディレクトリを作成し、以下のコマンドを実行して必須ライブラリをインストールします。

```bash
# プロジェクトディレクトリの作成と移動
mkdir -p ~/toitoi-indexer
cd ~/toitoi-indexer

# プロジェクトの初期化
npm init -y

# ESM（import構文）を有効化
npm pkg set type=module

# 必須ライブラリをインストール
npm install express nostr-tools node-cron @prisma/client
npm install --save-dev prisma
```

> **`type=module` について:** `worker.js` と `api.js` は `import` 構文（ESM）で記述します。`package.json` に `"type": "module"` を設定することでNode.jsがESMとして認識します。後述のPM2設定ファイル（§5.1）は、この設定の影響を受けないよう `.cjs` 拡張子を使用します。

### 2.3 データベースの初期構築とPrismaの生成 【重要】

後述の「3. データベース設計」で作成する `schema.prisma` の設計図を、実際のデータベースとNode.jsのプログラムに反映させるための必須工程です。**これを実行しないと `worker.js` や `api.js` はデータベースにアクセスできません。**

```bash
# 1. 環境変数(.env)ファイルを作成し、PostgreSQLの接続URLを記載する
#    （your_password は2.1で設定したパスワードに変更してください）
echo 'DATABASE_URL="postgresql://toitoi_user:your_password@localhost:5432/toitoi_db?schema=public"' > .env

# 2. 設計図を実際のPostgreSQLデータベースに反映（テーブルの作成）
npx prisma db push

# 3. 設計図からNode.js用のDB操作プログラム(@prisma/client)を自動生成
npx prisma generate
```

---

## 3. データベース設計（Prismaスキーマ）

Nostrの生データを、検索・ツリー描画に最適化された状態へ分解して保存します。
プロジェクト内の `prisma/schema.prisma` に以下を記述します。

```prisma
// prisma/schema.prisma

// DB接続設定 (PostgreSQLを使用)
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

---

## 4. アプリケーションの実装（Node.js）

本番環境では、リレーからデータを収集する「ワーカー」と、フロントエンドにデータを返す「APIサーバー」を別々のファイルとして作成します。

### 4.1 ワーカープロセス (`worker.js`)

リレーからのデータ収集を担当します。多重実行のロックと、安全な切断（`eose`）を実装します。Event・Tag・Lineageの保存はトランザクションで一括処理します。

```javascript
// worker.js
import cron from 'node-cron';
import { Relay, verifyEvent } from 'nostr-tools';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RELAY_URL = 'wss://relay.toitoi.cultivationdata.net';
let isRunning = false;

/**
 * NostrイベントをEvent・Tag・Lineageに分解してDBへ一括保存する。
 * トランザクションを使うことで、途中失敗時に部分保存が残らないようにする。
 */
async function saveEventToDB(event) {
    await prisma.$transaction(async (tx) => {
        // Event本体を保存
        await tx.event.create({
            data: {
                id:        event.id,
                pubkey:    event.pubkey,
                content:   event.content,
                createdAt: event.created_at,
                rawJson:   event,
            }
        });

        // タグ（"context", "t", "relationship" 等）を Tag テーブルへ保存
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

        // "e"タグ（親イベントへの参照）を Lineage テーブルへ保存
        // Nostrでは ["e", "<親ID>", "<リレー>", "<relationType>"] の形式を使う
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

// 10分ごとに定期実行
cron.schedule('*/10 * * * *', async () => {
    if (isRunning) return; // 多重実行防止用のロック
    isRunning = true;
    console.log(`[${new Date().toISOString()}] Worker started`);

    try {
        // 1. 「しおり」の取得
        const state = await prisma.syncState.findUnique({ where: { relayUrl: RELAY_URL } });
        const since = state ? state.lastSynced : 0;
        let latestCreatedAt = since;

        const relay = await Relay.connect(RELAY_URL);

        // 2. 差分（since）のみを要求
        relay.subscribe([{ kinds: [11042], since: since }], {
            async onevent(event) {
                // 3. 署名検証（不正データ排除）
                if (!verifyEvent(event)) return;

                // 4. DB保存（既に存在する場合はスキップ）
                const exists = await prisma.event.findUnique({ where: { id: event.id } });
                if (!exists) {
                    await saveEventToDB(event);
                }
                if (event.created_at > latestCreatedAt) {
                    latestCreatedAt = event.created_at;
                }
            },
            async oneose() {
                // 5. 過去データ取得完了時の処理
                relay.close(); // 安全に切断（行儀よく閉じる）

                // 6. 「しおり」の更新
                await prisma.syncState.upsert({
                    where:  { relayUrl: RELAY_URL },
                    update: { lastSynced: latestCreatedAt },
                    create: { relayUrl: RELAY_URL, lastSynced: latestCreatedAt }
                });
                isRunning = false; // ロック解除
                console.log(`[${new Date().toISOString()}] Worker finished. Latest: ${latestCreatedAt}`);
            }
        });
    } catch (error) {
        console.error("Worker Error:", error);
        isRunning = false; // エラー時もロック解除
    }
});
```

### 4.2 APIサーバー (`api.js`)

スマホアプリ等からのリクエストに応えます。「系統樹（ツリー）」の取得には、PostgreSQLの再帰クエリを使用します。すべてのエンドポイントにエラーハンドリングを実装します。

```javascript
// api.js
import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

/**
 * フラットな配列（DBから取得したツリーの全ノード）を、
 * ルートIDを起点とした階層型JSONに変換するヘルパー関数。
 *
 * @param {Array}  rows   - DBから返ったフラットな行の配列
 * @param {string} rootId - ツリーの起点となるイベントID
 * @returns {Object|null} - 階層型に組み立てたツリーオブジェクト
 */
function buildNestedTree(rows, rootId) {
    // idをキーにしたMapを作成し、各ノードにchildren配列を付与する
    const nodeMap = new Map();
    for (const row of rows) {
        nodeMap.set(row.id, { ...row, children: [] });
    }

    let root = null;
    for (const node of nodeMap.values()) {
        if (node.parent_id === null) {
            // parent_id が null のノードがルート
            root = node;
        } else {
            // 親ノードのchildren配列に自分を追加
            const parent = nodeMap.get(node.parent_id);
            if (parent) {
                parent.children.push(node);
            }
        }
    }
    return root;
}

// ヘルスチェック（サーバーの死活監視用）
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 最新の問いを取得（20件）
app.get('/api/v1/inquiries', async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { tags: true }
        });
        res.json(events);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 系統樹（ツリー）の取得
app.get('/api/v1/inquiries/:id/tree', async (req, res) => {
    const rootId = req.params.id;

    try {
        // WITH RECURSIVE による一撃ツリー抽出
        // ※ NULL::text とすることでPostgreSQLの型推論エラーを回避する
        const treeData = await prisma.$queryRaw`
            WITH RECURSIVE tree AS (
                -- ルートノード
                SELECT e.id, e.content, e."createdAt", NULL::text AS parent_id
                FROM "Event" e WHERE e.id = ${rootId}

                UNION ALL

                -- 再帰的に子ノードを取得
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

        // フラットな配列を階層型のJSONに変換
        const structuredTree = buildNestedTree(treeData, rootId);
        res.json(structuredTree);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ポート3000番で常時リクエストを待ち受ける
app.listen(3000, () => {
    console.log('🚀 API Server running on port 3000');
});
```

---

## 5. 本番環境へのデプロイ（24時間運用設定）

作成したプログラムを、安全かつ永遠に動かし続けるためのサーバー設定です。

### 5.1 PM2（プロセスマネージャー）の設定

APIとワーカーの両方を監視・管理するための設計図を作成します。

> **ファイル名について:** `package.json` に `"type": "module"` を設定しているため、`.js` 拡張子のファイルはESMとして扱われます。PM2の設定ファイルは `module.exports =` 構文（CommonJS）を使うため、**必ず `.cjs` 拡張子**で保存してください。`.js` のままだと起動時にエラーになります。

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "toitoi-api",
      script: "./api.js",
      instances: 1,           // APIサーバーは fork モードで1インスタンス起動
      exec_mode: "fork",      // ※ cluster モードはESMとの相性問題が生じる場合がある
      autorestart: true,
      env_production: { NODE_ENV: "production" }
    },
    {
      name: "toitoi-worker",
      script: "./worker.js",
      instances: 1,           // ワーカーは多重同期を防ぐため必ず1つだけ起動
      exec_mode: "fork",
      autorestart: true,      // エラーで落ちても自動再起動
      env_production: { NODE_ENV: "production" }
    }
  ]
}
```

> **`cluster` モードについて:** PM2の `cluster` モードはCPUコアを並列活用できますが、Node.js ESM（`import` 構文）との組み合わせで起動エラーが発生する環境があります。また `cluster` モードでは各インスタンスがメモリを共有しないため、`worker.js` の `isRunning` フラグによる多重実行防止が無効になります。スケールアップが必要になった際は、ロック機構をRedis等の外部ストアに移行したうえで `cluster` モードを検討してください。

**起動コマンド:**
ターミナルで以下のコマンドを実行するだけで、2つのプログラムがバックグラウンドで完璧に稼働し始めます。

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save        # サーバー再起動時の自動復旧設定を保存
pm2 startup     # 画面に表示されたコマンドをコピーして実行する
```

**状態確認:**

```bash
pm2 list        # toitoi-api と toitoi-worker が online であることを確認
pm2 logs        # リアルタイムログを表示（Ctrl+C で終了）
```

### 5.2 Caddy（自動HTTPS受付係）の設定

インターネットからのアクセス（https://api.toitoi.cultivationdata.net）を受け取り、内部のAPI（3000ポート）に安全に繋ぎます。Caddy最大の魅力は、**設定ファイルにドメイン名を書くだけで、裏側で自動的にLet's EncryptからSSL証明書を取得し、永久に自動更新し続けてくれる**点です。

**`Caddyfile` の記述例（これだけで完結します）:**

```caddyfile
api.toitoi.cultivationdata.net {

    # 内部のNode.js API(3000番ポート)へリクエストを転送
    reverse_proxy localhost:3000

    # 最低限のセキュリティヘッダーを付与
    header {
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Access-Control-Allow-Origin "*"
    }
}
```

設定後、ターミナルで以下を実行すると、完全にセキュアなHTTPS化されたAPIサーバーが公開されます。

```bash
sudo systemctl restart caddy

# 疎通確認
curl https://api.toitoi.cultivationdata.net/health
# {"status":"ok","timestamp":"..."} が返れば成功
```

---

## 6. 運用保守の重要ポイント

1.  **ゼロメンテナンスのHTTPS**
    Caddyを使用しているため、SSL証明書の有効期限切れ（よくあるWebサーバーのトラブル）を気にする必要が一切なくなります。

2.  **データベースのバックアップ**
    PostgreSQLには大量の系統樹データが蓄積されます。定期的な `pg_dump` による自動バックアップをOSの `cron` 等で設定してください。

    ```bash
    # 手動バックアップの例
    pg_dump -U toitoi_user -d toitoi_db > dump_$(date +%Y-%m-%d).sql
    ```

3.  **ログの監視**
    PM2はすべてのログを記録しています。エラーが起きていないか確認するには、サーバー上で `pm2 logs` と打ち込むだけで、APIとワーカー両方のリアルタイムログを監視できます。

---

*このガイドはデジタル・アグロエコロジー・コモンズ推進プロジェクトの一環として作成されました。*
*v2.3 — 2026年4月改訂*
