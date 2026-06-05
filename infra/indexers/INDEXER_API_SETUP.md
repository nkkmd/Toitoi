# 構築ガイド：Canonical Event 中心の multi-protocol インデクサーAPI

**Version: 0.6.3** | **Status: evolving** | **Last updated: 2026-06-05**

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
- replay CLI: `packages/nostr/storage/replay_cli.js`（protocol-aware）
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

Nostr の relay を複数まとめて扱う場合も同じです。

```bash
TOITOI_TRANSPORT_SOURCES='[{"protocol":"nostr","storageDir":"/path/to/nostr-relay-a"},{"protocol":"nostr","storageDir":"/path/to/nostr-relay-b"}]' pnpm --filter @toitoi/api start
```

`TOITOI_STORAGE_DIR` が未設定なら、API は空の index snapshot でも起動できます。  
`localfs` は現時点で runtime replay が未対応なので、storage 付き起動はしません。
`TOITOI_TRANSPORT_SOURCES` が入っている場合、API は `multi-transport` の storage runtime として起動し、source 跨ぎの provenance 集約を反映します。

### 2.4 Nostr ingest worker を起動する

`toitoi-nostr-worker` は Nostr relay から transport event を収集し、canonicalized event を保存する運用 worker です。  
入力は relay subscription で、出力は `raw-events.jsonl` / `canonical-events.jsonl` / `ingest-log.jsonl` / `index-snapshot.json` です。  
この worker は 1 回の ingest を終えたら終了する単発ジョブとして扱えます。  
そのため、`systemd timer` や `cron` で定期起動する運用に向いています。  
`infra/transports/nostr/relay_ingest_worker.js` を直接起動して使います。

#### 2.4.1 Nostr worker を起動する

Nostr relay から ingest する場合は、`relay-url` と `storage-dir` を指定して worker を起動します。

```bash
pnpm --filter @toitoi/nostr-transport start -- --relay-url wss://relay.example.com --protocol nostr --storage-dir /path/to/storage
```

複数 relay を運用する場合は、relay ごとに worker を分けて、`storage-dir` も別々にします。

```bash
pnpm --filter @toitoi/nostr-transport start -- --relay-url wss://relay-a.example.com --protocol nostr --storage-dir /path/to/nostr-relay-a
pnpm --filter @toitoi/nostr-transport start -- --relay-url wss://relay-b.example.com --protocol nostr --storage-dir /path/to/nostr-relay-b
```

#### 2.4.2 worker の役割

worker は API とは別プロセスで動かし、relay の ingest と storage 書き込みを担当します。  
API 単体では live ingest は進まないので、Nostr を運用する場合は worker の起動が必要です。  
relay が複数ある場合は、worker を relay ごとに増やします。API はそれぞれの storage を `TOITOI_TRANSPORT_SOURCES` でまとめて読みます。

#### 2.4.3 定期実行で回す場合

Nostr worker を `10分おき` や `1時間おき` のように回すなら、`systemd service` + `systemd timer` の組み合わせが自然です。  
`PM2` の `autorestart` は「落ちたら再起動」用であって、定期スケジュールの代わりにはなりません。

#### 2.4.4 systemd timer の設定例

以下は、10分おきに Nostr worker を起動する最小構成の例です。

`/etc/systemd/system/toitoi-nostr-worker.service`

```ini
[Unit]
Description=Toitoi Nostr ingest worker

[Service]
Type=oneshot
WorkingDirectory=/home/you/github/Toitoi
Environment=NODE_ENV=production
Environment=TOITOI_PROTOCOL=nostr
Environment=TOITOI_STORAGE_DIR=/var/lib/toitoi/nostr-storage
Environment=RELAY_URL=wss://relay.example.com
ExecStart=/usr/bin/env bash -lc 'pnpm --filter @toitoi/nostr-transport start -- --relay-url "$RELAY_URL" --protocol nostr --storage-dir "$TOITOI_STORAGE_DIR"'
```

複数 relay を回す場合は、service を relay ごとに分けるか、template unit にします。

```ini
[Unit]
Description=Toitoi Nostr ingest worker for %i

[Service]
Type=oneshot
WorkingDirectory=/home/you/github/Toitoi
Environment=NODE_ENV=production
Environment=TOITOI_PROTOCOL=nostr
Environment=TOITOI_STORAGE_DIR=/var/lib/toitoi/nostr-%i-storage
Environment=RELAY_URL=wss://%i.example.com
ExecStart=/usr/bin/env bash -lc 'pnpm --filter @toitoi/nostr-transport start -- --relay-url "$RELAY_URL" --protocol nostr --storage-dir "$TOITOI_STORAGE_DIR"'
```

この場合は `toitoi-nostr-worker@relay-a.service` と `toitoi-nostr-worker@relay-b.service` のように使えます。

