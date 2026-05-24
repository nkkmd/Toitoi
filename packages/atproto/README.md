# ATProto Package

`packages/atproto/` は、ATProto の protocol skeleton を置く場所です。

現時点では主に descriptor 実装が中心で、将来の adapter / converter 入口に向けた土台です。

## 全体像

```text
packages/atproto/
├─ protocol.js      -> ATProto descriptor
└─ test_protocol.js -> contract test
```

## 主なファイル

- `protocol.js`: ATProto の protocol descriptor
- `test_protocol.js`: descriptor の契約確認

## 依存関係

- `protocol.js` は `packages/protocol/` の共通 descriptor helper に依存します
