# Toitoi インデクサー・アーキテクチャ設計書：問いの系譜の抽出とAPI提供
**バージョン: 2.0 (本番環境デプロイメント)**

本ドキュメントは、デジタル・アグロエコロジー・コモンズ「Toitoi」における **コモンズAPI・インデクサー層** のリファレンス実装および本番環境構築ガイドです。

分散ネットワーク（Nostr）から「問い（Kind: 11042）」を収集・整理し、フロントエンドに超高速なAPIを提供するシステムの **「開発から本番稼働（24時間運用）」** までの全設計を定義します。本バージョンでは、Webサーバーにモダンな **Caddy** を採用し、よりセキュアでメンテナンスフリーな構成としています。

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
│       │        OS再起動時の自動起動                             │
│       │                                                       │
│       ├──▶ ③【窓口担当】 APIサーバー (Express / Node.js)        │
│       │        └─ 役割: コンピュータからの検索要求に応え、データを返す   │
│       │                                                       │
│       └──▶ ④【裏方職人】 インデクサー・ワーカー (node-cron)     │
│                └─ 役割: 10分毎にリレーから「問い」を集めDBへ保存   │
│                                                               │
│  ⑤【整理棚】 PostgreSQL (リレーショナル・データベース)            │
│       └─ 役割: 複雑なツリー構造の高速検索(WITH RECURSIVE)       │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. データベース設計（Prismaスキーマ）

Nostrの生データを、検索・ツリー描画に最適化された状態へ分解して保存します。

```prisma
// schema.prisma

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
  event      Event  @relation(fields: [eventId], references: [id])
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

## 3. アプリケーションの実装（Node.js）

本番環境では、APIとワーカーを**別々のファイル**として作成し、PM2に同時に管理させます。

### 3.1 ワーカープロセス (`worker.js`)
リレーからのデータ収集を担当します。多重実行のロックと、安全な切断（`eose`）を実装します。

```javascript
// worker.js
import cron from 'node-cron';
import { Relay, verifyEvent } from 'nostr-tools';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RELAY_URL = 'wss://relay.toitoi.cultivationdata.net';
let isRunning = false;

cron.schedule('*/10 * * * *', async () => {
    if (isRunning) return; // 多重実行防止
    isRunning = true;

    try {
        const state = await prisma.syncState.findUnique({ where: { relayUrl: RELAY_URL } });
        const since = state ? state.lastSynced : 0;
        let latestCreatedAt = since;

        const relay = await Relay.connect(RELAY_URL);
        
        relay.subscribe([{ kinds: [11042], since: since }], {
            async onevent(event) {
                if (!verifyEvent(event)) return; // 署名検証

                const exists = await prisma.event.findUnique({ where: { id: event.id } });
                if (!exists) {
                    // トランザクションでEvent, Tag, Lineageを一括保存（関数は省略）
                    await saveEventToDB(event);
                }
                if (event.created_at > latestCreatedAt) latestCreatedAt = event.created_at;
            },
            async oneose() {
                relay.close(); // 安全に切断
                await prisma.syncState.upsert({
                    where: { relayUrl: RELAY_URL },
                    update: { lastSynced: latestCreatedAt },
                    create: { relayUrl: RELAY_URL, lastSynced: latestCreatedAt }
                });
                isRunning = false; // ロック解除
            }
        });
    } catch (error) {
        console.error("Worker Error:", error);
        isRunning = false;
    }
});
```

### 3.2 APIサーバー (`api.js`)
スマホアプリからのリクエストに応えます。「系統樹（ツリー）」の取得には、PostgreSQLの再帰クエリを使用します。

```javascript
// api.js
import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// ツリー取得エンドポイント
app.get('/api/v1/inquiries/:id/tree', async (req, res) => {
    const rootId = req.params.id;

    // WITH RECURSIVE による一撃ツリー抽出
    const treeData = await prisma.$queryRaw`
        WITH RECURSIVE tree AS (
            SELECT e.id, e.content, e."createdAt", NULL as parent_id
            FROM "Event" e WHERE e.id = ${rootId}
            UNION ALL
            SELECT e.id, e.content, e."createdAt", l."parentEventId"
            FROM "Event" e
            INNER JOIN "Lineage" l ON e.id = l."childEventId"
            INNER JOIN tree t ON l."parentEventId" = t.id
        )
        SELECT * FROM tree;
    `;

    // 階層型のJSONにパースする処理（省略）
    const structuredTree = buildNestedTree(treeData, rootId);
    res.json(structuredTree);
});

// PM2の監視下で常時Listenする
app.listen(3000, () => {
    console.log("🚀 API Server running on port 3000");
});
```

---

## 4. 本番環境へのデプロイ（24時間運用設定）

作成したプログラムを、安全かつ永遠に動かし続けるためのサーバー設定です。

### 4.1 PM2（プロセスマネージャー）の設定
APIとワーカーの両方を監視・管理するための設計図（`ecosystem.config.js`）を作成します。

```javascript
// ecosystem.config.js
module.exports = {
  apps :[
    {
      name: "toitoi-api",
      script: "./api.js",
      instances: "max",       // CPUコアをフル活用してAPIを並列起動
      exec_mode: "cluster",   // クラスタモードで負荷分散
      env_production: { NODE_ENV: "production" }
    },
    {
      name: "toitoi-worker",
      script: "./worker.js",
      instances: 1,           // ワーカーは多重同期を防ぐため必ず1つだけ起動
      autorestart: true,      // エラーで落ちても自動再起動
      env_production: { NODE_ENV: "production" }
    }
  ]
}
```
**起動コマンド:** サーバー上で `pm2 start ecosystem.config.js --env production` と打つだけで、2つのプログラムがバックグラウンドで完璧に稼働し始めます。

### 4.2 Caddy（自動HTTPS受付係）の設定
インターネットからのアクセス（[https://api.toitoi.cultivationdata.net](https://api.toitoi.cultivationdata.net)）を受け取り、内部のAPI（3000ポート）に安全に繋ぎます。
Caddy最大の魅力は、**設定ファイルにドメイン名を書くだけで、裏側で自動的にLet's EncryptからSSL証明書を取得し、永久に自動更新し続けてくれる**点です。

**`Caddyfile` の記述例（これだけで完結します）:**
```caddyfile
# ドメイン名を指定（これだけで自動HTTPS化が有効になる）
api.toitoi.cultivationdata.net {
    
    # 内部のNode.js API(3000番ポート)へリクエストを転送
    reverse_proxy localhost:3000

    # 最低限のセキュリティヘッダーを付与
    header {
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
    }
}
```
設定後、サーバーのターミナルで `caddy reload` を実行するだけで、完全にセキュアなAPIサーバーが公開されます。

---

## 5. 運用保守の重要ポイント

1.  **ゼロメンテナンスのHTTPS**
    Caddyを使用しているため、SSL証明書の有効期限切れ（よくあるWebサーバーのトラブル）を気にする必要が一切なくなります。
2.  **データベースのバックアップ**
    PostgreSQLには大量の系統樹データが蓄積されます。定期的な `pg_dump` による自動バックアップをOSの `cron` 等で設定してください。
3.  **ログの監視**
    PM2はすべてのログを記録しています。エラーが起きていないか確認するには、サーバー上で `pm2 logs` と打ち込むだけで、APIとワーカー両方のリアルタイムログを監視できます。

---
以上が、Toitoiインデクサーを本番環境で運用するための**完全なアーキテクチャ**です。この構成により、「問い」の収集から、アプリでの描画に至るまで、止まることのない堅牢な知識コモンズ基盤が実現します。
