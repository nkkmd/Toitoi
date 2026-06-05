# Provenance

**Status: stable** | **Last updated: 2026-06-05**

## 概要

Toitoi では provenance（来歴）を重要な要素として扱います。

問いや観察は：

- 誰が
- どこで
- どの文脈で
- 何を観察したか

という履歴を伴います。

---

## なぜ provenance が重要なのか

農業知識は強い属地性を持ちます。

同じ問いでも：

- 気候
- 土壌
- 生態系
- 栽培方法

によって意味が変化します。

そのため Toitoi では：

> 「結果」だけではなく、
> 「どのような文脈から生まれたか」

を保持することを重視します。

---

## Toitoi における provenance

現在、provenance には以下のような情報を含むことを想定しています。

| 要素 | 内容 |
|---|---|
| actor | 投稿主体 |
| timestamp | 時刻 |
| references | 関連イベント |
| context | 背景条件 |
| translation history | 翻訳履歴 |

詳細仕様は今後変更される可能性があります。

### Standard API での扱い

Standard API では、provenance は canonical view の一部として扱います。

その際の基本方針は次の通りです。

- raw protocol event の全体をそのまま露出しない
- provenance は追跡可能な最小単位で返す
- source protocol, source id, timestamp, references は優先的に保持する
- relay や transport の詳細は必要な場合のみ補助情報として返す
- 明示的に同一といえる case だけ provenance を統合し、曖昧な case は別 event のまま保持する

### Identity と provenance の関係

Toitoi では、provenance は identity を置き換えるものではありません。

- `id` は canonical event の主識別子として扱う
- `provenance.sources[]` は、その `id` に集約された source の履歴を残す
- transport ごとの raw id や URI は、必要に応じて `rawRef` や source reference に保持する
- `body` や `DSL` の類似は provenance 集約の根拠にはしない
- 派生関係は provenance ではなく `lineage` で表現する

同一性が明示できる場合だけ provenance を集約し、明示できない場合は別 event として保持します。これにより、commons memory としての履歴を保ちながら、無理な畳み込みを避けられます。

現行実装では、`packages/nostr/storage/persistence.js` の `rawRef` と `provenance.sources` が、この考え方の実装基盤になっています。

---

## Translation History

Toitoi では：

- 問いの引用
- 再解釈
- 他地域への適用
- 応答

なども provenance の一部として扱います。

---

## Provenance as Commons Memory

Toitoi は provenance を：

> 「知識生成過程の記録」

として扱います。

これは単なるメタデータではなく、
commons の記憶そのものとして機能します。

この commons memory を API でどう要約するかは、設計上の焦点の 1 つです。
