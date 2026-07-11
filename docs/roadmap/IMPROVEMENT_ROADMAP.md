# Toitoi Improvement Roadmap

**Status: evolving** | **Last updated: 2026-07-11**

## 目的

この文書は、Toitoi をより優れた「問いの循環システム」へ発展させるための改善方針を整理したロードマップです。

Toitoi はすでに、Canonical Event、multi-transport、provenance、replay、Standard API などの基盤を備えています。次の段階では、抽象層や transport を増やすことだけを目的にせず、次の循環を実際の利用体験として成立させることを重視します。

```text
観察
  ↓
問いの候補生成
  ↓
人間による確認
  ↓
Canonical Event 化
  ↓
公開・保存・検索
  ↓
他地域での翻訳・注釈・派生・統合
  ↓
現場への還流
```

この一連の流れを、以下では「問いの一生」と呼びます。

---

## 基本方針

Toitoi の発展には、次の二つの方向があります。

1. 汎用的な分散プロトコル基盤になる
2. 問いの循環を実現する独自の知識空間になる

当面は、後者を優先します。

Canonical Event や multi-transport の構造は維持しつつ、まずは Toitoi でなければ成立しない「問いが育つ体験」を完成させます。その成果として、外部実装や他分野へ拡張可能な汎用性を獲得する方針とします。

---

## 1. 「問いの一生」を完成させる

最優先課題は、一つの問いが生成から再利用までを通過する Golden Path を完成させることです。

```text
農家・観察者の記録
  ↓
ローカル AI による問い候補の生成
  ↓
人間による確認・編集
  ↓
Canonical Event 化
  ↓
一つ以上の transport への公開
  ↓
他の利用者による発見
  ↓
翻訳・注釈・派生・統合
  ↓
元の問いまたは現場への還流
```

最初の参照シナリオとして、次のような一件を最後まで実装します。

> 「畑の東側だけ雑草の種類が違う」という観察から問いが生成され、別地域の類似した問いと接続され、比較可能な形で表示される。

この Golden Path を、以下の基準として利用します。

- E2E テスト
- デモデータ
- UI 設計
- API 使用例
- 運用確認
- 説明資料

---

## 2. 問いを「投稿」ではなく「成長する知識単位」にする

Toitoi の inquiry は、SNS の投稿や単純な質問文ではありません。

問いに対して、次のような操作を第一級機能として扱います。

- 別地域や別言語向けに翻訳する
- 新しい観察を付加する
- 類似する問いを接続する
- 対照的な問いを結びつける
- 複数の問いを統合する
- 別の視点から問い直す
- 過去の問いを再解釈する

代表的な relation / lineage 候補は次のとおりです。

```text
derived_from
translated_from
observed_alongside
contrasts_with
synthesizes
reframes
annotates
revises
```

これらは単なる返信関係ではなく、問いがどのように変化・成長したかを表す意味関係として扱います。

---

## 3. 「問いの系統樹」を中核 UI にする

Toitoi の思想を最も直接的に表現する UI は、問いの lineage と semantic relationship の可視化です。

単純なノードグラフではなく、少なくとも次を区別して表示します。

- 元となった問い
- 地域間の翻訳
- 観察による補強
- 反例
- 再解釈
- 統合
- AI による提案
- 人間による確定

表示モードは、少なくとも次の二つを用意します。

### 系譜ビュー

```text
この問いが、どの問いから生まれたか
```

### 文脈ビュー

```text
どの気候・土壌・作物・季節で似た問いが現れたか
```

系譜ビューは lineage を、文脈ビューは contexts と relationships を中心に構成します。

---

## 4. AI を「司書／菌糸」として実装する

Toitoi の AI は、唯一の正解を与える権威ではなく、観察、文脈、問いを接続する補助者です。

### AI に期待する役割

- 観察記録から問い候補を抽出する
- 類似する問いを検索する
- 異なる文脈との差異を示す
- 問い同士の関係候補を提案する
- 語彙やタグの候補を示す
- 翻訳候補を作る
- 矛盾や不足する文脈を指摘する
- 複数の問いから synthesis 候補を作る

### 原則として避ける役割

- 唯一の正解を断定する
- 農作業の実行判断を自動決定する
- 生データを無条件で外部サービスへ送る
- 人間の確認なしに AI 生成物を公開する
- 類似度だけを根拠にイベントを同一化する

### AI provenance

AI が関与した場合は、可能な範囲で次を記録します。

- 使用モデル
- モデルまたは実装バージョン
- 処理種別
- 入力元イベント
- 生成日時
- 人間による確認状態
- 採用・修正・却下の結果
- 提案根拠

AI の数値的 confidence は、意味的な正しさや農業上の妥当性と同一視しません。

