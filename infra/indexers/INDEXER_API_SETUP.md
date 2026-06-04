# 構築ガイド：Canonical Event 中心の multi-protocol インデクサーAPI

**Version: 0.6.2** | **Status: evolving** | **Last updated: 2026-06-04**

このガイドは、Canonical Event を共通入力にした indexer / API の構築・復旧・再構築手順をまとめたものです。

現行仕様では、indexer は protocol そのものではなく semantic layer を扱い、protocol ごとの差分は adapter / replay module / metadata に閉じます。Nostr は first operational transport として扱いますが、Phase 14 以降は Nostr / ATProto をまたいだ multi-transport replay と provenance 集約も扱える前提です。

---

## 0. まず見るもの

- API 参照実装: `apps/api/server.js`
- API service layer: `apps/api/standard_api_service.js`
- protocol runtime: `packages/protocol/protocol_runtime.js`
- protocol storage runtime: `packages/protocol/protocol_storage_runtime.js`
- multi-transport replay: `packages/protocol/multi_transport_replay.js`
- outbound fan-out plan: `packages/protocol/multi_transport_outbound.js`
- replay CLI: `packages/nostr/storage/replay_cli.js`
- Nostr storage: `packages/nostr/storage/replay.js`
- ATProto storage: `packages/atproto/storage/replay.js`
- 運用テンプレート: `docs/operations/PROTOCOL_OPERATION_TEMPLATE.md`

---

## 1. 全体像

Toitoi の indexer は、protocol ごとに別の API 形を持つのではなく、canonical view を共通に返します。

- API は canonical view を返す
- replay は storage module ごとに差し替える
- protocol 固有の ingest / canonicalize / dedupe / ordering は adapter 側に閉じる
- `TOITOI_PROTOCOL` で選んだ protocol に応じて storage module を解決する
- `TOITOI_TRANSPORT_SOURCES` が指定されている場合は、複数 transport の replay をまとめて canonical view に反映する
- cross-source の duplicate suppression と provenance 集約は semantic layer 側で扱う

### 共通の起動原則

1. API は `apps/api/server.js` を起動する
1. `TOITOI_PROTOCOL` で protocol を選ぶ
1. `TOITOI_STORAGE_DIR` を指定して replay 由来の snapshot を読む
1. replay が無い protocol は、storage なしの read-only / metadata-only 扱いにする
1. 複数 transport をまとめるときは `TOITOI_TRANSPORT_SOURCES` を使う

---

## 2. Quick Start

### 2.1 前提

- Node.js v20 以上
- `pnpm` が使えること
- clone した Toitoi リポジトリの root にいること

### 2.2 workspace の初期化

```bash
pnpm install
```

### 2.3 API を起動する

Nostr を使う場合:

```bash
TOITOI_PROTOCOL=nostr TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
```

ATProto を使う場合:

```bash
TOITOI_PROTOCOL=atproto TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
```

Nostr と ATProto をまとめて扱う場合:

```bash
TOITOI_TRANSPORT_SOURCES='[{"protocol":"nostr","storageDir":"/path/to/nostr-storage"},{"protocol":"atproto","storageDir":"/path/to/atproto-storage"}]' pnpm --filter @toitoi/api start
```

`TOITOI_STORAGE_DIR` が未設定なら、API は空の index snapshot でも起動できます。  
`localfs` は現時点で runtime replay が未対応なので、storage 付き起動はしません。
`TOITOI_TRANSPORT_SOURCES` が入っている場合、API は `multi-transport` の storage runtime として起動し、source 跨ぎの provenance 集約を反映します。

### 2.4 Nostr ingest worker を起動する

`toitoi-nostr-worker` は Nostr relay から transport event を収集し、canonicalized event を保存する運用 worker です。  
入力は relay subscription で、出力は `raw-events.jsonl` / `canonical-events.jsonl` / `ingest-log.jsonl` / `index-snapshot.json` です。  
この worker は常駐前提で、API とは別プロセスとして動かします。  
`infra/transports/nostr/relay_ingest_worker.js` を直接起動して使います。

#### 2.4.1 Nostr worker を起動する

Nostr relay から ingest する場合は、`relay-url` と `storage-dir` を指定して worker を起動します。

```bash
pnpm --filter @toitoi/nostr-transport start -- --relay-url wss://relay.example.com --protocol nostr --storage-dir /path/to/storage
```

#### 2.4.2 worker の役割

worker は API とは別プロセスで動かし、relay の ingest と storage 書き込みを担当します。  
API 単体では live ingest は進まないので、Nostr を運用する場合は worker の起動が必要です。

### 2.5 ATProto ingest worker を起動する

