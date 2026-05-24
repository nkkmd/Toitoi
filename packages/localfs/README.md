# LocalFS Package

`packages/localfs/` は、LocalFS の protocol skeleton を置く場所です。

現時点では主に descriptor 実装が中心で、ファイルベースの ingest や archive の入口に発展させる想定です。

## 全体像

```text
packages/localfs/
├─ protocol.js      -> LocalFS descriptor
└─ test_protocol.js -> contract test
```

## 主なファイル

- `protocol.js`: LocalFS の protocol descriptor
- `test_protocol.js`: descriptor の契約確認

## 依存関係

- `protocol.js` は `packages/protocol/` の共通 descriptor helper に依存します
