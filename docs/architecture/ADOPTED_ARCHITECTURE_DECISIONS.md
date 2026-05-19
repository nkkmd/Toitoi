# 採用アーキテクチャ判断

**Status: stable** | **Last updated: 2026-05-19**

## 目的

このドキュメントは、Toitoi において採用する設計判断を簡潔に固定するためのものです。

詳細仕様や実装手順は別文書に譲り、ここでは

- 何を採用するか
- なぜ採用するか
- 実装上どう扱うか

を最小限で整理します。

関連:

- [OVERVIEW.md](./OVERVIEW.md)
- [PROTOCOL_ABSTRACTION.md](./PROTOCOL_ABSTRACTION.md)
- [IMPLEMENTATION_PLAN.md](../roadmap/IMPLEMENTATION_PLAN.md)

---

## 1. Canonical Event を中心に据える

### 採用内容

Toitoi の内部では、Canonical Event を意味論的な共通表現として扱います。

### 理由

- Toitoi の価値は特定 protocol ではなく semantic interoperability にある
- 異なる知識ネットワークを意味論的に横断するには、内部の共通表現が必要
- AI / UI / indexer / archive の接続面を安定化できる

### 実装上の扱い

- protocol 固有 event をそのまま内部表現にしない
- Canonical Event は transport-specific representation から独立して設計する
- API や indexer は Canonical Event を主入力として扱う

---

## 2. Canonical は protocol schema の写しにしない

### 採用内容

Canonical は `Nostr schema` や `ATProto schema` の別名ではなく、semantic layer として設計します。

### 理由

- protocol schema に引きずられると Toitoi が単なる wrapper になる
- 長期的な protocol migration と semantic continuity を保ちにくくなる
- multi-protocol 拡張時に内部モデルが崩れやすい

### 実装上の扱い

- protocol 固有 field は必要なものだけ provenance や source metadata として保持する
- Canonical schema は semantic stability を優先して設計する
- protocol 依存の都合は adapter / converter 側で吸収する

---

## 3. Adapter / Normalizer を独立した中核層として置く

### 採用内容

読み込み側では、protocol event をそのまま indexer に渡さず、Adapter / Normalizer を通して Canonical 化します。

### 理由

- protocol event と semantic event は一致しない
- protocol ごとに validate, verify, dedupe, ordering, delete semantics の差異がある
- abstraction layer を明示しないと protocol 固有ロジックが全体に漏れる

### 実装上の扱い

Adapter / Normalizer は少なくとも以下を担います。

- validate
- verify
- deduplicate
- ordering
- normalize
- canonicalize

この層を Toitoi の protocol abstraction layer として扱います。

---

## 4. 読み込みパイプラインは Canonicalize を挟む

### 採用内容

読み込み側の基本流れを次のように固定します。

```text
Transport Storage
  ↓
Fetcher / Sync
  ↓
Protocol-specific Events
  ↓
Adapter / Normalizer
  ↓
Canonicalized Events
  ↓
Indexer
  ↓
Standard API
```

### 理由

- protocol 差異を indexer と API から切り離せる
- replay や再 index が安定する
- 後から protocol を増やしても downstream を保ちやすい

### 実装上の扱い

- ingest と replay は同じ canonicalization ルールで動かす
- indexer は raw event ではなく canonicalized event を受け取る
- API は protocol schema ではなく canonical view を返す

---

## 5. Standard API を意味アクセス面として設計する

### 採用内容

Toitoi API は protocol access layer ではなく semantic operating surface として設計します。

### 理由

- UI や AI は relay semantics や CID graph を直接理解したくない
- アクセス面が protocol 依存だと multi-protocol の価値が薄れる
- canonical semantics を外部利用に接続しやすい

### 実装上の扱い

- API response は canonical view を基本にする
- provenance は追えるようにしつつ、transport の詳細をそのまま露出しすぎない
- list, filter, relation, lineage を統一的に扱える形を優先する

---

