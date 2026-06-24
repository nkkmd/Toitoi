# Lingonberry Storage and Replay

**Status: draft** | **Last updated: 2026-06-24**

## 目的

この文書は、Toitoi が Lingonberry transport を ingest した後の保存・replay・API 接続を確認するための運用メモです。

Lingonberry upstream では `knowledge object` が protocol-native な canonical object として扱われますが、Toitoi では Canonical Event の transport projection / ingest source として扱います。

---

## 対象

- package: `packages/lingonberry/`
- storage: `packages/lingonberry/storage/`
- replay entry: `packages/lingonberry/storage/replay.js`
- schema: `schemas/lingonberry-inquiry.schema.json`
- transport docs: `docs/protocols/LINGONBERRY_TRANSPORT.md`

---

## 保存形式

`persistIngestResult(storageDir, ingestResult)` は、ATProto storage と同じ append-only layout を使います。

```text
<storageDir>/
├── raw-records.jsonl
├── canonical-events.jsonl
├── ingest-log.jsonl
└── index-snapshot.json
```

役割:

- `raw-records.jsonl`: Lingonberry knowledge object または HTTP publish request を保存する
- `canonical-events.jsonl`: Toitoi Canonical Event へ変換した結果を保存する
- `ingest-log.jsonl`: batch の件数、source label、raw/canonical record id を保存する
- `index-snapshot.json`: replay で再構築した derived index

---

## Replay

replay は raw storage を優先します。

1. `raw-records.jsonl` を読む
2. `rawRef.sourceId` または Lingonberry object `id` から source id を解決する
3. raw log に保存された `canonicalEventId` を使って Toitoi canonical id を復元する
4. `ingestLingonberryEvents()` で再 canonicalize する
5. derived index を再構築する

raw がない場合は、保存済み canonical event から index を復元します。

---

## API 起動

単一 protocol として使う場合:

```bash
TOITOI_PROTOCOL=lingonberry \
TOITOI_STORAGE_DIR=/path/to/lingonberry-storage \
pnpm --filter @toitoi/api start
```

multi-transport fan-in として使う場合:

```bash
TOITOI_TRANSPORT_SOURCES='[
  {"protocol":"nostr","storageDir":"/path/to/nostr-storage"},
  {"protocol":"atproto","storageDir":"/path/to/atproto-storage"},
  {"protocol":"lingonberry","storageDir":"/path/to/lingonberry-storage"}
]' pnpm --filter @toitoi/api start
```

---

## Batch / Archive Ingest

JSONL から ingest する場合:

```bash
node infra/transports/lingonberry/lingonberry_ingest_worker.js \
  --in /path/to/lingonberry-events.jsonl \
  --out /tmp/lingonberry-ingest-report.json \
  --storage-dir /path/to/lingonberry-storage \
  --source-label jsonl
```

Lingonberry archive から ingest する場合:

```bash
node infra/transports/lingonberry/lingonberry_ingest_worker.js \
  --archive-dir /path/to/lingonberry-archive \
  --out /tmp/lingonberry-ingest-report.json \
  --storage-dir /path/to/lingonberry-storage \
  --source-label archive
```

archive mode は `<archive-dir>/wire-log.jsonl` を読み、各行の `requestJson` を Lingonberry HTTP publish request として ingest します。

---

## 確認ポイント

- `/health` の `storage.protocol` が `lingonberry` または `multi-transport` になる
- `/api/v1/protocols/lingonberry` の `storage.supported` が `true` になる
- `/api/v1/inquiries/:id` で Lingonberry 由来の canonical view が返る
- `rawRef.protocol` が `lingonberry` になる
- `provenance.sources[].sourceId` に Lingonberry source id が残る

---

## 現在の制約

- live relay ingest worker は未追加です。現時点では batch / archive ingest を運用入口にします
- live publish smoke は `LINGONBERRY_LIVE_SMOKE_TEST=1` で明示した場合だけ実行します
- HTTP publish request の signature 検証は adapter にありますが、通常 replay では `skipVerify: true` を既定にします
- source trust は publisher signature だけで完結せず、carrier / operator policy と分けて扱います

---

## Live Smoke

実際の Lingonberry HTTP carrier に 1 件 publish する場合:

```bash
LINGONBERRY_LIVE_SMOKE_TEST=1 \
LINGONBERRY_CARRIER_URL=https://your-lingonberry.example \
LINGONBERRY_PUBLISHER_PUBLIC_KEY=<64-char-lowercase-hex> \
LINGONBERRY_PUBLISHER_PRIVATE_KEY="$(cat /path/to/ed25519-private-key.pem)" \
node packages/lingonberry/test_smoke.js
```

この smoke test は `POST /v1/objects` で publish し、続いて `GET /v1/objects/:id` で取得確認します。

---

## テスト

```bash
node scripts/run-tests.js packages/lingonberry
node scripts/run-tests.js infra/transports/lingonberry
node scripts/run-tests.js apps/api
```

`corepack pnpm --filter @toitoi/lingonberry test` は、環境によって Corepack が内部で `pnpm install` を spawn できない場合があります。その場合も、上記の Node runner で package tests は確認できます。