`/etc/systemd/system/toitoi-nostr-worker.timer`

```ini
[Unit]
Description=Run Toitoi Nostr ingest worker every 10 minutes

[Timer]
OnCalendar=*:0/10
Persistent=true
Unit=toitoi-nostr-worker.service

[Install]
WantedBy=timers.target
```

有効化と起動は次のようにします。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now toitoi-nostr-worker.timer
sudo systemctl list-timers --all | grep toitoi-nostr-worker
```

ログ確認は `journalctl -u toitoi-nostr-worker.service` を使います。  
`Persistent=true` を入れておくと、サーバー再起動中に飛んだ実行回数を次回起動時に補いやすくなります。

### 2.5 ATProto ingest worker を起動する

ATProto は現状 replay ベースで運用しつつ、JSONL batch ingest と Jetstream live ingest の両方を `infra/transports/atproto/atproto_ingest_worker.js` で扱えます。  
Nostr と同じ relay worker ではないので、起動方法と運用単位を分けて考えます。
batch ingest は保存済みの JSONL アーカイブを 1 回読み、live ingest は Jetstream websocket に常時接続して新着を取り込みます。  
どちらも `@toitoi/atproto/adapter/ingest_pipeline.js` と `@toitoi/atproto/storage/persistence.js` を通して canonicalize と保存を行います。

#### 2.5.1 batch ingest を起動する

```bash
pnpm --filter @toitoi/atproto-transport start -- --in /path/to/atproto-archive.jsonl --out /path/to/atproto-report.json --storage-dir /path/to/storage
```

- `--in`: 取り込み元の JSONL アーカイブです。保存済みデータを 1 回だけ読み込みます。
- `--out`: ingest 結果のレポート出力先です。`report` 形式の集計結果を書き出します。
- `--storage-dir`: canonical 化した結果や ingest log を保存するディレクトリです。
- batch ingest では Jetstream 接続は使わず、単発実行で終了します。

#### 2.5.2 live ingest を起動する

```bash
pnpm --filter @toitoi/atproto-transport start -- --stream-url wss://jetstream.example/subscribe --storage-dir /path/to/storage
```

live mode では `ATPROTO_STREAM_URL` / `ATPROTO_STORAGE_DIR` / `ATPROTO_WANTED_COLLECTIONS` を PM2 の env で渡せます。

- `ATPROTO_STREAM_URL`: Jetstream の購読先 websocket URL です。`--stream-url` と同じ意味で、live ingest の接続先になります。
- `ATPROTO_STORAGE_DIR`: ingest の保存先ディレクトリです。raw / canonical / ingest log / live state snapshot をここに書き込みます。
- `ATPROTO_WANTED_COLLECTIONS`: 取り込み対象の collection 名です。`app.toitoi.inquiry` のように 1 件でも、`app.a,app.b` のようにカンマ区切りでも指定できます。

指定しない場合の既定値は `app.toitoi.inquiry` です。

### 2.6 replay を実行する

replay CLI は `packages/nostr/storage/replay_cli.js` にあり、`--protocol` で replay 先の protocol を切り替えます。

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
`MONITOR_SETUP.md` は、`toitoi-api` と live ingest 系 worker が動いている前提で監視と自動回復を行います。  
そのため、PM2 は API と ATProto live ingest の常駐管理に向いています。  
Nostr worker も常駐させるなら PM2 で個別アプリとして追加できますが、定期回収だけを目的にするなら `systemd timer` の方が扱いやすいです。  
`batch ingest` は常駐ではなく、アーカイブを 1 回処理する単発ジョブとして使います。

`toitoi-api` と ATProto live worker は別アプリとして定義します。  
以下の `ecosystem.config.cjs` 例では、`toitoi-api`、`toitoi-atproto-worker`、Nostr の relay ごとの worker を分けて起動できます。  
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
      name: 'toitoi-atproto-worker',
      cwd: repoRoot,
      script: './infra/transports/atproto/atproto_ingest_worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env_atproto_live: {
        // 常駐運用用: Jetstream websocket に接続し続ける
        NODE_ENV: 'production',
        // Jetstream の接続先
        ATPROTO_STREAM_URL: 'wss://jetstream.example/subscribe',
        // ingest の保存先
        ATPROTO_STORAGE_DIR: path.join(homeDir, 'path/to/atproto-storage'),
        // 保存ログに付ける送信元ラベル
        ATPROTO_INGEST_SOURCE_LABEL: 'jetstream',
        // 取り込み対象の collection
        ATPROTO_WANTED_COLLECTIONS: 'app.toitoi.inquiry',
      },
    },
    {
      name: 'toitoi-nostr-worker-relay-a',
      cwd: repoRoot,
      script: './infra/transports/nostr/relay_ingest_worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env_nostr_relay_a: {
        NODE_ENV: 'production',
        TOITOI_PROTOCOL: 'nostr',
        RELAY_URL: 'wss://relay-a.example.com',
        RELAY_STORAGE_DIR: path.join(homeDir, 'path/to/nostr-relay-a'),
      },
    },
    {
      name: 'toitoi-nostr-worker-relay-b',
      cwd: repoRoot,
      script: './infra/transports/nostr/relay_ingest_worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env_nostr_relay_b: {
        NODE_ENV: 'production',
        TOITOI_PROTOCOL: 'nostr',
        RELAY_URL: 'wss://relay-b.example.com',
        RELAY_STORAGE_DIR: path.join(homeDir, 'path/to/nostr-relay-b'),
      },
    },
  ],
};
```

