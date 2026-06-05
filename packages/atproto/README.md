# ATProto Package

`packages/atproto/` は、ATProto の protocol 実装を置く場所です。

Phase 9 では、custom record の ingest, canonicalize, replay までを通すための adapter / converter / storage をまとめます。
`app.bsky.feed.post` の互換 projection と gated live smoke test もここに置きます。

## 全体像

```text
packages/atproto/
├─ protocol.js            -> ATProto descriptor と公開入口
├─ adapter/               -> validate / normalize / canonicalize / ingest
├─ converter/             -> canonical と ATProto draft の相互変換
├─ live/                   -> gated live write client
├─ storage/               -> append-only 保存、replay、derived index
├─ test_smoke.js          -> gated live smoke test
└─ test_protocol.js       -> contract test
```

## 主なファイル

- `protocol.js`: ATProto の protocol descriptor
- `adapter/`: raw record の検証・正規化・canonical 化
- `converter/`: canonical と ATProto write draft の相互変換
- `live/`: PDS への gated live write helper
- `storage/`: 保存、replay、index、API 向け view
- `infra/transports/atproto/atproto_ingest_worker.js`: JSONL batch ingest の運用入口
- `test_protocol.js`: descriptor の契約確認
- `test_smoke.js`: `ATPROTO_LIVE_SMOKE_TEST=1 node packages/atproto/test_smoke.js` で送信後に `com.atproto.repo.getRecord` まで確認する gated smoke test
- transport schema template: [docs/protocols/INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md](../../docs/protocols/INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md)
- transport schema: [docs/protocols/ATPROTO_INQUIRY_SCHEMA.md](../../docs/protocols/ATPROTO_INQUIRY_SCHEMA.md)
- machine-readable schema: [schemas/atproto-inquiry.schema.json](../../schemas/atproto-inquiry.schema.json)
- `運用ガイド`: [docs/operations/ATPROTO_STORAGE_AND_REPLAY.md](../../docs/operations/ATPROTO_STORAGE_AND_REPLAY.md)
- outbound 運用: [MULTI_TRANSPORT_OUTBOUND_AND_DELIVERY.md](../../docs/operations/MULTI_TRANSPORT_OUTBOUND_AND_DELIVERY.md)
- API 接続: `/health` と `/api/v1/protocols/atproto` を見るときは上記運用ガイドを併読する

## 依存関係

- `protocol.js` は `packages/protocol/` の共通 descriptor helper に依存します

## live smoke test の実行方法

`packages/atproto/test_smoke.js` は、実際の PDS に 1 件送ってから `com.atproto.repo.getRecord` で取り直す gated smoke test です。

### 1. 必要な環境変数を設定する

- `ATPROTO_LIVE_SMOKE_TEST=1`
- `ATPROTO_PDS_HOST`
- `ATPROTO_HANDLE`
- `ATPROTO_APP_PASSWORD`

### 2. 実行する

```bash
ATPROTO_LIVE_SMOKE_TEST=1 \
ATPROTO_PDS_HOST=https://your-pds.example \
ATPROTO_HANDLE=your-handle \
ATPROTO_APP_PASSWORD=your-app-password \
node packages/atproto/test_smoke.js
```

### 3. 確認する内容

- `createRecord()` の戻り値に `uri` と `cid` があること
- `getRecord()` で同じ `uri` と `cid` が返ること
- 送信した `draft.record` と取得した `fetched.value` の主要フィールドが一致すること

### 4. PDS host の取り方

- handle を `com.atproto.identity.resolveHandle` で DID に解決する
- DID document の `service[].serviceEndpoint` を `ATPROTO_PDS_HOST` に入れる
- `did:plc:` の場合は `https://plc.directory/<did>` を読む
- `did:web:` の場合は `https://<domain>/.well-known/did.json` を読む
