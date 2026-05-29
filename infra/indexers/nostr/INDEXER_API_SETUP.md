# 構築ガイド：Canonical Event 中心のインデクサーAPI

**Version: 0.5.0** | **Status: evolving** | **Last updated: 2026-05-24**

> **現行前提**
> このガイドはローカルで clone したリポジトリの root で読みながら、必要に応じてサーバー側の作業場所へ反映する前提です。  
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

この文書は、Reference mode を前提に API / worker / replay を立ち上げる手順をまとめています。

---

## 2. Reference Mode の Quick Start

### 2.1 前提

- Node.js v20 以上
- `pnpm` が使えること
- まずはリポジトリを `git clone` して、ルートディレクトリに入っておくこと
- clone した Toitoi リポジトリの root にいること
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
この起動だけで `raw-events.jsonl` / `canonical-events.jsonl` / `ingest-log.jsonl` / `index-snapshot.json` が自動生成されるわけではありません。
これらは ingest 保存か `pnpm --filter @toitoi/nostr replay -- --storage-dir /path/to/storage --verify` によって作られます。

### 2.4 ingest worker を起動する

```bash
pnpm --filter @toitoi/nostr-transport start -- --relay-url wss://relay.example.com --storage-dir /path/to/storage
```

Reference mode では `--relay-url` を明示し、保存したい場合は `--storage-dir` も指定して起動します。

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

## 4. 本番運用の常駐化

サーバー上で本番運用する場合は、`toitoi-api` と `toitoi-worker` を常駐化し、公開入口に Caddy を置くのが分かりやすいです。  
ここでの PM2 と Caddy は、アプリの必須依存ではなく、運用時のプロセス管理とリバースプロキシのための層です。

### 4.1 PM2 のインストール

作業場所: `任意`（Node.js が使える環境）

PM2 は Node.js のプロセスマネージャーなので、まずはグローバルに入れるのが分かりやすいです。

```bash
npm install -g pm2
pm2 --version
```

`npm` のグローバルインストールを避けたい場合は、`npx pm2` でも起動できますが、このガイドでは `pm2` コマンドがそのまま使える前提で進めます。

### 4.2 PM2 の設定

作業場所: clone した Toitoi リポジトリの root  
編集対象ファイル: `ecosystem.config.cjs`

```javascript
// ecosystem.config.cjs
const path = require('path');

const homeDir = process.env.HOME || process.env.USERPROFILE || '';

module.exports = {
  apps: [
    {
      name: "toitoi-api",
      cwd: __dirname,
      script: "./apps/api/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      env_production: {
        NODE_ENV: "production",
        TOITOI_STORAGE_DIR: path.join(homeDir, "/path/to/storage"),
      },
    },
    {
      name: "toitoi-worker",
      cwd: __dirname,
      script: "./infra/transports/nostr/relay_ingest_worker.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      env_production: {
        NODE_ENV: "production",
        RELAY_URL: "wss://relay.your-domain.com",
        RELAY_STORAGE_DIR: path.join(homeDir, "/path/to/storage"),
      },
    },
  ],
};
```

`ecosystem.config.cjs` はリポジトリ root に置きます。

`RELAY_URL` を変える場合は、ここを編集してから `pm2 delete` と `pm2 start` をやり直します。  
`pm2 start` に `--relay-url` を追加する運用にはしません。

### 4.2.1 設定変更後の再起動手順

`ecosystem.config.cjs` や PM2 の起動構成を変更した場合は、既存プロセスをいったん削除してから起動し直します。  
この順番にすると、古い設定を引きずらずに `toitoi-api` と `toitoi-worker` を再登録できます。

```bash
pm2 delete toitoi-worker toitoi-api
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

`pm2 startup` は、PM2 をOS起動時に自動復帰させるための設定です。  
初回設定時だけでなく、PM2 の自動起動まわりを再作成したいときにも実行します。

### 4.3 Caddy の設定

作業場所: `Caddy 設定ディレクトリ`（通常は `/etc/caddy/`）  
編集対象ファイル: `/etc/caddy/Caddyfile`

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
  redir / /health 308

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

### 4.4 役割の切り分け

- `API` と `worker` は `node` で直接動く
- `PM2` は常駐化と再起動制御に使う
- `Caddy` は公開入口と HTTPS 終端に使う

---

## 5. インデクサーの確認手順

### 5.1 配置確認

```bash
ls apps/api/server.js apps/api/standard_api_service.js
ls infra/transports/nostr/relay_ingest_worker.js
```

### 5.2 実装の呼び出し関係

- `apps/api/server.js` -> `apps/api/standard_api_service.js`
- `apps/api/server.js` -> `@toitoi/nostr/storage/replay.js`
- `apps/api/standard_api_service.js` -> `@toitoi/nostr/storage/indexer.js`
- `apps/api/standard_api_service.js` -> `@toitoi/nostr/storage/standard_api_views.js`
- `infra/transports/nostr/relay_ingest_worker.js` -> `@toitoi/nostr/adapter/relay_ingest.js`
- `infra/transports/nostr/relay_ingest_worker.js` -> `@toitoi/nostr/storage/persistence.js`

### 5.3 主要な起動確認

`toitoi-api` をすでに起動している場合は、ここで `pnpm --filter @toitoi/api start` をもう一度実行しないでください。  
その場合は `curl` で疎通確認します。

```bash
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
```

手動起動を確認したい場合は、以下を実行します。

```bash
TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
pnpm --filter @toitoi/nostr-transport start -- --relay-url wss://relay.example.com
pnpm --filter @toitoi/nostr replay -- --storage-dir /path/to/storage --verify
```

worker のログは標準出力と `stderr` を確認します。  
`--relay-url is required` が出る場合は、起動コマンドの `--relay-url` が抜けています。

---

## 6. バックアップと復旧

### 6.1 バックアップの考え方

- raw event を一次保管する
- canonicalized event と index snapshot は再生成可能な成果物として扱う
- 置換や修復は上書きではなく、追記または replay で扱う

### 6.2 保存対象

- `raw-events.jsonl`
- `canonical-events.jsonl`
- `ingest-log.jsonl`
- `index-snapshot.json`

### 6.3 復旧の流れ

```bash
pnpm --filter @toitoi/nostr replay -- --storage-dir /path/to/storage --verify
TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
```

詳細は [infra/transports/nostr/BACKUP_AND_RESTORE.md](../../transports/nostr/BACKUP_AND_RESTORE.md) を参照してください。

---

## 7. 運用チェック

- API が `/health` を返す
- worker が relay に接続できる
- replay 後に index snapshot が再構築される

---

## 8. 依存の向き

- `apps/api` -> `@toitoi/nostr`
- `infra/transports/nostr` -> `@toitoi/nostr` と `@toitoi/api`
- `packages/nostr` -> `@toitoi/protocol`

---

## 9. 役割の一言まとめ

- `apps/api/`: canonical view を返す HTTP 入口
- `infra/transports/nostr/`: relay ingest の運用入口
- `packages/nostr/`: adapter / converter / storage の共有実装

---

## 関連

- [apps/api/README.md](../../../apps/api/README.md)
- [infra/transports/nostr/README.md](../../transports/nostr/README.md)
- [infra/transports/nostr/BACKUP_AND_RESTORE.md](../../transports/nostr/BACKUP_AND_RESTORE.md)
