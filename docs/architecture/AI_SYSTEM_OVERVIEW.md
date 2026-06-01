# Toitoi AI System Overview

**Status: evolving** | **Last updated: 2026-06-01**

## 概要

Toitoi における AI は、答えを確定する authority ではありません。

AI は、

- 観察から問いを生成する
- 問いを構造化する
- 複数の解釈を併存させる
- 反省と再 inquiry を促す

ための inquiry-support infrastructure として位置づけます。

低リソース端末での実装方針は、[`EDGE_AI_LOW_RESOURCE_PROFILE.md`](./EDGE_AI_LOW_RESOURCE_PROFILE.md) に参考例として分離しています。  
これは正本の仕様ではなく、Edge AI の設計自由度を示すための一例です。

---

## AI の基本姿勢

Toitoi の AI は、

```text
Observation
  ↓
Inquiry
  ↓
Multiple Interpretations
  ↓
Reflection
  ↓
New Inquiry
```

という循環を支えるために存在します。

最適化された単一解を返すことよりも、

- inquiry generation
- interpretive plurality
- contextual reasoning
- local autonomy

を優先します。

---

## AI と Canonical Event

採用アーキテクチャにおいて、AI が直接合わせるべき中心モデルは
Nostr transport schema ではなく Canonical Event です。

基本フロー:

```text
Raw local signals
  ↓
Inquiry generation
  ↓
Canonical Event draft
  ↓
Optional DSL projection
  ↓
Converter
  ↓
Nostr Inquiry Event
```

つまり AI の主責務は、

- 観察から問いを作る
- 自然言語の Boundary Object を保つ
- 必要なら DSL を補助的に付与する
- Canonical Event draft を生成する

ことです。

---

## AI の機能層

### 1. Inquiry Generation Layer

役割:

- センサー値
- 農家メモ
- 圃場観察
- 周辺イベント

から「問いに値する差異」を見つける

出力例:

- possible inquiries
- hypotheses
- uncertainty markers
- reflective prompts

### 2. Canonical Structuring Layer

役割:

- 自然言語の観察や問いを Canonical Event draft にまとめる
- `body`, `contexts`, `relationships`, `phase`, `trigger`, `lineage` を整える
- provenance に必要な source を保持する

ここでは protocol-specific field を直接中心にしません。

### 3. DSL Projection Layer

役割:

- inquiry の構造的投影を `dsl:*` 相当の形で生成する
- 1 つの問いに複数モデルを併存させる

制約:

- optional
- non-authoritative
- natural-language inquiry を置き換えない

### 4. Interpretation Layer

役割:

- climate model
- soil model
- local model
- community model

など複数観点の解釈を併置する

Toitoi では、解釈の差異はエラーではなく価値です。

### 5. Reflection / Mediation Layer

役割:

- 既存 inquiry との比較
- 文脈の差異の可視化
- 新たな inquiry への橋渡し

を行う

---

## 重要な設計制約

### 自然言語を残す

`content` に相当する自然言語の問いは、常に主表現として保持します。

### DSL は補助層

DSL は inquiry の projection であり、正解ではありません。

### AI は Canonical Event に合わせる

AI はまず Canonical Event draft を作り、protocol 変換は converter に委ねます。

### local context を失わない

AI は local raw data をそのまま外に出すのではなく、抽象化された context として扱います。

---

## 書き込み時の AI パイプライン

```text
Sensor / note / observation
  ↓
Signal detection
  ↓
Inquiry generation
  ↓
Canonical Event draft
  ↓
Optional DSL projection
  ↓
Converter
  ↓
Nostr transport event
```

---

## 読み込み時の AI 利用

読み込み側では、AI は raw Nostr event に直接依存しません。

AI が扱うべき入力は、原則として

- canonicalized event
- standardized API response
- indexer が作った補助構造

です。

これにより、protocol 追加時も AI 側の変更を減らせます。

---

## 非目標

Toitoi の AI は以下を主目的にしません。

- 単一の正解生成
- deterministic recommendation の押し付け
- protocol schema への強い結合
- local knowledge の上書き

---

## 関連

- [../protocols/CANONICAL_EVENT.md](../protocols/CANONICAL_EVENT.md)
- [../protocols/NOSTR_INQUIRY_SCHEMA.md](../protocols/NOSTR_INQUIRY_SCHEMA.md)
