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

### 2.4 replay を実行する

Nostr replay:

```bash
node packages/nostr/storage/replay_cli.js --protocol nostr --storage-dir /path/to/storage --verify
```

ATProto replay:

```bash
node packages/nostr/storage/replay_cli.js --protocol atproto --storage-dir /path/to/storage --verify
```

`localfs` は replay 対応待ちです。現時点では `replayStorage()` による再構築は行いません。

### 2.5 疎通確認

```bash
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
curl "http://127.0.0.1:3000/api/v1/protocols"
```

---

## 3. PM2 で常駐化する

作業場所: Toitoi リポジトリ root  
編集対象ファイル: `ecosystem.config.cjs`

```javascript
const path = require('path');

const homeDir = process.env.HOME || process.env.USERPROFILE || '';

module.exports = {
  apps: [
    {
      name: 'toitoi-api',
      cwd: __dirname,
      script: './apps/api/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env_production: {
        NODE_ENV: 'production',
        TOITOI_PROTOCOL: 'nostr',
        TOITOI_STORAGE_DIR: path.join(homeDir, 'path/to/storage'),
      },
    },
  ],
};
```

protocol を変えるときは `TOITOI_PROTOCOL` を切り替えます。  
API は protocol-aware なので、`atproto` へも同じ構成で切り替えられます。

### 設定変更後の再起動

```bash
pm2 delete toitoi-api
pm2 start ecosystem.config.cjs --env production
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

- append-only storage と replay は利用可能
- live ingest は別の transport 層として追加する
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
