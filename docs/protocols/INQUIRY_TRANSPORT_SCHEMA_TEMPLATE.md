# Inquiry Transport Schema Template

**Version: 0.1.1** | **Status: evolving** | **Last updated: 2026-06-05**

## 目的

このドキュメントは、Toitoi における inquiry transport schema 文書の共通テンプレートを定義します。

個別 protocol の schema は、このテンプレートに沿って、

- transport 固有の表現
- Canonical Event への projection
- ingest / replay / sync の互換仕様

を明示します。

---

## 使い方

このテンプレートをベースに、protocol ごとに次を埋めます。

- protocol 名
- transport event / record の型
- dedupe / ordering の方針
- 必須フィールド
- 推奨フィールド
- provenance / raw reference の扱い
- optional projection

個別 schema は、共通の章立てを保ちながら、protocol 固有の制約だけを差し替えます。

---

## 位置づけ

```text
Canonical Event
  ↓ converter
{{PROTOCOL_NAME}} Inquiry {{TRANSPORT_NOUN}}
  ↓ transport
{{DELIVERY_LAYER}}
```

読み込み側では逆方向に、

```text
{{PROTOCOL_NAME}} Inquiry {{TRANSPORT_NOUN}}
  ↓ adapter / normalizer
Canonicalized Event
```

として扱います。

つまり、

- transport schema は transport representation
- Canonical Event は semantic representation

です。

---

## 基本原則

1. transport object を Toitoi の内部中心モデルと見なさない
2. inquiry の自然言語本体は常に保持する
3. 追加の構造化情報は optional かつ non-authoritative とする
4. protocol 固有情報は transport concern として扱う
5. canonicalization は別層で行う
6. delete / replace / ordering / trust は transport 由来の判断として扱う

### Identity 方針

個別 schema では、identity の扱いを明示します。

- transport 側の identity は dedupe と参照のための source identity として定義する
- Canonical Event に投影した後の `id` は、可能なら converter 前に確定した canonical identity を使う
- 複数 transport へ同じ意味内容を投影する場合は、同じ canonical identity に収束させる
- 同一性が曖昧な case は、無理に merge せず別 event として保持する
- `lineage` は派生関係、`dsl` は補助的 projection として扱い、identity の主根拠にはしない

個別 schema では、次のどちらを採るかも明示します。

- source identity first: transport 固有の key を主キーにする
- canonical identity first: Canonical Event の `id` を主キーにする

Toitoi の Standard API と multi-transport replay では、後者を優先します。

---

## 対象 {{TRANSPORT_NOUN}}

この節では、個別 protocol が流通させる inquiry transport object を定義します。

記載すべき内容:

- primary kind / collection / record type
- identity
- source / timestamp
- body
- contextual metadata
- relational metadata
- lineage
- DSL projection
- labels / tags
- non-semantic metadata

---

## Shape

個別 schema では、代表的な JSON 例を 1 つ示します。

その例は以下を満たす必要があります。

- replay 可能であること
- canonicalization 後の意味が復元可能であること
- provenance を辿れること
- optional projection が non-authoritative であること

---

## 必須要素

個別 schema では少なくとも次を明示します。

- identity
- author / owner
- body text
- source timestamp
- collection / kind
- provenance

---

## 推奨要素

個別 schema では次のような項目を必要に応じて推奨します。

- language
- contexts
- relationships
- phase
- trigger
- lineage
- labels
- dsl
- meta

---

## フィールド仕様

個別 schema では各フィールドの役割を次の観点で固定します。

- `identity`: dedupe と参照の基礎
- `body`: inquiry の自然言語本体
- `contexts`: locality の抽象化
- `relationships`: 注目関係の表現
- `phase`: scaffolding target
- `trigger`: 直接の起点
- `lineage`: 派生関係
- `dsl`: optional projection
- `labels` / `tags`: 補助的な分類
- `meta`: non-semantic metadata

---

## provenance と raw reference

個別 schema では、Canonical Event に投影するときに最低限保持する source 情報を明示します。

典型的には次を含めます。

- source id
- source timestamp
- owner / author identity
- collection / kind
- replay / storage hint

必要に応じて、以下も provenance か raw reference に含めます。

- transport source identity
- transport-specific duplicate key
- canonical identity への対応表
- lineage の参照元

---

## 実装上の制約

個別 schema では、transport 由来の制約を明示します。

- dedupe の主キー
- ordering の優先順位
- trust の扱い
- replace / delete の扱い
- optional projection の authoritative でなさ

---

## 派生ドキュメント

このテンプレートから、個別 protocol の次の文書を作ります。

- human-readable schema
- machine-readable schema
- adapter test
- README link

---

## 関連

- [CANONICAL_EVENT.md](./CANONICAL_EVENT.md)
- [NOSTR_INQUIRY_SCHEMA.md](./NOSTR_INQUIRY_SCHEMA.md)
- [ATPROTO_INQUIRY_SCHEMA.md](./ATPROTO_INQUIRY_SCHEMA.md)
