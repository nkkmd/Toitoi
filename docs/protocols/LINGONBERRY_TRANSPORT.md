# Lingonberry Transport

**Version: 0.1.0** | **Status: draft** | **Last updated: 2026-06-24**

## 目的

このドキュメントは、Toitoi が Lingonberry を transport として扱うときの位置づけを定義します。

対象実装は [`nkkmd/lingonberry`](https://github.com/nkkmd/lingonberry) の `0.1.0` です。

Lingonberry upstream では `knowledge object` が protocol-native な canonical object として扱われます。一方、Toitoi では Lingonberry object を内部中心モデルにしません。Toitoi の内部中心モデルは [CANONICAL_EVENT.md](./CANONICAL_EVENT.md) の Canonical Event であり、Lingonberry object はその transport projection / ingest source として扱います。

---

## 位置づけ

```text
Canonical Event
  ↓ converter
Lingonberry Knowledge Object
  ↓ carrier
HTTP / relay / archive
```

読み込み側では逆方向に、

```text
Lingonberry Knowledge Object or HTTP Publish Request
  ↓ adapter / normalizer
Canonicalized Event
```

として扱います。

---

## 対象

Phase 17 の最初の対象は次の 2 つです。

- Lingonberry `knowledge object`
- Lingonberry HTTP publish request envelope

live relay ingest は後続の gated smoke とし、最初は archive / JSONL / batch ingest を優先します。

---

## Transport Identity

Lingonberry object の `id` は `lb:obj:<...>` 形式です。

Toitoi ではこれを transport source identity として保持し、Toitoi Canonical Event の `id` とは分離します。

- Lingonberry object id: `provenance.sources[].objectId` に保持できる
- Lingonberry raw source id: `rawRef.sourceId` または object id を dedupe key として使う
- Toitoi canonical id: adapter 側で `tt:evt:<...>` として解決する

---

## Trust

HTTP publish request は `publisher.publicKey` と `publisher.signature` を持ちます。

- `publisher.publicKey`: 32 byte Ed25519 public key の lowercase hex
- `publisher.signature`: `publisher.signature` を除いた canonicalized request payload への Ed25519 signature

署名検証は transport identity verification として扱い、Toitoi の semantic layer へ直接持ち込みません。carrier / operator / archive の信頼は別途 source trust として扱います。

---

## Ordering

Lingonberry は append-only storage / archive replay を前提にします。

Toitoi では ordering を次のように扱います。

- `createdAt` は object の観測時刻として利用する
- archive / raw log の行順は replay 順として利用できる
- global ordering は仮定しない

---

## Delete / Replace

Lingonberry `0.1.0` の knowledge object contract では、protocol-native な delete semantic は確認しません。

revision や supersede は `status` / `lineage` で表せますが、Toitoi では mutation としての replace ではなく、transport-local な lifecycle / lineage として扱います。

---

## Capability

| Capability | Lingonberry | 理由 |
|---|---|---|
| rawAcquisition | yes | HTTP publish request、relay output、archive wire log を取得できる |
| identityVerification | yes | Ed25519 publisher signature を検証できる |
| ordering | partial | createdAt と append order はあるが global order ではない |
| deleteSemantics | no | 0.1.0 knowledge object contract では削除 semantic を確認しない |
| replaceSemantics | partial | status / lineage で revision は表せるが mutation replace ではない |
| replayability | yes | raw log / archive から replay できる |
| provenanceFidelity | yes | provenance.sources[] と rawRef が必須 |
| storageSnapshot | yes | raw request log / canonical catalog / archive export がある |
| sourceTrust | partial | signature は検証できるが carrier / operator trust は別判断 |

---

## 関連

- [LINGONBERRY_INQUIRY_SCHEMA.md](./LINGONBERRY_INQUIRY_SCHEMA.md)
- [INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md](./INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md)
- [CANONICAL_EVENT.md](./CANONICAL_EVENT.md)
