# Toitoi 用語集

**Status: evolving** | **Last updated: 2026-06-05**

この文書は、Toitoi リポジトリ全体で頻出する用語を、できるだけぶれなく扱うための共通辞書です。

目的は次の 3 つです。

- 同じ言葉の解釈ズレを減らす
- README、設計書、実装コメントの表現を揃える
- 仕様議論の出発点をそろえる

> 補足: `docs/concepts/TOITOI_VOCABULARY.md` は、`context` や `relationship` などの**制御語彙**をまとめた文書です。  
> この用語集はそれとは別に、プロジェクト全体の概念を整理します。

---

## Inquiry Model

Toitoi における「問い」は、単なる質問文や疑問文ではありません。

Toitoi では、問いを次のように定義します。

> 問い = 現場で得られた観察や違和感を出発点にし、未解決性を保ったまま、他者と共有・翻訳・再解釈できる意味単位に抽象化されたもの

この定義において、問いは「情報」ではなく、**知識の流通単位**です。  
答えを閉じるためのものではなく、次の観察や解釈を生むために保持されます。

この節では、`問い` を Toitoi の概念として成立させるための条件を、必要条件と十分条件に分けて明示します。

### 必要条件

Toitoi で何かを「問い」と呼ぶには、少なくとも次をすべて満たす必要があります。

- 具体的な観察、違和感、関係のいずれかに由来する
- 未解決性を保持している
- 文脈なしには意味が十分に定まらない
- 他者に共有でき、再解釈の余地が残る

これらのうち 1 つでも欠ける場合、その対象は Toitoi の問いとしては扱いません。

### 十分条件

Toitoi では、ある対象が次の性質をまとまって持つとき、それを問いとして扱います。

- 何らかの現場経験に根ざしている
- その現場経験に対する違和感や不確実性を含んでいる
- 受け手の文脈に応じて再構成できる
- 問い返し、比較、関係づけ、観察の追加に接続できる

この 4 条件を同時に満たす対象は、Toitoi において問いとして成立します。

言い換えると、問いは「答えの前段」ではなく、**次の観察を生むために流通する知識の単位**として成立するものです。

### 問いの核

Toitoi の問いは、次の要素の組み合わせとして理解できます。

- 観察
- 違和感
- 関係性
- 仮説
- 生態学的直感
- 不確実性

これらは固定スキーマではなく、問いが保持すべき意味論的な軸です。

ここでいう「核」は、問いの内容を機械的に列挙するためのものではなく、問いが問いとして成立するために保持する性質を分解したものです。

### 何ではないか

問いは次のいずれかと同一ではありません。

- 単なる FAQ 的な質問文
- 既知の正解を前提にした設問
- 生データそのもの
- 結論や答えそのもの
- タスクや指示
- transport 固有の event 形式そのもの

### inquiry

