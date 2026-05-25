# 構築ガイド：Canonical Event 中心のインデクサーAPI

**Version: 0.5.0** | **Status: evolving** | **Last updated: 2026-05-24**

> **現行前提**
> このリポジトリは `pnpm workspace` と `@toitoi/*` の package 名で運用します。  
> `apps/` は実行入口、`infra/` は運用入口、`packages/` は共有実装です。

本ガイドは、Nostr transport から ingest された raw event を canonicalized event に変換し、Standard API として返すまでの構築・運用手順を一通りまとめた総合版です。

---

## 0. まず見るもの

- API 参照実装: `apps/api/server.js`
- API service layer: `apps/api/standard_api_service.js`
- ingest worker: `infra/transports/nostr/relay_ingest_worker.js`
- Nostr 変換・保存: `@toitoi/nostr/adapter/` と `@toitoi/nostr/storage/`
- 運用入口: `infra/transports/nostr/README.md`
- バックアップと復旧: `infra/transports/nostr/BACKUP_AND_RESTORE.md`

---

## 1. 全体像

Toitoi のインデクサー構成は、大きく 2 つの運用モードで考えると分かりやすいです。

- **Reference / workspace mode**
  - 現行の参照実装をそのまま使う
  - append-only storage を中心に動かす
  - `pnpm --filter` で API / worker / replay を起動する

- **Production / DB-backed mode**
  - Nostream の PostgreSQL を使って統合運用する
  - PM2 と Caddy で常駐化・公開化する
  - `toitoi_db` と `pg_trgm` を使う

この文書は、まず Reference mode を確実に立ち上げ、その後に Production mode に進める構成です。

---

## 2. Reference Mode の Quick Start

### 2.1 前提

- Node.js v20 以上
- `pnpm` が使えること
- まずはリポジトリを `git clone` して、ルートディレクトリに入っておくこと
- リポジトリの root にいること
- `pnpm` の基本だけ不安なら: [pnpm Workspace 早見表](../../../docs/operations/PNPM_WORKSPACE_GUIDE.md)

### 2.2 workspace の初期化

リポジトリを取得したあと、root で実行します。

```bash
pnpm install
```

### 2.3 API を起動する

```bash
TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
```

`TOITOI_STORAGE_DIR` が未設定の場合は、空の index snapshot で起動します。

### 2.4 ingest worker を起動する

```bash
pnpm --filter @toitoi/nostr-transport start -- --relay-url wss://relay.example.com
```

### 2.5 replay と疎通確認

```bash
pnpm --filter @toitoi/nostr replay -- --storage-dir /path/to/storage --verify
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
```

---

## 3. Reference Mode の役割分担

- `apps/api/`
  - canonical view を返す HTTP 入口
  - [apps/api/README.md](../../../apps/api/README.md)

- `infra/transports/nostr/`
  - relay ingest の運用入口
  - [infra/transports/nostr/README.md](../../transports/nostr/README.md)

- `packages/nostr/`
  - adapter / converter / storage の共有実装
  - `@toitoi/nostr/adapter/`
  - `@toitoi/nostr/storage/`

---

## 4. DB-backed Production Mode

Reference mode で仕組みを理解したあと、本番運用では Nostream の PostgreSQL を使う構成に進めます。  
このモードでは、relay の DB と Toitoi の index 用 DB を同居させるか、分離するかを決めます。

### 4.1 Nostream 側の PostgreSQL を開く

`nostream-db` コンテナにホスト OS からアクセスできるようにします。

```yaml
nostream-db:
  image: postgres:15-alpine
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
    - 127.0.0.1:5432:5432
  command: postgres -c 'config_file=/postgresql.conf'
  restart: always
```

### 4.2 Toitoi 用 DB を作る

```bash
sudo docker exec -it nostream-db psql -U nostr_ts_relay -d postgres
```

```sql
CREATE USER toitoi_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE toitoi_db OWNER toitoi_user TEMPLATE template0;
GRANT ALL PRIVILEGES ON DATABASE toitoi_db TO toitoi_user;
\q
```