ATProto は現状 replay ベースで運用しつつ、JSONL batch ingest と Jetstream live ingest の両方を `infra/transports/atproto/atproto_ingest_worker.js` で扱えます。  
Nostr と同じ relay worker ではないので、起動方法と運用単位を分けて考えます。
batch ingest は保存済みの JSONL アーカイブを 1 回読み、live ingest は Jetstream websocket に常時接続して新着を取り込みます。  
どちらも `@toitoi/atproto/adapter/ingest_pipeline.js` と `@toitoi/atproto/storage/persistence.js` を通して canonicalize と保存を行います。

#### 2.5.1 batch ingest を起動する

```bash
pnpm --filter @toitoi/atproto-transport start -- --in /path/to/atproto-archive.jsonl --out /path/to/atproto-report.json --storage-dir /path/to/storage
```

#### 2.5.2 live ingest を起動する

```bash
pnpm --filter @toitoi/atproto-transport start -- --stream-url wss://jetstream.example/subscribe --storage-dir /path/to/storage
```

live mode では `ATPROTO_STREAM_URL` / `ATPROTO_STORAGE_DIR` / `ATPROTO_WANTED_COLLECTIONS` を PM2 の env で渡せます。

### 2.6 replay を実行する

Nostr replay:

```bash
node packages/nostr/storage/replay_cli.js --protocol nostr --storage-dir /path/to/storage --verify
```

ATProto replay:

```bash
node packages/nostr/storage/replay_cli.js --protocol atproto --storage-dir /path/to/storage --verify
```

`localfs` は replay 対応待ちです。現時点では `replayStorage()` による再構築は行いません。

### 2.7 疎通確認

```bash
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
curl "http://127.0.0.1:3000/api/v1/protocols"
```

---

## 3. PM2 で常駐化する

作業場所: Toitoi リポジトリ root  
参照: この節の `ecosystem.config.cjs` サンプルまたは PM2 の個別起動コマンド

この節は、PM2 の定義をどう組むかの説明です。  
`MONITOR_SETUP.md` は、`toitoi-nostr-worker` と `toitoi-api` が常駐している前提で監視と自動回復を行います。  
そのため、Nostr を live ingest まで含めて運用する場合は、API だけでなく worker もあわせて常駐化します。  
ATProto も live ingest ならここで常駐化できます。  
一方で `batch ingest` は常駐ではなく、アーカイブを 1 回処理する単発ジョブとして使います。

`toitoi-api` と各 transport worker は別アプリとして定義します。  
以下の `ecosystem.config.cjs` 例では `toitoi-nostr-worker` と `toitoi-atproto-worker` を分けて起動できます。  
この例は説明用で、リポジトリにファイルとして追加する必要はありません。

```javascript
'use strict';

const path = require('path');

const repoRoot = __dirname;
const homeDir = process.env.HOME || process.env.USERPROFILE || '';

module.exports = {
  apps: [
    {
      name: 'toitoi-api',
      cwd: repoRoot,
      script: './apps/api/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env_nostr: {
        NODE_ENV: 'production',
        TOITOI_PROTOCOL: 'nostr',
        TOITOI_STORAGE_DIR: path.join(homeDir, 'path/to/nostr-storage'),
      },
      env_atproto: {
        NODE_ENV: 'production',
        TOITOI_PROTOCOL: 'atproto',
        TOITOI_STORAGE_DIR: path.join(homeDir, 'path/to/atproto-storage'),
      },
      env_multi: {
        NODE_ENV: 'production',
        TOITOI_TRANSPORT_SOURCES: '[{"protocol":"nostr","storageDir":"/path/to/nostr-storage"},{"protocol":"atproto","storageDir":"/path/to/atproto-storage"}]',
      },
    },
    {
      name: 'toitoi-nostr-worker',
      cwd: repoRoot,
      script: './infra/transports/nostr/relay_ingest_worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env_nostr: {
        NODE_ENV: 'production',
        TOITOI_PROTOCOL: 'nostr',
        TOITOI_STORAGE_DIR: path.join(homeDir, 'path/to/nostr-storage'),
        RELAY_URL: 'wss://relay.example.com',
      },
    },
    {
      name: 'toitoi-atproto-worker',
      cwd: repoRoot,
      script: './infra/transports/atproto/atproto_ingest_worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env_atproto_batch: {
        // 単発実行用: 保存済み JSONL アーカイブを 1 回流す
        NODE_ENV: 'production',
        ATPROTO_INGEST_INPUT: '/path/to/atproto-archive.jsonl',
        ATPROTO_INGEST_OUTPUT: '/path/to/atproto-worker-report.json',
        ATPROTO_STORAGE_DIR: path.join(homeDir, 'path/to/atproto-storage'),
        ATPROTO_INGEST_SOURCE_LABEL: '/path/to/atproto-archive.jsonl',
      },
      env_atproto_live: {
        // 常駐運用用: Jetstream websocket に接続し続ける
        NODE_ENV: 'production',
        ATPROTO_STREAM_URL: 'wss://jetstream.example/subscribe',
        ATPROTO_STORAGE_DIR: path.join(homeDir, 'path/to/atproto-storage'),
        ATPROTO_INGEST_SOURCE_LABEL: 'jetstream',
        ATPROTO_WANTED_COLLECTIONS: 'app.toitoi.inquiry',
      },
    },
  ],
};
```

