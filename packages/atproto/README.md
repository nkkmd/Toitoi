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
- `live/`: `bsky.social` への gated live write helper
- `storage/`: 保存、replay、index、API 向け view
- `test_protocol.js`: descriptor の契約確認

## 依存関係

- `protocol.js` は `packages/protocol/` の共通 descriptor helper に依存します