使い分けは次の通りです。

- ATProto live ingest だけで動かすなら `--env atproto_live`
- API は必要な protocol に応じて `--env nostr` / `--env atproto` / `--env multi` を選びます
- relay ごとの Nostr worker を PM2 で回すなら、`toitoi-nostr-worker-relay-a` / `toitoi-nostr-worker-relay-b` のように個別アプリを増やします

起動例:

```bash
# Nostr API だけ
pm2 start ecosystem.config.cjs --only toitoi-api --env nostr

# multi-transport API
pm2 start ecosystem.config.cjs --only toitoi-api --env multi

# ATProto live ingest だけ
pm2 start ecosystem.config.cjs --only toitoi-atproto-worker --env atproto_live

# Nostr relay ごとの worker だけ
pm2 start ecosystem.config.cjs --only toitoi-nostr-worker-relay-a --env nostr_relay_a
pm2 start ecosystem.config.cjs --only toitoi-nostr-worker-relay-b --env nostr_relay_b
```

`pm2 save` は、今の PM2 プロセス一覧を保存して、再起動後に `pm2 resurrect` できるようにするコマンドです。  
`pm2 startup` は、OS 起動時に PM2 デーモンを立ち上げるための初期設定を作るコマンドです。  
つまり、`start` で起動したあとに `save` で状態を保存し、`startup` でサーバー再起動時の自動復帰を有効にします。

実行順の例は次の通りです。

```bash
pm2 start ecosystem.config.cjs --only toitoi-api --env multi
pm2 save
pm2 startup
```

要するに、**PM2 で常駐管理するのは API と ATProto live ingest が中心で、Nostr worker は必要に応じて PM2 でも systemd timer でも運用できる**です。  
`toitoi-api` は `--only` で対象アプリを絞り、`--env` で運用モードを選びます。  
定期収集だけをしたいなら、Nostr worker は systemd の template unit の方が扱いやすいです。

### Nostr 定期実行

Nostr worker は PM2 ではなく `systemd timer` で定期起動します。  
詳細は 2.4.4 の `systemd timer` 設定例を参照してください。

---

## 4. 実装の呼び出し関係

- `apps/api/server.js` -> `apps/api/standard_api_service.js`
- `apps/api/server.js` -> `packages/protocol/protocol_storage_runtime.js`
- `apps/api/server.js` -> `packages/protocol/multi_transport_replay.js`
- `apps/api/server.js` -> `packages/nostr/storage/replay.js` / `packages/atproto/storage/replay.js`
- `apps/api/standard_api_service.js` -> protocol ごとの `storage/indexer.js` / `storage/standard_api_views.js`
- `packages/nostr/storage/replay_cli.js` -> `packages/protocol/protocol_runtime.js` / `packages/protocol/protocol_storage_runtime.js`

---

## 5. バックアップと復旧

### 5.1 保存対象

- `raw-events.jsonl`
- `canonical-events.jsonl`
- `ingest-log.jsonl`
- `index-snapshot.json`

### 5.2 復旧の基本

```bash
node packages/nostr/storage/replay_cli.js --protocol nostr --storage-dir /path/to/storage --verify
node packages/nostr/storage/replay_cli.js --protocol atproto --storage-dir /path/to/storage --verify
TOITOI_PROTOCOL=nostr TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
TOITOI_PROTOCOL=atproto TOITOI_STORAGE_DIR=/path/to/storage pnpm --filter @toitoi/api start
curl http://127.0.0.1:3000/health
curl "http://127.0.0.1:3000/api/v1/inquiries?limit=1"
```

raw event を source of truth にし、canonicalized event と index snapshot は replay で再生成します。
`node packages/nostr/storage/replay_cli.js` は protocol-aware CLI で、`--protocol` で replay 先を切り替えます。
複数 transport を合わせる場合は、各 storage を個別に replay したうえで `TOITOI_TRANSPORT_SOURCES` を使って API 側で統合します。Nostr relay が複数あっても、storage を分けておけば同じ手順で扱えます。

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
- replay は `node packages/nostr/storage/replay_cli.js --protocol nostr ...` / `--protocol atproto ...` を使う
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