使い分けは次の通りです。

- Nostr だけで動かすなら `--env nostr`
- ATProto batch ingest を 1 回流すなら `--env atproto_batch`
- ATProto live ingest だけで動かすなら `--env atproto_live`
- 両方まとめて読むなら `--env multi`

起動例:

```bash
# Nostr だけ
pm2 start ecosystem.config.cjs --only toitoi-nostr-worker --env nostr
pm2 start ecosystem.config.cjs --only toitoi-api --env nostr

# ATProto live ingest だけ
pm2 start ecosystem.config.cjs --only toitoi-atproto-worker --env atproto_live

# Nostr + ATProto をまとめて読む
pm2 start ecosystem.config.cjs --only toitoi-api --env multi
```

要するに、**API は Nostr / ATProto を同居させられるが、常駐 worker は Nostr と ATProto live ingest に限る**です。  
`toitoi-api` は `--only` で対象アプリを絞り、`--env` で運用モードを選びます。

### Nostr 運用の再起動例

Nostr の live ingest を再開する場合は、worker と API を別々に起動します。  
ATProto だけを扱う構成や multi-transport 構成では、この Nostr worker は起動しません。

```bash
pm2 delete toitoi-nostr-worker toitoi-api
pm2 start ecosystem.config.cjs --only toitoi-nostr-worker --env nostr
pm2 start ecosystem.config.cjs --only toitoi-api --env nostr
pm2 save
pm2 startup
```

---

## 4. 実装の呼び出し関係

- `apps/api/server.js` -> `apps/api/standard_api_service.js`
- `apps/api/server.js` -> `packages/protocol/protocol_storage_runtime.js`
- `apps/api/server.js` -> `packages/protocol/multi_transport_replay.js`
- `apps/api/server.js` -> `packages/nostr/storage/replay.js` / `packages/atproto/storage/replay.js`
- `apps/api/standard_api_service.js` -> protocol ごとの `storage/indexer.js` / `storage/standard_api_views.js`
- `packages/nostr/storage/replay_cli.js` -> `packages/protocol/protocol_runtime.js`

---

## 5. バックアップと復旧

### 5.1 保存対象

- `raw-events.jsonl`
- `canonical-events.jsonl`
- `ingest-log.jsonl`
- `index-snapshot.json`

### 5.2 復旧の基本

```bash
node packages/nostr/storage/replay_cli.js --protocol <name> --storage-dir /path/to/storage --verify
TOITOI_PROTOCOL=<name> TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
```

raw event を source of truth にし、canonicalized event と index snapshot は replay で再生成します。
複数 transport を合わせる場合は、各 storage を個別に replay したうえで `TOITOI_TRANSPORT_SOURCES` を使って API 側で統合します。

---

## 6. 運用チェック

- `/health` が 200 を返す
- `/api/v1/protocols` に選択中 protocol が出る
- replay 後に `index-snapshot.json` が再構築される
- protocol ごとの差分が metadata と capability に閉じている
- 複数 transport を読んだときに source 跨ぎの duplicate が 1 件に集約される

---

## 7. プロトコル別の補足

### Nostr

- first operational transport
- live ingest は `infra/transports/nostr/` 側で扱う
- replay は `node packages/nostr/storage/replay_cli.js --protocol nostr ...` を使う
- source 内 duplicate suppression は Nostr replay 側で行う

### ATProto

- 現状は replay ベースで運用する
- batch ingest と live ingest は `infra/transports/atproto/atproto_ingest_worker.js` で扱う
- live ingest は常駐運用に向く
- batch ingest は単発実行に向く
- source 内 duplicate suppression は ATProto replay 側で行う

### Multi-transport

- `TOITOI_TRANSPORT_SOURCES` で複数 storage をまとめて読む
- cross-source の identity mapping がある場合のみ provenance を集約する
- 曖昧な case は無理に merge せず、relation / lineage に残す

### LocalFS

- runtime replay は未対応
- metadata-only / future file-backed migration の候補として残す

---

## 8. 関連

- [README.md](./README.md)
- [CLEAN_START.md](./CLEAN_START.md)
- [docs/architecture/MULTI_PROTOCOL_INDEXER.md](../../docs/architecture/MULTI_PROTOCOL_INDEXER.md)
- [docs/roadmap/IMPLEMENTATION_PLAN.md](../../docs/roadmap/IMPLEMENTATION_PLAN.md)