```bash
sudo docker exec -it nostream-db psql -U toitoi_user -d toitoi_db
```

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\q
```

### 4.3 使い分け

- `pg_trgm` は簡易な全文検索・部分一致検索向け
- より強い日本語検索が必要なら、別途拡張選定を検討する
- 現行の append-only storage reference 実装とは独立した本番運用選択肢として扱う

---

## 5. PM2 と Caddy の常駐運用

本番公開では、API と worker を PM2 で常駐化し、Caddy で HTTPS と WebSocket を受けます。

### 5.1 PM2 の設定

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
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "toitoi-worker",
      script: "./infra/transports/nostr/relay_ingest_worker.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

起動します。

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

### 5.2 Caddy の設定

```caddyfile
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

api.your-domain.com {
  reverse_proxy localhost:3000

  header {
    X-Frame-Options "SAMEORIGIN"
    X-XSS-Protection "1; mode=block"
    Access-Control-Allow-Origin "*"
  }
}
```

```bash
sudo systemctl restart caddy
```

---

## 6. インデクサーの確認手順

### 6.1 配置確認

```bash
ls apps/api/server.js apps/api/standard_api_service.js
ls infra/transports/nostr/relay_ingest_worker.js
```

### 6.2 実装の呼び出し関係

- `apps/api/server.js` -> `apps/api/standard_api_service.js`
- `apps/api/server.js` -> `@toitoi/nostr/storage/replay.js`
- `apps/api/standard_api_service.js` -> `@toitoi/nostr/storage/indexer.js`
- `apps/api/standard_api_service.js` -> `@toitoi/nostr/storage/standard_api_views.js`
- `infra/transports/nostr/relay_ingest_worker.js` -> `@toitoi/nostr/adapter/relay_ingest.js`
- `infra/transports/nostr/relay_ingest_worker.js` -> `@toitoi/nostr/storage/persistence.js`

### 6.3 主要な起動確認

```bash
TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
pnpm --filter @toitoi/nostr-transport start -- --relay-url wss://relay.example.com
pnpm --filter @toitoi/nostr replay -- --storage-dir /path/to/storage --verify
```

---

## 7. バックアップと復旧

### 7.1 バックアップの考え方

- raw event を一次保管する
- canonicalized event と index snapshot は再生成可能な成果物として扱う
- 置換や修復は上書きではなく、追記または replay で扱う

### 7.2 保存対象

- `raw-events.jsonl`
- `canonical-events.jsonl`
- `ingest-log.jsonl`
- `index-snapshot.json`

### 7.3 復旧の流れ

```bash
pnpm --filter @toitoi/nostr replay -- --storage-dir /path/to/storage --verify
TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
```

詳細は [infra/transports/nostr/BACKUP_AND_RESTORE.md](../../transports/nostr/BACKUP_AND_RESTORE.md) を参照してください。

---

## 8. 運用チェック

- API が `/health` を返す
- worker が relay に接続できる
- replay 後に index snapshot が再構築される
- Caddy が API と relay の両方を中継する
- PM2 が `toitoi-api` と `toitoi-worker` を保持する

---

## 9. 依存の向き

- `apps/api` -> `@toitoi/nostr`
- `infra/transports/nostr` -> `@toitoi/nostr` と `@toitoi/api`
- `packages/nostr` -> `@toitoi/protocol`

---

## 10. 役割の一言まとめ

- `apps/api/`: canonical view を返す HTTP 入口
- `infra/transports/nostr/`: relay ingest の運用入口
- `packages/nostr/`: adapter / converter / storage の共有実装
- `PM2`: 常駐化
- `Caddy`: HTTPS / WebSocket の公開入口
- `Nostream PostgreSQL`: DB-backed 本番運用の選択肢

---

## 関連

- [apps/api/README.md](../../../apps/api/README.md)
- [infra/transports/nostr/README.md](../../transports/nostr/README.md)
- [infra/transports/nostr/BACKUP_AND_RESTORE.md](../../transports/nostr/BACKUP_AND_RESTORE.md)
