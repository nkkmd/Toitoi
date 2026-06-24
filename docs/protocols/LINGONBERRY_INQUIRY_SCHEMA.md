# Lingonberry Inquiry Schema

**Status: draft** | **Last updated: 2026-06-24**

## 目的

このドキュメントは、Toitoi が Lingonberry 上で inquiry を流通させる際の transport schema を定義します。

重要なのは、これは Toitoi 全体の中心仕様ではなく、

- Lingonberry transport における表現
- Canonical Event の transport への projection
- ingest / replay / archive のための互換仕様

である点です。

Toitoi の内部中心モデルは [CANONICAL_EVENT.md](./CANONICAL_EVENT.md) にあります。
機械可読版は [schemas/lingonberry-inquiry.schema.json](../../schemas/lingonberry-inquiry.schema.json) を参照してください。

---

## 位置づけ

```text
Canonical Event
  ↓ converter
Lingonberry Knowledge Object
  ↓ HTTP / relay / archive carrier
```

読み込み側では逆方向に、

```text
Lingonberry Knowledge Object or HTTP Publish Request
  ↓ adapter / normalizer
Canonicalized Event
```

として扱います。

---

## 基本原則

1. Lingonberry knowledge object を Toitoi の内部中心モデルと見なさない
2. inquiry の自然言語は `body.text` に保持する
3. Lingonberry の `id` は Toitoi canonical id ではなく transport source identity として扱う
4. `publisher` は HTTP carrier 側 metadata として扱う
5. `provenance.sources[]` と `rawRef` を失わない
6. delete / replace / ordering / trust は transport 由来の判断として扱う

---

## 対象 Shape

Phase 17 では、次の 2 shape を受け入れます。

### Knowledge Object

```json
{
  "id": "lb:obj:toitoi-example-0001",
  "schemaVersion": "0.1.0",
  "type": "inquiry",
  "createdAt": "2026-06-17T00:00:00Z",
  "body": {
    "text": "What evidence supports this claim?",
    "language": "en"
  },
  "provenance": {
    "sources": [
      {
        "protocol": "lingonberry",
        "sourceId": "draft:toitoi-example-0001",
        "authorId": "alice",
        "observedAt": "2026-06-17T00:00:00Z"
      }
    ]
  },
  "rawRef": {
    "protocol": "lingonberry",
    "sourceId": "draft:toitoi-example-0001"
  }
}
```

### HTTP Publish Request

```json
{
  "object": {
    "...": "Lingonberry knowledge object"
  },
  "publisher": {
    "publicKey": "307270eca005df54e3ca169c6139ffc228c4f0069c24ce1260fbf3394f51b9ac",
    "signature": "<128 lowercase hex chars>"
  }
}
```

---

## 必須要素

### `id`

- `lb:obj:<...>` 形式
- Lingonberry object の canonical identity
- Toitoi では transport source identity として扱う

### `schemaVersion`

- `0.1.0`

### `type`

Lingonberry core の knowledge object type を使います。

Toitoi inquiry transport としての主対象は `inquiry` です。ただし、`observation`、`evidence`、`synthesis` なども canonical event の `type` として保持できます。

### `createdAt`

- UTC date-time
- Toitoi replay では ordering の補助として使う
- global ordering は仮定しない

### `body.text`

- inquiry の自然言語本体
- boundary object として常に保持する

### `body.language`

- BCP47-style language tag

### `provenance.sources[]`

- Lingonberry object の source provenance
- Toitoi canonicalization 後も source summary として保持する

### `rawRef`

- raw payload の再取得・再 canonicalize・監査のための参照
- Toitoi canonical event の `rawRef` に対応する

---

## Optional Elements

- `contexts`: 抽象化された文脈 metadata
- `relations`: inquiry が注目する関係
- `status`: Lingonberry lifecycle state
- `lineage`: revision / translation / synthesis などの派生関係
- `identityClaims`: Lingonberry 側 identity claim
- `attachments`: 添付参照
- `labels`: 検索・分類用 label
- `meta`: non-semantic metadata

---

## Projection

Canonical Event から Lingonberry object へ出すときは、次の対応を基本とします。

| Canonical Event | Lingonberry |
|---|---|
| `id` | `rawRef.sourceId` または `provenance.sources[].sourceId` |
| `type` | `type` |
| `createdAt` | `createdAt` |
| `body.text` | `body.text` |
| `body.language` | `body.language` |
| `contexts` | `contexts` |
| `relationships` | `relations` |
| `lineage` | `lineage` |
| `labels` | `labels` |

Lingonberry `id` は `lb:obj:<...>` として transport projection 側で決めます。Toitoi canonical id をそのまま Lingonberry id と同一視しません。

---

## 関連

- [LINGONBERRY_TRANSPORT.md](./LINGONBERRY_TRANSPORT.md)
- [INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md](./INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md)
- [schemas/lingonberry-inquiry.schema.json](../../schemas/lingonberry-inquiry.schema.json)