---

## 5. Canonical Event Conformance Suite を整備する

Canonical Event は Toitoi の最重要契約です。

仕様文書だけでなく、外部実装を含めて互換性を検証できる適合試験を整備します。

### 基本試験

- JSON Schema validation
- 必須フィールド検証
- schema version 検証
- Canonical ID 維持試験
- provenance 必須条件の検証
- rawRef と provenance の責務分離確認
- 未知フィールドの扱い
- schema migration 試験

### transport 往復試験

```text
Nostr → Canonical → Nostr
Lingonberry → Canonical → Lingonberry
ATProto → Canonical → ATProto
```

完全な byte-level round trip ではなく、意味的に維持すべき情報と、transport 固有で変化し得る情報を明示します。

### replay 同値性

- live ingest と replay が同じ canonicalization 結果を生成する
- derived index を raw / canonical storage から再生成できる
- canonicalization rule 更新時に再処理可能である

### 共通 fixture

同じ意味を持つ inquiry が、異なる transport を通っても同じ canonical view として読めることを確認する fixture を用意します。

---

## 6. Canonical Identity を段階的に扱う

複数 transport 上のイベントが同一に見えても、意味的類似性だけで自動統合してはいけません。

identity の判断状態を、次のように段階化します。

| 状態 | 意味 |
|---|---|
| `exact` | 同一の Canonical Event から投影された |
| `claimed` | 発行者が同一性を主張している |
| `verified` | 署名や identity claim で確認済み |
| `probable` | 内容・時刻・発行者などから同一らしい |
| `related` | 同一ではないが意味的に関係する |
| `unknown` | 判断できない |

`probable` は内部候補や UI 上の提案として利用できますが、自動統合の根拠にはしません。

Embedding や類似検索は、identity 判定ではなく related 候補の提示に限定します。

---

## 7. Provenance を利用者に見える形にする

provenance は内部監査だけでなく、利用者が問いを理解し、信頼するための情報です。

UI には「問いの来歴カード」を用意し、例えば次を表示します。

```text
作成日時
作成者または発行主体
人間確認の有無
AI 関与の有無
公開された transport
取得元 relay / carrier / PDS
元となった inquiry や observation
raw data が外部送信されたか
canonicalization の版
```

すべての情報を常時表示する必要はありません。概要と詳細を分け、一般利用者にも理解できる表現を用意します。

---

## 8. オフライン・低資源環境を第一級要件にする

Toitoi は、通信環境や端末性能が限定される現場でも利用できる必要があります。

優先する要件は次のとおりです。

- オフラインで観察を保存できる
- ローカルキューへ蓄積できる
- 接続回復後に同期できる
- 4GB RAM クラスの環境でも基本処理が動く
- スマートフォンだけでも入力できる
- 通信量を抑える
- raw data を端末内に残せる
- 公開範囲を人間が確認できる
- Canonical Event のみを外部へ公開できる

目標となる利用フローは次のとおりです。

```text
圃場で観察
  ↓
圏外でも保存
  ↓
端末上で問い候補を生成
  ↓
人間が確認
  ↓
接続回復後に公開
```

PWA、軽量 Web UI、ローカルサービスのいずれを採用する場合も、このフローを壊さないことを優先します。

---

## 9. 語彙を三層構造で育てる

Toitoi には標準語彙が必要ですが、地域固有の言葉や分類を中央語彙へ強制変換してはいけません。

語彙を次の三層に分けます。

### Core Vocabulary

Toitoi 全体で最低限共有する安定語彙です。

### Domain Vocabulary

土壌、害虫、気象、作物、生態系など、分野別に拡張される語彙です。

### Local Vocabulary

地域語、方言、農家独自の分類、現地の呼称です。

Local Vocabulary と共有概念は、置換ではなく mapping / translation claim で接続します。

```text
local term
  ↓ mapping / translation claim
shared concept
```

これにより、地域性を失わずに検索・翻訳・比較が可能になります。

---

## 10. 新しい transport より参照ユースケースを優先する

Nostr、Lingonberry、ATProto の基本的な役割が存在する段階では、新しい transport の追加より、具体的な参照ユースケースの完成を優先します。

### ユースケース A: 雑草相の変化

```text
雑草の種類・分布の観察
  ↓
微気候・土壌・管理方法との関係を問う
```

### ユースケース B: 害虫と天敵

```text
虫の出現記録
  ↓
害虫／益虫と即断せず、生態的関係を問う
```

### ユースケース C: 土壌と作物反応

```text
作物の生育差
  ↓
水分・土壌構造・微生物・地形との関係を問う
```

各ユースケースには、次を含む reference dataset を用意します。

