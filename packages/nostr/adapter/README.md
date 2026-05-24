# Nostr Adapter

`packages/nostr/adapter/` は、Nostr raw event を受け取り、Toitoi の処理に乗る形へ整える層です。

ここは transport 固有の判断を閉じ込める場所です。  
validate / verify / normalize / dedupe / ordering などは、semantic layer に直接持ち込まず、この層で扱います。

## 全体像

```text
raw Nostr event
      |
      v
nostr_adapter.js
  |   |   |   |
  |   |   |   +--> classifyEvent()
  |   |   +------> canonicalizeNostrEvent()
  |   +----------> normalizeNostrEvent()
  +--------------> validateNostrInquiryEvent() / verifyNostrEvent()
      |
      v
ingest_pipeline.js
      |
      +--> relay_ingest.js
      +--> ingest_jsonl.js
```

## 主なファイル

- `nostr_adapter.js`: validate / verify / normalize / canonicalize / classify の中核
- `ingest_pipeline.js`: ingest 時の分類と集計
- `relay_ingest.js`: relay subscription ingest
- `ingest_jsonl.js`: JSONL ingest 入口

## 呼び出し関係

`nostr_adapter.js` は単体で起動する入口ではなく、次のファイルから呼ばれる中核モジュールです。

- `ingest_pipeline.js` が `classifyEvent()` / `dedupeKey()` / `sortByTransportOrder()` を使います
- `relay_ingest.js` が `ingest_pipeline.js` 経由で間接的に使います
- `ingest_jsonl.js` が `ingest_pipeline.js` 経由で間接的に使います
- `protocol.js` が adapter 群を束ねて外部公開します
- `test_nostr_adapter.js` が各関数の契約を直接確認します
- `test_ingest_pipeline.js` / `test_relay_ingest.js` / `test_ingest_jsonl.js` が ingest 経路として使います

## どこで使うか

- raw event の妥当性確認が必要なとき
- 署名検証の有無を切り替えたいとき
- Nostr event を Canonical Event に写像したいとき
- duplicate / invalid / unverified を分けたいとき
- transport 由来の ordering を安定化したいとき

## テスト

- `test_nostr_adapter.js`
- `test_ingest_pipeline.js`
- `test_relay_ingest.js`
- `test_ingest_jsonl.js`
- `smoke_test.js`

## 依存関係

- `ingest_pipeline.js` は `nostr_adapter.js` に依存します
- `relay_ingest.js` は `ingest_pipeline.js` を使います
- `ingest_jsonl.js` は `ingest_pipeline.js` と `packages/nostr/storage/persistence.js` に依存します
- `protocol.js` は `nostr_adapter.js` と `ingest_pipeline.js` と `relay_ingest.js` と `canonical_to_nostr_converter.js` を束ねて外部へ公開します