## 6. Indexer は Canonical semantics を壊さない

### 採用内容

Indexer は Canonical Event を検索・参照のために最適化するが、意味論そのものは改変しません。

### 理由

- index は検索のための補助構造であり、意味の source of truth ではない
- embedding や graph は実用上重要だが、意味の正本を置き換えるべきではない
- replay 時に同じ canonical semantics から再構築できるべき

### 実装上の扱い

- tokenization
- full-text index
- time index
- embeddings
- graph construction

これらはすべて Canonical Event から派生する補助構造として扱います。

---

## 7. MVP と長期価値を分けて進める

### 採用内容

初期は「まず流す」、長期は「意味論を安定させる」の順で進めます。

### 理由

- MVP では transport, converter, minimum canonical が先に必要
- ただし Toitoi の長期価値は semantic interoperability にある
- 初手から理想を作り切ろうとすると前進が遅くなる

### 実装上の扱い

当面の優先順位は以下とします。

1. Canonical Event MVP を定義する
2. Nostr Adapter / Normalizer の責務を明文化する
3. raw event 保存と replay 方針を決める
4. Indexer MVP を作る
5. Standard API MVP を作る

---

## 8. raw event と canonicalized event を分けて保持する

### 採用内容

Canonical を中心に据えつつ、raw protocol event も保持して replay 可能にします。

### 理由

- 監査可能性と再処理可能性を保てる
- canonicalization ルールが変わっても再構築できる
- transport representation を失わずに provenance を追える

### 実装上の扱い

- raw event と canonicalized event は別レイヤで扱う
- append-only ingest log を前提にする
- index は raw ではなく canonicalized event から再生成する

---

## 9. 責務境界を明確に分ける

### 採用内容

Toitoi では、読み込み・変換・索引・公開の責務を次のように分けます。

- Adapter / Normalizer は ingest 時の検証と canonicalization を担う
- Converter は Canonical Event と protocol-specific representation の相互変換を担う
- Indexer は Canonical Event から派生構造を作る
- Standard API は canonical view を返す
- Transport は配送と保存を担う

### 理由

- 1 層に責務を集めると protocol 固有ロジックが全体に漏れやすい
- 変換と索引と配信は、それぞれ失敗の仕方も更新頻度も異なる
- 未来の multi-protocol 化では、境界が曖昧だと差分吸収が難しくなる

### 実装上の扱い

- Adapter / Normalizer は raw event を canonicalized event にする
- Converter は canonical event を transport representation に写す
- Indexer は canonicalized event を読み取り専用で扱う
- API は protocol schema を返すのではなく意味アクセスを返す
- Nostr 固有の validate / signature verify / dedupe / ordering / replace semantics は adapter 側に閉じる

---

## 10. delete / replace / ordering / trust は semantic layer に持ち込まない

### 採用内容

Toitoi では、削除・置換・順序・信頼に関する判断を protocol 固有の責務として扱い、Canonical Event の意味論へ直接混ぜません。

### 理由

- delete semantics は protocol によって表現方法が異なる
- replace semantics は transport と archive の振る舞いに依存する
- ordering はネットワークと transport の性質に左右される
- trust は署名、author identity、relay/source policy に分解して扱う必要がある

### 実装上の扱い

- delete は raw / normalized 層で tombstone や removed relation として解釈する
- replace は canonical event の上書きではなく lineage と ordering で表現する
- ordering は ingest の安定化に使うが、semantic truth を決める唯一の根拠にしない
- trust は provenance の一部として保持し、API で必要な場合のみ露出する
- Canonical Event には transport 固有の delete / replace / trust の生表現を持ち込まない

---

## 要約

Toitoi で採用するのは transport abstraction を主目的とした設計ではなく、

```text
異なる知識ネットワークを意味論的に横断できる構造
```

です。

そのために、

- Canonical Event
- Adapter / Normalizer
- Standard API

を中核に置き、protocol 固有差異はその外側に閉じ込めます。
