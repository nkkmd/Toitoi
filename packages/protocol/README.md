# Protocol Package

`packages/protocol/` は、protocol descriptor と registry の共通基盤です。

Phase 16 以降は、identity key / claim の計算、検証、registry 解決もここで共有します。

Nostr や ATProto のような個別 protocol は、ここで定義される共通の形に合わせて descriptor を作ります。

## 全体像

```text
protocol_descriptor.js
        |
        v
protocol_registry.js
        |
        v
protocol_catalog.js
        |
        v
protocol_runtime.js
        |
        v
protocol_storage_runtime.js
        |
        v
index.js
```

## 主なファイル

- `protocol_descriptor.js`: descriptor の生成、正規化、検証
- `protocol_registry.js`: descriptor の登録と一覧化
- `protocol_catalog.js`: 標準 protocol の集約
- `protocol_runtime.js`: 起動時の選択、introspection、help 出力
- `protocol_storage_runtime.js`: protocol ごとの replay 入口選択
- `identity_verification.js`: identity key / claim / verification / registry
- `index.js`: まとめて再公開する入口

## 呼び出し関係

- `packages/nostr/protocol.js` が `protocol_descriptor.js` と `protocol_registry.js` を使います
- `packages/atproto/protocol.js` と `packages/localfs/protocol.js` が `protocol_descriptor.js` を使います
- `protocol_catalog.js` が各 protocol package の descriptor を集めます
- `index.js` がこれらをまとめて再公開します

## どこで使うか

- protocol descriptor を統一したいとき
- capability table を生成したいとき
- 新しい protocol package を増やしたいとき
- registry で重複登録を防ぎたいとき
- third-party verifiable identity claim を共通化したいとき

## 依存関係

- `protocol_descriptor.js` は共通の検証ロジックの土台です
- `protocol_registry.js` は `protocol_descriptor.js` を使って registry を作ります
- `protocol_catalog.js` は `packages/nostr/`、`packages/atproto/`、`packages/localfs/` の descriptor を集めます

## テスト

- `test_protocol_descriptor.js`
- `test_protocol_registry.js`
- `test_protocol_catalog.js`
