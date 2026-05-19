# Toitoi 実装ロードマップ

**Status: evolving** | **Last updated: 2026-05-19**

## 目的

このドキュメントは、Toitoi のアーキテクチャを実装へ落とすための作業手順を定義します。

重要なのは、最初からすべての理想形を作ることではなく、

- まずデータを安全に流せること
- その上で canonical semantics を安定させること
- 最終的に multi-protocol に拡張できること

を、段階的に実現することです。

---

## 採用する前提

今後の実装は、以下の前提を採用して進めます。

- Canonical Event を内部の意味的共通表現として扱う
- Canonical は特定 protocol schema の写しではなく semantic layer として設計する
- 読み込み側では Adapter / Normalizer を経由してから Indexer に渡す
- Standard API は protocol ではなく意味論に基づくアクセス面として設計する
- Indexer は canonical semantics を変形せず、検索・参照のために補助構造を作る
- 文書の版管理は [DOCUMENTATION_VERSION_POLICY.md](../architecture/DOCUMENTATION_VERSION_POLICY.md) に従う

一方で、以下は固定しません。

- Canonical のみを唯一の保存対象にすること
- 特定 DB や検索エンジンを前提に設計を閉じること
- Nostr 的な schema をそのまま Canonical に持ち込むこと

---

## 実装原則

1. raw event と canonicalized event を分けて扱う
2. protocol 固有責務と semantic 固有責務を混ぜない
3. MVP では Nostr を最初の transport として使う
4. 未来の ATProto / LocalFS 追加を妨げる命名や責務分割を避ける
5. 仕様書先行で進めるが、仕様は必ず replay 可能な実装で検証する

---

## フェーズ 1: 境界の確定

### 目的

実装前に、どこまでが Canonical で、どこからが protocol 固有かを固定する。

### 作業

- Canonical Event の最小スキーマを定義する
- raw event / normalized event / canonical event の用語を確定する
- Converter と Adapter / Normalizer の責務境界を文書化する
- delete semantics / replace semantics / ordering / trust の扱い方針を整理する

### 完了条件

- `docs/architecture` に境界定義がある
- 「Nostr event をそのまま Canonical と見なさない」ことが明文化されている
- ingest 時の状態遷移が説明できる

---

## フェーズ 2: Canonical Event MVP

### 目的

最小限の semantic layer を定義し、Nostr から変換可能な形にする。

### 作業

- Canonical Event の必須フィールドを決める
- provenance, source protocol, source id を保持する設計を追加する
- raw payload への参照方法を決める
- 将来拡張用の optional field を切り分ける

### 完了条件

- 最小 Canonical schema が 1 つの文書として固定されている
- Nostr event から loss-aware に変換できる
- raw event を失わず再 canonicalize できる

---

## フェーズ 3: Nostr Adapter / Normalizer 実装

### 目的

最初の protocol abstraction layer として、Nostr ingest を安定化する。

### 作業

- Nostr event の validate を実装する
- signature verify を実装する
- dedupe ルールを定義する
- created_at と replaceable semantics の ordering 方針を決める
- tombstone / deletion の扱いを決める
- normalize 結果を Canonical Event に変換する

### 完了条件

- 同一入力に対して canonicalize 結果が安定する
- duplicate と invalid event を区別して扱える
- protocol 固有ロジックが adapter 配下に閉じている

---

## フェーズ 4: 永続化と replay 基盤

### 目的

「Canonical が中心」という方針を守りながら、raw event も保持して再処理可能にする。

### 作業

- raw event 保存形式を決める
- canonicalized event 保存形式を決める
- append-only ingest log を用意する
- replay で index を再構築できるようにする
- failure recovery 手順を文書化する

### 完了条件

- raw event から再 canonicalize できる
- canonicalized event から index を再生成できる
- ingest と replay が同じルールで動く

---

## フェーズ 5: Indexer MVP

### 目的

Canonical semantics を壊さずに、検索と参照のための最小機能を提供する。

### 作業

- event lookup を実装する
- 時系列 index を実装する
- relation / lineage 参照を実装する
- 必要最小限の全文検索を実装する
- embedding や graph expansion は optional に分離する

### 完了条件

- 単一 event 参照ができる
- 時系列一覧が返せる
- lineage または relation を辿れる
- index が canonical schema に依存しすぎていない

---

## フェーズ 6: Standard API MVP

### 目的

UI と AI が protocol を意識せずアクセスできる最初の API 面を作る。

### 作業

- event 取得 API を定義する
- list / filter / relation 参照 API を定義する
- response を protocol schema ではなく canonical view で返す
- provenance を API 上で追えるようにする

### 完了条件

- UI が Nostr 固有 schema を知らなくても扱える
- AI が canonical event を入力として扱える
- API の戻り値が transport 差異を露出しすぎていない

---

## フェーズ 7: 運用整備

### 目的

MVP を継続運用できる形にする。

### 作業

- ingest failure 時の再試行戦略を決める
- relay / indexer / API の監視項目を決める
- バックアップと復旧手順を整える
- サンプルデータで end-to-end テストを追加する

### 完了条件

- 障害時にどこまで復旧できるか説明できる
- データ欠落時の再同期手順がある
- 運用手順が `infra/` に整理されている

---

## フェーズ 8: 多プロトコル化

### 目的

Nostr 実装を壊さずに、ATProto や LocalFS を追加できる状態にする。

### 作業

- adapter interface を共通化する
- converter interface を共通化する
- source capability の差分表を作る
- protocol ごとの欠損情報や信頼モデルを整理する

### 完了条件

- 新しい protocol を追加しても Canonical schema を大きく崩さない
- protocol 差分が adapter と converter に閉じる
- Standard API が大きく変わらない

---

## 当面の優先順位

最初の着手順は以下とします。

1. Canonical Event MVP を定義する
2. Nostr Adapter / Normalizer の責務を文書化する
3. raw event 保存と replay 方針を決める
4. Indexer MVP を作る
5. Standard API MVP を作る

この順序により、単なる Nostr wrapper になることを避けつつ、最短で動く経路を確保できます。

---

## 後回しにするもの

以下は重要ですが、初手では固定しません。

- embeddings の本格導入
- graph inference の高度化
- ATProto 対応
- ActivityPub 対応
- 特定の DB 最適化
- 特定の検索エンジン最適化

これらは MVP の ingest, canonicalize, replay, API が安定した後に進めます。

---

## 最終判断基準

各作業項目は、次の基準で採否を判断します。

- semantic interoperability を前進させるか
- protocol 依存を増やしすぎないか
- replayability を損なわないか
- AI / UI から見たアクセス面を単純にできるか
- 将来の multi-protocol 対応を難しくしないか

Toitoi の価値は transport の採用そのものではなく、異なる知識ネットワークを意味論的に横断できることにあります。