- 定義: Toitoi の「問い」を指す標準用語です。
- 位置づけ: プロトコル層・実装層・内部仕様で使う概念用語です。
- 補足: `inquiry` は、単なる質問文ではなく、Toitoi が知識の流通単位として扱う問いを指します。
- 参照: [Inquiry Model](#inquiry-model)

### question

- 定義: 一般語としての「質問」「問い」です。
- 位置づけ: 説明文や読みやすさを優先する文脈で使います。
- 補足: Toitoi の概念定義を厳密に述べる場面では `inquiry` を優先します。
- 参照: [Inquiry Model](#inquiry-model)

### 用語方針

このリポジトリでは、英語の使い分けを次のように整理します。

- `inquiry`: プロトコル層・実装層・内部仕様で使う用語
- `question`: 一般語、説明文、読みやすさのための自然な訳語

したがって、この文書の主題は日本語では「問い」ですが、実装や transport の文脈では `inquiry` を優先します。

### 基本思想

Toitoi は「答えの共有」ではなく、

> 「問いの循環」

を重視します。

これは：

- 地域固有性
- 属地的知識
- tacit knowledge
- ecological complexity

を保存するためです。

### 問いの役割

問いは：

- 他地域への翻訳
- 新しい観察の誘発
- 比較
- 関係性の発見

の媒介として機能します。

### 問いの構成要素

問いは現在、以下のような要素を含むことを想定しています。

| 要素 | 内容 |
|---|---|
| context | 背景条件 |
| observation | 観察内容 |
| relationship | 関係性 |
| uncertainty | 不確実性 |
| tags | semantic tags |

これは現時点の概念整理であり、詳細構造は今後変更される可能性があります。

### Inquiry as Commons

Toitoi では問いを：

> 「未解決性を保持したまま共有される知識」

として扱います。

問いは固定された正解ではなく、他者との関係の中で変化・翻訳され続けます。

---

## 主要用語

### inquiry

- 定義: [Inquiry Model](#inquiry-model) 参照。
- 位置づけ: プロトコル層・実装層・内部仕様で優先して使う標準用語です。
- 参照: [Inquiry Model](#inquiry-model)

### question

- 定義: [Inquiry Model](#inquiry-model) 参照。
- 位置づけ: 説明文や読みやすさを優先する文脈で使います。
- 補足: 実装や transport の仕様説明では `inquiry` を優先します。
- 参照: [Inquiry Model](#inquiry-model)

### canonical event

- 定義: 複数 transport にまたがる共通の正規化イベントです。
- 位置づけ: Toitoi の中核となる protocol-independent な表現です。
- 補足: transport 固有の raw event をそのまま正本にせず、共通の視点で扱うための中間表現です。
- 参照: [`CANONICAL_EVENT.md`](../protocols/CANONICAL_EVENT.md)

### provenance

- 定義: ある問いや観察が「誰によって、どこで、どの文脈で」生まれたかを示す来歴情報です。
- 位置づけ: 知識の根拠と履歴を保持するための要素です。
- 補足: 結果だけでなく、生成過程も commons memory として残します。
- 参照: [`PROVENANCE.md`](./PROVENANCE.md)

### lineage

- 定義: 派生関係や系譜を表すつながりです。
- 位置づけ: provenance とは別に、問い同士の関係を追うために使います。
- 補足: 「何から派生したか」「何を統合したか」を表現します。
- 参照: [`PROVENANCE.md`](./PROVENANCE.md)

### boundary object

- 定義: 異なる地域・立場・文脈のあいだで共有できる共通の中間表現です。
- 位置づけ: 属地性を保ちながら、他地域との翻訳を可能にするための橋渡しです。
- 補足: 共通フォーマットでありながら、各地の文脈を壊しすぎないことを重視します。
- 参照: [`BOUNDARY_OBJECT.md`](./BOUNDARY_OBJECT.md)

### commons

- 定義: Toitoi が目指す、分散的に共有・維持される知識基盤です。
- 位置づけ: 単なるシステムではなく、知識の共有と継承の仕組み全体を指します。
- 補足: AI、リレー、インデクサー、UI はすべて commons を支える構成要素です。

### relay

- 定義: イベントを受け取り、配信し、保管する transport 層のノードです。
- 位置づけ: Toitoi では最初の operational transport layer として Nostr relay を扱います。
- 補足: Toitoi のリレーは、問いを永続的に流通させるための基盤です。

### indexer

- 定義: 分散したイベントを収集し、検索・再構成・可視化しやすい形にする仕組みです。
- 位置づけ: viewer layer の中核です。
- 補足: transport ごとの差を吸収しつつ、canonical view を組み立てます。

### canonical view

- 定義: raw event をそのまま露出せず、共通のルールで見やすく整えた表示・参照形です。
- 位置づけ: API や UI が扱いやすい形を提供するための視点です。
- 補足: provenance や lineage を保ったまま、過剰に実装詳細へ寄らないことを重視します。

### local AI

- 定義: 圃場や利用現場の近くで動き、生データを外へ出さずに処理する AI です。
- 位置づけ: edge layer の中心要素です。
- 補足: Toitoi では、中央集権的な推論ではなく、局所文脈に寄り添う役割を担います。

### edge layer

- 定義: 現場側で観察・抽出・署名・送信を担う層です。
- 位置づけ: 生データを保持しつつ、問いだけを外に出す役割を担います。

### viewer layer

- 定義: 分散した問いを集め、見える形にして利用者へ返す層です。
- 位置づけ: indexer と UI を含みます。

### standard API

- 定義: transport や内部保存形式の違いを吸収して、共通の操作面を提供する API です。
- 位置づけ: 実装者が依存しやすい薄いサービス層です。
- 補足: raw protocol event を直接露出するのではなく、canonical view を返す方針です。

### transport

- 定義: Toitoi の問いや関連情報を運ぶ通信・保存の仕組みです。
- 位置づけ: Nostr や AT Protocol など、複数の担体がありえます。
- 補足: protocol と transport は同義ではありません。protocol は意味の設計、transport は運搬路です。

### protocol

- 定義: 何をどの意味で扱うかを決める、Toitoi の論理的な契約です。
- 位置づけ: transport とは別に、意味・型・capability を整理するために使います。
- 補足: 同じ protocol でも transport は複数ありえます。

### adapter

- 定義: transport 固有の表現を受け取り、Toitoi の共通表現に寄せる層です。
- 位置づけ: validate、verify、normalize、dedupe、ordering を閉じ込めます。
- 補足: protocol 固有の差分を外側に漏らしにくくします。

### normalizer

- 定義: raw event のばらつきを整理して、扱いやすい形へ揃える処理です。
- 位置づけ: adapter の内部責務として現れることが多いです。
- 補足: まだ意味論的に完全な canonical event ではありません。

### converter

- 定義: canonical event と protocol-specific representation を相互変換する層です。
- 位置づけ: 外部 transport への投影や、外部表現からの逆変換を担います。
- 補足: encode/decode よりも、意味の投影に近い役割です。

### replay

- 定義: 保存済みの event 群を再び読み込み、同じ規則で再構成することです。
- 位置づけ: 再索引、検証、履歴再現のための基盤です。
- 補足: append-only な履歴を前提にします。

### storage snapshot

- 定義: replay や検索のために、保存状態をまとめて見られる形にしたものです。
- 位置づけ: API や indexer が入力として扱うことがあります。
- 補足: raw、canonical、ingest log などを含みうる内部状態です。

### append-only

- 定義: 既存の記録を上書きせず、追加だけで履歴を積み上げる方針です。
- 位置づけ: Toitoi の event 保存と provenance の基本姿勢です。
- 補足: 修正は新しい event と lineage で表現します。

### derived index

- 定義: 保存された canonical event から作る検索・参照用の補助構造です。
- 位置づけ: API や indexer の高速化・探索支援に使います。
- 補足: 意味の正本ではなく、派生データです。

### capability

- 定義: ある protocol や storage が何をできるかを示す性質です。
- 位置づけ: registry や descriptor で比較可能にします。
- 補足: たとえば replayable か、rawRef を持つか、などを表します。

### registry

- 定義: protocol descriptor を集めて一覧化し、参照できるようにする仕組みです。
- 位置づけ: runtime が利用可能な protocol を選ぶ基盤です。
- 補足: 重複登録の防止にも使います。

### descriptor

- 定義: protocol の名前、capability、provenance 方針などをまとめた記述子です。
- 位置づけ: protocol を比較・列挙・選択するための共通形です。
- 補足: 実装そのものではなく、実装を説明するメタデータです。

### canonical semantics

- 定義: transport や保存形式に依存しない、Toitoi における意味の中心です。
- 位置づけ: indexer はこの意味を変形しないことが前提です。
- 補足: raw event の形ではなく、共通の意味として扱います。

### semantic layer

- 定義: 記号列や transport 形式の下にある、意味を扱う層です。
- 位置づけ: canonical event や inquiry の議論で使います。
- 補足: 形式の違いより、何を表しているかを重視します。

### rawRef

- 定義: 元の raw event や raw payload を再取得・再 canonicalize するための参照です。
- 位置づけ: provenance とは別に、再生性と監査性を支えます。
- 補足: sourceId、relay、storageId、payloadHash などを持ちうります。

### provenance summary

- 定義: provenance のうち、API や UI で扱いやすい最小限の要約です。
- 位置づけ: `sourceCount` や `sourceProtocols` などを含みます。
- 補足: 全履歴の代わりではなく、見せ方の圧縮です。

### identity mapping

- 定義: 異なる source や transport の記録を、同一性の観点で対応付けることです。
- 位置づけ: 明示的に同一といえる場合にだけ行います。
- 補足: 類似だけで merge しないのが Toitoi の保守的な方針です。

### multi-transport

- 定義: 複数の transport をまたいで、共通の canonical view を扱うことです。
- 位置づけ: Phase 14 以降の前提の 1 つです。
- 補足: fan-in と fan-out の両方を含みます。

### fan-in

- 定義: 複数の transport や source を 1 つの view に集約することです。
- 位置づけ: API や indexer での統合に使います。

### fan-out

- 定義: 1 つの canonical event を複数 transport へ配信することです。
- 位置づけ: outbound や delivery の文脈で使います。

### local-first

- 定義: まず現場で観察・処理し、必要なものだけを外へ出す考え方です。
- 位置づけ: edge layer の設計思想です。
- 補足: raw data を中央へ集める発想とは逆です。

### tacit knowledge

- 定義: 言語化されにくい、身体化された実践知です。
- 位置づけ: Toitoi が共有したい知の中心にあります。
- 補足: 「暗黙知」と訳されることがあります。

### commons memory

- 定義: commons 全体で共有される知識生成の記録です。
- 位置づけ: provenance が担う記録の社会的な意味を指します。
- 補足: 単なるログではなく、継承される記憶として扱います。

### TIP

- 定義: Toitoi Improvement Proposal の略で、語彙や仕様の提案単位です。
- 位置づけ: 未固定の用語やルールを、合意可能な形で標準化するときに使います。
- 補足: 語彙の拡張や解釈更新のための提案フォーマットです。

### provenancePolicy

- 定義: provenance を API や運用でどのように扱うかを示す方針です。
- 位置づけ: protocol ごとの差を表すメタデータとして使います。
- 補足: provenance の保存方針や要約の扱いを説明します。

### capability matrix

- 定義: 複数 protocol の capability を並べて比較できる表です。
- 位置づけ: registry や API の introspection 結果として使います。
- 補足: どの protocol が何に対応しているかを一覧で見せます。

### metadata-only protocol

- 定義: 実データの replay よりも、メタデータの扱いを中心とする protocol です。
- 位置づけ: `localfs` のように、storage が限定的な実装で使われます。
- 補足: raw event の完全な再生を前提にしないことがあります。

### projection

- 定義: ある内部表現を、外部や別層で扱いやすい形に写すことです。
- 位置づけ: canonical event から transport や API へ出すときに使います。
- 補足: 訳出・投影・表示のまとめ言葉として使えます。

---

## 使い分けの目安

- `inquiry` は実装・仕様の語
- `question` は一般語
- `canonical event` は正規化された共通イベント
- `provenance` は来歴
- `lineage` は派生関係
- `boundary object` は文脈をまたいで共有する中間表現
- `relay` は流通基盤
- `indexer` は収集・再構成・検索基盤

---

## 更新ルール

1. 用語の意味が揺れ始めたら、まずこの文書に追記する
2. 仕様として固定したい値は `TOITOI_VOCABULARY.md` に移す
3. 用語の定義が変わったら、関連文書へのリンクも合わせて見直す
4. 迷ったときは、実装語と一般語を分けて書く
