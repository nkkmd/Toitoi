# 運用ガイド：multi-transport outbound delivery

**Version: 0.1.0** | **Status: evolving** | **Last updated: 2026-06-04**

この文書は、Toitoi で canonical event を複数 transport へ送るときの outbound fan-out と delivery の運用手順です。  
Phase 14 で導入した plan / delivery / retry / quarantine の分担を、運用者目線でまとめます。

## どこで使うか

- 対象: transport 運用者、実送信担当、障害対応担当
- 使用場面: canonical event の再送、複数 transport への同報、失敗イベントの隔離、live smoke の前提確認
- 関連実装:
  - `packages/protocol/multi_transport_outbound.js`
  - `packages/protocol/multi_transport_delivery.js`
  - `packages/nostr/live/outbound.js`
  - `packages/atproto/live/outbound.js`

## 0. 基本方針

- outbound plan は canonical event から transport ごとの draft を作るだけにする
- 実配送は plan を受けて、transport ごとの live helper に委譲する
- raw duplicate と semantic duplicate は混ぜない
- 明示的に成功したものだけ `delivered` に入れる
- 設定不足や deterministic failure は `quarantined` に送る
- handler 未設定は `skipped` として明示する

## 1. 使い分け

### Plan

`packages/protocol/multi_transport_outbound.js` は、canonical event から transport ごとの draft を作ります。  
ここではまだ外部ネットワークには触れません。

### Delivery

`packages/protocol/multi_transport_delivery.js` は、plan を実際の送信処理へ回します。  
transport ごとの live helper があれば使い、なければ `skipped` か `quarantined` にします。

## 2. 環境変数

### Nostr

- `NOSTR_SECRET_KEY`: 署名用 secret key
- `NOSTR_RELAY_URL`: 送信先 relay URL

### ATProto

- `ATPROTO_PDS_HOST`: PDS の base URL
- `ATPROTO_HANDLE`: session 取得用 identifier
- `ATPROTO_APP_PASSWORD`: session 取得用 app password

## 3. 実送信ヘルパー

### Nostr

`packages/nostr/live/outbound.js` は、canonical event を Nostr draft に変換し、署名して relay へ publish します。

### ATProto

`packages/atproto/live/outbound.js` は、canonical event を ATProto record draft に変換し、`createSession` / `createRecord` を使って PDS に書き込みます。

## 4. 失敗時の扱い

- `skipped`
  - handler が無い
  - protocol が未対応
  - plan 上で配送対象外
- `quarantined`
  - 署名失敗
  - 認証失敗
  - PDS / relay 側の恒久的失敗
  - retry しても改善しない入力不整合
- `delivered`
  - handler が成功し、送信結果を返した

retry は transient failure 向けです。  
delivery 実行時に retry を使う場合は、`retryable: true` やネットワーク系エラーだけを再試行対象にしてください。

## 5. 実行例

### Dry-run に近い確認

```js
const { buildOutboundFanOutPlan } = require('@toitoi/protocol');

const plan = buildOutboundFanOutPlan(canonicalEvent, {
  protocols: ['nostr', 'atproto'],
});
```

### 実配送

```js
const { executeOutboundFanOutPlan } = require('@toitoi/protocol');

const result = await executeOutboundFanOutPlan(canonicalEvent, {
  protocols: ['nostr', 'atproto'],
  retry: {
    retries: 1,
    initialDelayMs: 0,
  },
  nostr: {
    relayUrl: process.env.NOSTR_RELAY_URL,
    secretKey: process.env.NOSTR_SECRET_KEY,
  },
  atproto: {
    pdsHost: process.env.ATPROTO_PDS_HOST,
    repo: process.env.ATPROTO_REPO,
    accessJwt: process.env.ATPROTO_ACCESS_JWT,
  },
});
```

## 6. 確認項目

- 1 つの canonical event に対して、複数 transport の delivery 結果が記録される
- 失敗した transport と成功した transport が分離される
- `skipped` と `quarantined` の理由がログで追える
- retry が deterministic failure に流れ込みすぎていない
- API / replay の canonical view には影響しない

## 7. 関連

- [PROTOCOL_OPERATION_TEMPLATE.md](./PROTOCOL_OPERATION_TEMPLATE.md)
- [NOSTR_STORAGE_AND_REPLAY.md](./NOSTR_STORAGE_AND_REPLAY.md)
- [ATPROTO_STORAGE_AND_REPLAY.md](./ATPROTO_STORAGE_AND_REPLAY.md)
- [docs/roadmap/IMPLEMENTATION_PLAN.md](../roadmap/IMPLEMENTATION_PLAN.md)
