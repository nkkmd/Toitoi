# Toitoi AI Adoption Roadmap

**Status: evolving** | **Last updated: 2026-06-02**

この文書は、Toitoi に AI を段階的に導入するためのロードマップです。  
`docs/roadmap/IMPLEMENTATION_PLAN.md` が実装全体の作業手順を扱うのに対して、この文書は **AI 導入の優先順位、導入条件、最低仕様** に焦点を当てます。

関連する前提文書:

- [AI System Overview](../architecture/AI_SYSTEM_OVERVIEW.md)
- [Edge AI Low-Resource Profile](../architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md)
- [Inquiry Model](../concepts/INQUIRY_MODEL.md)

---

## 目的

Toitoi の AI は、答えを固定する装置ではなく、観察を整理し、問いを生成し、反省と再 inquiry を支える補助層として導入します。

導入順の基本方針は次の通りです。

- まず保存と再処理を安定させる
- 次に要約とタグ付けを自動化する
- その後に問い生成を導入する
- 最後に検索強化と知識活用へ広げる

---

## 全体ロードマップ

### Phase 1: 安全な保存と非同期 AI

まずは、イベントを先に保存し、AI を後段で非同期に動かせるようにします。

できるようになること:

- 受信イベントを失わずに保存できる
- AI 処理をイベント受信経路から切り離せる
- 要約・タグ付けを後段で実行できる
- 失敗時の再試行とエラー記録を持てる

前提:

- `events`
- `ai_queue`
- `ai_annotations`
- ローカル推論サーバー

---

### Phase 2: 要約・タグ付けの安定運用

AI の出力を JSON 固定にし、スキーマ検証と再処理を含めて安定運用できるようにします。

できるようになること:

- イベントの短い要約を作れる
- 共有可能な semantic tags を付けられる
- モデル名、プロンプト版、raw output を保存できる
- 失敗を局所化してイベント処理全体を止めない

この段階では、AI はまだ「問い」を作る主役ではなく、保存済みイベントの知識化を補助する役割です。

---

### Phase 3: 問い生成の導入

保存済みイベントから、「次に何を観察すべきか」「どの差異が重要か」を提案できるようにします。

できるようになること:

- 観察から問い候補を生成できる
- 不確実性を含んだ問いを残せる
- 農家メモやセンサー異常など、生成起点を記録できる
- 同じイベントから複数の問い候補を出せる

この段階で、Toitoi の AI は「答えを返す存在」ではなく、「問いを育てる存在」に近づきます。

---

### Phase 4: 検索と再利用

保存済みの要約・タグ・問いを、後から探しやすくします。

できるようになること:

- SQLite FTS5 によるキーワード検索
- 類似イベントの発見
- 複数の問いの系譜を追う
- 既存の問いを別文脈へ再利用する

---

### Phase 5: embedding と類似検索

意味的な近さを扱えるようにして、単語一致では拾えない関連性を見つけられるようにします。

できるようになること:

- 類似イベントの検索
- 関係性の近い問いの候補抽出
- 局所文脈に合う観察観点の提示

---

### Phase 6: RAG と文脈付き応答

検索結果をまとめ、文脈を保ったまま再利用できるようにします。

できるようになること:

- 関連イベントや問いを参照した応答
- 局所知を壊さない形での知識再利用
- 単純な検索を超えた支援

---

## 問い生成を導入するための最低仕様

問い生成は、モデルを置けばすぐ動く機能ではありません。少なくとも次の条件が必要です。

### 1. 入力仕様

問い生成の入力は、少なくとも次を含めます。

- canonicalized event
- raw observation context
- `summary`
- `tags`
- `trigger`
- `phase` または熟達段階
- `lineage` または関連イベント

### 2. 出力仕様

問い生成の出力は、少なくとも次を持ちます。

- `inquiry` 本文
- `context`
- `observation`
- `relationship`
- `uncertainty`
- `tags`
- `source_refs`
- `model`
- `prompt_version`
- `raw_output`

### 3. 品質条件

最低限、次を満たす必要があります。

- 1 回の生成で壊れない JSON を返せる
- スキーマ検証で落とせる
- 生成理由や起点が追える
- 低品質出力を破棄できる
- 人間が後で修正できる

### 4. 運用条件

- 小型モデルで一応動くこと
- `ctx` を大きくしすぎないこと
- 単一ワーカーで回せること
- 再試行の上限を決めること
- 生成ログを残すこと

### 5. 仕様固めが必要な点

問い生成は、マシンパワーだけでは決まりません。特に次の仕様が先に必要です。

- 何を「問い」と見なすか
- どの入力を問い生成の起点にするか
- どの粒度で 1 件とみなすか
- 単一の問いか、複数候補か
- 人間の修正をどう扱うか
- 問いを Canonical Event にどう載せるか

---

## 導入判断の目安

問い生成を導入してよい目安は、次の 3 点です。

- 保存と再試行が安定している
- 要約とタグ付けの品質が運用に耐える
- 「問い」の最低仕様に合意がある

この 3 点が揃わないうちは、問い生成は実験扱いに留めたほうが安全です。

---

## どの文書と役割が違うか

- `docs/architecture/AI_SYSTEM_OVERVIEW.md`
  - AI の役割と設計思想を定義する
- `docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md`
  - 4GB クラス端末での具体的な最小構成例を示す
- `docs/roadmap/IMPLEMENTATION_PLAN.md`
  - システム全体の実装順序を管理する
- 本文書
  - AI 導入の段階、問い生成の最低仕様、導入判断の目安をまとめる

## 参照の起点

迷ったときは次の順で読むと整理しやすくなります。

1. [AI System Overview](../architecture/AI_SYSTEM_OVERVIEW.md)
2. [Inquiry Model](../concepts/INQUIRY_MODEL.md)
3. [Edge AI Low-Resource Profile](../architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md)
4. [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