- 元の観察
- 生成された inquiry
- Canonical Event
- transport projection
- provenance
- lineage / relationship
- UI 表示例
- replay fixture

---

## 11. 実際の利用者との共同設計を行う

Toitoi は、思想と技術だけでは完成しません。

小規模なパイロットグループを作り、現場での利用を反復的に確認します。

構成例:

```text
農家・栽培者 2〜3名
研究者 1名
普及員・技術者 1名
開発者 1〜2名
```

確認項目:

- どのような場面で問いが生まれるか
- 入力が負担にならないか
- AI 提案が思考を狭めていないか
- 文脈の抽象化で重要情報を失っていないか
- 他地域の問いが本当に参考になるか
- provenance 表示を理解できるか
- 系統樹が実用的か
- 公開したくない情報を確実に除外できるか

「使えるか」だけでなく、「観察方法や判断の自律性を壊していないか」を評価します。

---

## 12. コモンズとしてのガバナンスを整備する

Toitoi はソフトウェアだけでなく、protocol と commons を目指しています。

今後、少なくとも次の方針を文書化します。

- Canonical Event 変更手続き
- schema versioning と互換性
- TIP の提出・議論・採択方法
- 語彙追加・変更手続き
- deprecated field の扱い
- relay / carrier 運営者の責任範囲
- モデレーション原則
- 有害または誤解を招く情報への対応
- 地域知・伝統知・共同体知の権利保護
- 公開範囲と再利用条件
- append-only と削除要求の関係
- 秘密情報・個人情報・位置情報の扱い

特に、次の問いに対する原則が必要です。

```text
誰の知識か
誰が公開を決められるか
誰が再利用できるか
どの文脈を外へ出してよいか
公開後にどのような訂正・撤回が可能か
```

---

## 実装優先順位

### Phase A: Golden Path

目標は、問いの生成から公開・派生・表示までの一連の体験を完成させることです。

- 観察入力
- inquiry draft 作成
- 人間確認・編集
- Canonical Event 生成
- transport publish
- Standard API 取得
- inquiry detail 表示
- provenance 表示
- lineage を利用した派生操作
- E2E fixture

### Phase B: 知識空間としての体験

- 問いの系統樹
- 文脈ビュー
- 類似 inquiry 検索
- AI による relation 候補
- オフラインキュー
- identity state model
- 語彙の三層化

### Phase C: 外部利用と共同運営

- 実地パイロット
- 外部実装向け SDK
- Conformance Suite 公開
- TIP / governance process
- 運営者向け observability
- schema migration tooling
- 他分野への適用検証

### 後続候補

以下は Golden Path と実地利用が安定した後に検討します。

- graph inference
- embeddings の高度化
- ActivityPub などの transport 追加
- 大規模 DB / search engine 最適化
- 公開 federation の拡大

---

## 成功指標

一般的な利用者数だけでなく、Toitoi 固有の価値を測る指標を利用します。

### 問いの循環

- 観察から inquiry が作成された割合
- 人間が AI 提案を修正・採用・却下した割合
- inquiry から派生 inquiry が作成された割合
- 複数地域に翻訳された inquiry 数
- synthesis に発展した inquiry 数

### 文脈と多様性

- 複数の context をまたいで接続された inquiry 数
- Local Vocabulary が保持された割合
- 異なる地域から付加された observation 数

### 信頼性

- provenance を追跡可能な event の割合
- replay で再現可能な event の割合
- conformance test の適合率
- identity collision / ambiguous merge の件数

### 現場適合性

- オフライン環境で完了できた操作の割合
- 低資源端末での処理時間
- 入力に要する時間
- 公開前に利用者が内容を確認できた割合

---

## 判断原則

今後の機能追加や設計変更は、次の順で評価します。

1. 問いの循環を強化するか
2. 人間の観察力と探究心を増幅するか
3. 地域固有の文脈を失わせないか
4. raw data や個人情報を過剰に集約しないか
5. Canonical Event の意味的安定性を維持できるか
6. provenance と replay を損なわないか
7. 特定 transport や事業者への依存を増やさないか
8. 低資源・不安定通信環境でも利用可能か
9. 外部実装が検証可能か
10. コモンズとして持続可能か

---

## 結論

Toitoi の次の成長に必要なのは、抽象層を増やすことではなく、問いが現場から生まれ、他者の文脈で翻訳され、系譜を持って成長し、再び現場へ戻る体験を完成させることです。

Canonical Event、multi-transport、identity、provenance、replay は、その体験を支える基盤として維持・強化します。

Toitoi が目指すべき中心価値は、次の一文に集約されます。

> Toitoi でなければ成立しない「問いが育つ知識空間」を作る。
