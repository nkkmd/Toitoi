# Toitoi Protocol Schema Specification

**Data Structure as a Boundary Object (Version 0.1.2 - DSL Extension)**

*[日本語は下に続きます]*

This document defines the strict data schema and Standard Vocabulary for **"Inquiries" (Nostr Event Kind: 1042)**, which is the sole unit of data circulating on the network in the Toitoi Digital Agroecology Commons.

This specification serves as the common protocol (constitution) that all module developers—Edge AI (sender), Indexer (receiver/interpreter), and Frontend (display)—must adhere to.

**Version: 0.1.2** | Main updates from the previous version (v0.1.1):

* §2.6: Added `dsl` tag definition — a new structural layer that provides machine-readable projections of the natural-language inquiry (Boundary Object).
* §1: Updated the conceptual model to describe the two-layer structure of inquiries (Boundary Object layer + DSL layer).

---

## 1. Basic Philosophy of the Data Structure

The `tags` array in this system is not merely for search keywords. It is a metadata structure designed to conceal raw data while functioning as a "Boundary Object" that allows others to translate the data into their own farmland.

### 1.1 Two-Layer Structure of an Inquiry

From version 0.1.2, an inquiry in Toitoi is understood as having a **two-layer structure**:

```
[ Layer 1 ]  Boundary Object  —  Natural language (content field)
                  ↓  semantic projection
[ Layer 2 ]  DSL              —  Structured, machine-computable form (dsl tags)
```

**Layer 1 (Boundary Object):** The natural-language inquiry stored in the `content` field. It is intentionally multi-interpretable so that farmers, researchers, and AI systems can each read it through their own lens. This is the *social interface* of the inquiry.

**Layer 2 (DSL):** A structured representation of one or more *interpretations* of the Boundary Object, expressed in `dsl` tags. A DSL is not the "correct answer" — it is one possible semantic projection. Multiple DSLs can coexist for a single inquiry, each reflecting a different model (e.g., climate model vs. soil model). This is the *computational core* of the inquiry.

> **Key principle:** The DSL is a *projection* of the Boundary Object, not a replacement. The natural-language inquiry must always be preserved as the primary representation.

The system continues to describe agroecological knowledge in its established four-layer tag structure: "Context," "Relationship," "Phase," and "Lineage" — and now adds "DSL" as a fifth structural layer for machine reasoning and future Knowledge Graph integration.

---

## 2. Deep Reference and Standard Vocabulary of the Tag Structure

### 2.1 `context` (Metadata of Locality)

**Role:** Instead of using raw data (such as absolute latitude/longitude or specific moisture percentages), this tag categorizes and abstracts the "ecological and translational context" of the farmland. It functions as a key for the Indexer to match farmers who, despite being far apart, have similar ecological conditions.

* **Format:** `["context", "<category_key>", "<value>"]`
* **Category Keys and Recommended Vocabulary (v1.0):**

  + **1. Climate Zone (`climate_zone`)**

    - `subarctic`
    - `cool-temperate`
    - `warm-temperate`
    - `subtropical`
  + **2. Soil Type (`soil_type`)**
    The most important context determining nutrient retention and drainage.

    - `volcanic_ash` / `andisol` (High nutrient retention, but poor phosphorus availability)
    - `alluvial` (Fertile soil along river basins)
    - `sandy` (Good drainage, low nutrient retention)
    - `clay` (High water/nutrient retention, poor physical properties)
    - `peat`
  + **3. Farming Context/Methods (`farming_context`)**

    - `open_field`
    - `greenhouse_unheated`
    - `greenhouse_heated`
    - `no_till`
    - `organic` (No synthetic pesticides/fertilizers)
    - `conventional`
  + **4. Crop Family (`crop_family`)**
    Described at the "Family" level rather than specific variety names, abstracting common pest risks and replant failures.

    - `solanaceae` (Tomatoes, eggplants, peppers, etc.)
    - `brassica` (Cabbages, radishes, broccoli, etc.)
    - `legume` (Soybeans, peas, etc. — important for nitrogen fixation)
    - `cucurbitaceae` (Cucumbers, pumpkins, etc.)
    - `poaceae` (Rice, corn, green manure grasses, etc.)

### 2.2 `relationship` (Observation Category / Focus of Translation)

**Role:** Clarifies which non-linear interactions in the ecosystem the farmer or AI is currently focusing on (suspecting a chain of translation). This serves as the "common language" in the commons under diverse environments.

* **Format:** `["relationship", "<Element_A>", "<Element_B>"]`
  *(Note: To avoid directionality, the order of A and B is treated as identical by the Indexer.)*
* **Recommended Vocabulary for Elements:**
  + **Physical/Environmental Elements:**
    `soil_moisture` / `microclimate` / `soil_physical`
  + **Biological Elements:**
    `weed_flora` / `pest` / `natural_enemy` / `soil_microbe` / `crop_vitality`
  + **Chemical Elements:**
    `nutrient_cycle`

### 2.3 `phase` (Phase of Mastery / Scaffolding Targeting)

**Role:** Metadata describing the level of a farmer's cognitive proficiency this "inquiry" is suitable to stimulate.

* **Format:** `["phase", "<level>"]`
* **Level Definitions:**
  + `beginner`: Inquiries prompting observation of single events or visible physical changes.
  + `intermediate`: Inquiries prompting inferences about invisible factors or relationships between multiple elements.
  + `expert`: Inquiries addressing high-level interactions overseeing the entire ecosystem or adaptation at the system level.

### 2.4 `e` Tag (Lineage / Chain of Translation)

**Role:** Engraves the "Chain of Translation" in Actor-Network Theory (ANT) onto the system as a graph (tree structure).

* **Format:** `["e", "<parent_event_id>", "<relay_url>", "<marker>"]`
* **Strict Definitions of Markers:**
  + `derived_from`: A new inquiry generated by translating someone else's inquiry into one's own farmland context.
  + `synthesis`: A higher-dimensional hypothesis generated by linking multiple inquiries of different lineages.

### 2.5 `trigger` Tag (Origin of the Inquiry) — Optional

**Role:** Records the direct trigger that caused the Edge AI or farmer to generate this inquiry.

* **Format:** `["trigger", "<category>", "<value>"]`
* **Recommended Values:**

  | category | value examples | Description |
  | --- | --- | --- |
  | `sensor_anomaly` | `soil_moisture`, `temperature`, `illuminance` | A sensor reading crossed a threshold or showed an abnormal pattern |
  | `farmer_observation` | `weed_change`, `pest_found`, `crop_symptom` | A visual observation recorded by the farmer |
  | `periodic_review` | `weekly`, `seasonal` | Routine scheduled inquiry generation |
  | `external_event` | `heavy_rain`, `frost`, `drought` | A weather or environmental event |

### 2.6 `dsl` Tags (DSL Layer — Structured Projection of the Inquiry) — Optional

**Role:** Provides a machine-computable structural representation of the inquiry as a complement to the natural-language Boundary Object. A DSL tag set constitutes one *interpretation model* of the inquiry. Multiple interpretation models (DSL versions) can coexist on a single event by repeating the tag set with different `<model_id>` values.

**Important design constraints:**

* DSL tags are **optional**. An inquiry without DSL tags is fully valid and should be indexed normally.
* DSL tags are **not authoritative**. They represent one possible interpretation of the Boundary Object, not the definitive meaning.
* A single inquiry **may carry multiple DSL sets** with different `<model_id>` values. Conflicting models are intentional and reflect interpretive plurality.
* The Indexer **must not** alter or merge DSL tags on ingestion; it stores them as received.

#### 2.6.1 Tag Format Overview

All `dsl` family tags share the following structure:

```
["dsl:<sub_key>", "<model_id>", "<value_1>", "<value_2 (optional)>"]
```

| Position | Role |
| --- | --- |
| `dsl:<sub_key>` | Tag type identifier within the DSL namespace |
| `<model_id>` | Identifier grouping tags into one interpretation model (e.g., `m1`, `climate_model`) |
| `<value_1>` | Primary value |
| `<value_2>` | Secondary value (optional, used for relational pairs) |

#### 2.6.2 Sub-key Definitions

| sub_key | Meaning | value_1 | value_2 |
| --- | --- | --- | --- |
| `dsl:model` | Declares a named interpretation model | model name (e.g., `climate_model`) | *(omit)* |
| `dsl:var` | Declares a variable and its role | variable name (e.g., `microclimate`) | role: `independent` \| `dependent` \| `mediator` \| `moderator` |
| `dsl:rel` | Declares a directional causal/correlational relationship between two variables | source variable | target variable |
| `dsl:meta` | Arbitrary model-level metadata | key | value |

**Variable role definitions:**

| Role | Meaning |
| --- | --- |
| `independent` | Hypothesized causal or explanatory variable |
| `dependent` | Outcome or response variable under inquiry |
| `mediator` | Intermediate variable in a causal chain (A → M → B) |
| `moderator` | Variable that conditions the strength or direction of a relationship |

#### 2.6.3 Complete Example — Single DSL

Natural-language inquiry (`content` field):

```
雑草の生え方が場所によって違うのはなぜ？
(Why does weed growth vary by location?)
```

DSL tags expressing the climate interpretation model:

```json
["dsl:model", "m1", "climate_model"],
["dsl:var",   "m1", "microclimate",  "independent"],
["dsl:var",   "m1", "weed_flora",    "dependent"],
["dsl:rel",   "m1", "microclimate",  "weed_flora"]
```

#### 2.6.4 Complete Example — Multiple DSLs (Interpretive Plurality)

The same natural-language inquiry can be projected onto multiple interpretation models simultaneously:

```json
["dsl:model", "m1", "climate_model"],
["dsl:var",   "m1", "microclimate",  "independent"],
["dsl:var",   "m1", "weed_flora",    "dependent"],
["dsl:rel",   "m1", "microclimate",  "weed_flora"],

["dsl:model", "m2", "soil_model"],
["dsl:var",   "m2", "soil_nutrients", "independent"],
["dsl:var",   "m2", "weed_flora",     "dependent"],
["dsl:rel",   "m2", "soil_nutrients", "weed_flora"]
```

The Indexer stores both models without merging them, preserving interpretive plurality as a first-class property of the inquiry.

#### 2.6.5 Extended Example — Mediator Variable

For inquiries hypothesizing a causal chain (A → M → B):

```json
["dsl:model", "m1", "nutrient_chain_model"],
["dsl:var",   "m1", "soil_microbe",    "independent"],
["dsl:var",   "m1", "nutrient_cycle",  "mediator"],
["dsl:var",   "m1", "crop_vitality",   "dependent"],
["dsl:rel",   "m1", "soil_microbe",    "nutrient_cycle"],
["dsl:rel",   "m1", "nutrient_cycle",  "crop_vitality"]
```

#### 2.6.6 Relationship to the Indexer DB

The `dsl` tags are stored in the existing `Tag` table without schema changes:

| DB column | Stored value |
| --- | --- |
| `tagKey` | `dsl:model` / `dsl:var` / `dsl:rel` / `dsl:meta` |
| `tagValue1` | `<model_id>` |
| `tagValue2` | `<value_1>` |

*(For `dsl:rel` and `dsl:var` where two values are needed beyond `model_id`, a fifth tag position may be appended as `tagValue2` carries `value_1`, and `value_2` is stored by appending a second Tag row with the same tagKey and model_id.)*

> **Implementation note for Indexer developers:** The recommended approach is to use `tagValue1` as `model_id` and `tagValue2` as `value_1`, and to treat `value_2` (e.g., variable role or target variable) as a second Tag row. This avoids any schema migration and preserves full queryability via `EXISTS` subqueries. See `INDEXER_API_SETUP.md §5.2` for query patterns.

#### 2.6.7 Future Extensibility of DSL Sub-keys

The current set of sub-keys (`model`, `var`, `rel`, `meta`) covers variable-relationship modeling. As the system evolves, new sub-keys may be introduced via TIPs (§3) to support:

* **`dsl:constraint`** — Boundary conditions or assumptions of the model
* **`dsl:confidence`** — Model confidence or evidence strength (for AI-generated DSLs)
* **`dsl:graph_link`** — External Knowledge Graph node reference (for future KG integration)

New sub-keys introduced via TIPs will not break existing implementations, as the Indexer is designed to store unrecognized tag keys without error.

---

## 3. Full Event Example (v0.1.2)

```json
{
  "kind": 1042,
  "content": "雑草の生え方が場所によって違うのはなぜ？",
  "tags": [
    ["context",    "climate_zone",    "warm-temperate"],
    ["context",    "soil_type",       "volcanic_ash"],
    ["context",    "farming_context", "no_till"],
    ["context",    "crop_family",     "solanaceae"],
    ["relationship", "microclimate",  "weed_flora"],
    ["phase",      "intermediate"],
    ["trigger",    "farmer_observation", "weed_change"],

    ["dsl:model",  "m1", "climate_model"],
    ["dsl:var",    "m1", "microclimate",  "independent"],
    ["dsl:var",    "m1", "weed_flora",    "dependent"],
    ["dsl:rel",    "m1", "microclimate",  "weed_flora"],

    ["dsl:model",  "m2", "soil_model"],
    ["dsl:var",    "m2", "soil_nutrients", "independent"],
    ["dsl:var",    "m2", "weed_flora",     "dependent"],
    ["dsl:rel",    "m2", "soil_nutrients", "weed_flora"]
  ]
}
```

---

## 4. Future Vocabulary Extensibility (TIPs)

The vocabulary defined in this document is for the initial version (v0.1.0/v0.1.2). As the system operates, unknown relationships and new contexts will be required.

The Toitoi project envisions a protocol governance where the vocabulary is expanded by the community, rather than dictated exclusively by a central administrator.

1. **Allowance of Free Description:**
   If the local AI discovers a new relationship that does not fit the existing vocabulary, it can temporarily tag and send a new string (e.g., `soil_fungal_ratio`). For DSL sub-keys, new keys prefixed with `dsl:` may be proposed and used provisionally.
2. **Standardization via Toitoi Improvement Proposals (TIPs):**
   When a new vocabulary word or DSL sub-key is recognized as useful by the community, a "Toitoi Improvement Proposal (TIPs)" can be made on GitHub. Upon reaching a consensus, this schema definition document will be updated. In this way, the system itself co-evolves alongside the evolution of agroecological knowledge.

---

---

# Toitoi プロトコル・スキーマ仕様書：境界対象としてのデータ構造

**バージョン: 0.1.2 (DSL Extension)**

本ドキュメントは、デジタル・アグロエコロジー・コモンズ「Toitoi」においてネットワーク上を流通する唯一のデータ単位である **「問い（Nostr Event Kind: 1042）」** の厳密なデータスキーマと標準語彙（Standard Vocabulary）を定義するものです。

この仕様は、エッジAI（送信側）、インデクサー（受信・解釈側）、フロントエンド（表示側）のすべてのモジュール開発者が準拠すべき共通プロトコル（憲法）として機能します。

**バージョン: 0.1.2**　｜　前バージョン (v0.1.1) からの主なアップデート：

* §2.6：`dsl` タグ群の定義を追加——自然言語による問い（バウンダリー・オブジェクト）の機械可読な意味的射影を表現する新しい構造層。
* §1：問いの二層構造（バウンダリー・オブジェクト層 + DSL層）を概念モデルとして明文化。

---

## 1. データ構造の基本思想

本システムにおける `tags` 配列は、単なる検索用キーワードではありません。生データを隠蔽しつつ、他者が自身の農地に翻訳するための「境界対象（バウンダリー・オブジェクト）」として機能させるためのメタデータ構造です。

### 1.1 問いの二層構造

バージョン0.1.2より、Toitoiにおける「問い」は**二層構造**として理解されます。

```
【第1層】 バウンダリー・オブジェクト ── 自然言語（contentフィールド）
                  ↓  意味的射影
【第2層】 DSL ────────────────────── 構造化・計算可能な形式（dslタグ群）
```

**第1層（バウンダリー・オブジェクト）：** `content` フィールドに格納された自然言語の問いです。農家・研究者・AIがそれぞれ異なる文脈から読み解けるよう、意図的に多義性を残したものです。これは問いの「社会的インターフェース」です。

**第2層（DSL）：** バウンダリー・オブジェクトの「解釈モデル」を `dsl` タグとして構造化したものです。DSLは「正解」ではなく「ひとつの意味的射影」です。同一の問いに対して複数のDSLが共存でき、それぞれが異なるモデル（例：気候モデル vs. 土壌モデル）を表します。これは問いの「計算的コア」です。

> **設計原則：** DSLはバウンダリー・オブジェクトの「射影」であり、代替ではありません。自然言語の問いは常に一次的な表現として保持されなければなりません。

本システムは引き続き、既存の4層タグ構造（文脈・関係性・熟達フェーズ・系譜）でアグロエコロジーの知を記述します。これに加えて、バージョン0.1.2からは機械推論と将来的なナレッジグラフ統合を目的とした第5の構造層として「DSL」が加わります。

---

## 2. タグ構造のディープ・リファレンスと標準語彙

### 2.1 `context`（属地性のメタデータ）

**役割：** 生データの代わりに、その農地の「生態学的・翻訳的文脈」を分類・抽象化して表現します。

* **フォーマット:** `["context", "<分類キー>", "<値>"]`
* **分類キーと推奨ボキャブラリー（v0.1.0）:**

  + **① 気候帯 (`climate_zone`):** `subarctic` / `cool-temperate` / `warm-temperate` / `subtropical`
  + **② 土壌タイプ (`soil_type`):** `volcanic_ash` / `andisol` / `alluvial` / `sandy` / `clay` / `peat`
  + **③ 栽培環境・農法 (`farming_context`):** `open_field` / `greenhouse_unheated` / `greenhouse_heated` / `no_till` / `organic` / `conventional`
  + **④ 対象作物群 (`crop_family`):** `solanaceae` / `brassica` / `legume` / `cucurbitaceae` / `poaceae`

### 2.2 `relationship`（観察カテゴリ・翻訳の焦点）

**役割：** 農家やAIが「今、生態系のどの非線形な相互作用に注目しているか」を明示します。

* **フォーマット:** `["relationship", "<要素A>", "<要素B>"]`
  *(AとBの順序はインデクサー側で同一視)*
* **要素の推奨ボキャブラリー:**
  + 物理・環境：`soil_moisture` / `microclimate` / `soil_physical`
  + 生物的：`weed_flora` / `pest` / `natural_enemy` / `soil_microbe` / `crop_vitality`
  + 化学的：`nutrient_cycle`

### 2.3 `phase`（熟達の段階）

**フォーマット:** `["phase", "<レベル>"]`　　値：`beginner` / `intermediate` / `expert`

### 2.4 `e`タグ（Lineage：問いの系譜）

**フォーマット:** `["e", "<親のイベントID>", "<リレーURL>", "<マーカー>"]`
マーカー：`derived_from`（翻訳・派生） / `synthesis`（統合・結合）

### 2.5 `trigger` タグ（問いの起点）— 任意

**フォーマット:** `["trigger", "<カテゴリ>", "<値>"]`

| カテゴリ | 値の例 | 説明 |
| --- | --- | --- |
| `sensor_anomaly` | `soil_moisture`, `temperature` | センサー値の閾値超過・異常パターン |
| `farmer_observation` | `weed_change`, `pest_found` | 農家の目視観察 |
| `periodic_review` | `weekly`, `seasonal` | 定期スケジュール |
| `external_event` | `heavy_rain`, `frost` | 気象・環境イベント |

### 2.6 `dsl` タグ群（DSL層——問いの構造化射影）— 任意

**役割：** 自然言語のバウンダリー・オブジェクトを補完するかたちで、問いを機械計算可能な構造として表現します。1つのDSLタグセットが「解釈モデル」1つを構成します。`<model_id>` を変えて繰り返すことで、単一のイベントに複数の解釈モデルを共存させることができます。

**重要な設計上の制約：**

* DSLタグは**任意（optional）**です。DSLタグを持たない問いも完全に有効であり、通常通りインデックスされます。
* DSLタグは**権威的ではありません**。バウンダリー・オブジェクトの「ひとつの解釈モデル」であり、確定的な意味を表すものではありません。
* 単一のイベントは、異なる `<model_id>` を持つ**複数のDSLセットを持つことができます**。モデル間の競合は意図的なものであり、解釈の多様性を表します。
* インデクサーは、取り込み時にDSLタグを変更・統合してはなりません。受け取ったまま保存します。

#### 2.6.1 タグフォーマットの概要

`dsl` 系タグはすべて以下の構造を共有します：

```
["dsl:<サブキー>", "<model_id>", "<値1>", "<値2（任意）>"]
```

| 位置 | 役割 |
| --- | --- |
| `dsl:<サブキー>` | DSL名前空間内のタグ種別 |
| `<model_id>` | タグをひとつの解釈モデルにグルーピングする識別子（例：`m1`、`climate_model`） |
| `<値1>` | 主要な値 |
| `<値2>` | 副次的な値（任意。関係性のペアなどに使用） |

#### 2.6.2 サブキー定義

| サブキー | 意味 | 値1 | 値2 |
| --- | --- | --- | --- |
| `dsl:model` | 名前付き解釈モデルの宣言 | モデル名（例：`climate_model`） | *(省略)* |
| `dsl:var` | 変数とその役割の宣言 | 変数名（例：`microclimate`） | 役割：`independent` \| `dependent` \| `mediator` \| `moderator` |
| `dsl:rel` | 2変数間の因果・相関関係の宣言 | 起点変数 | 終点変数 |
| `dsl:meta` | モデルレベルの任意メタデータ | キー | 値 |

**変数の役割定義：**

| 役割 | 意味 |
| --- | --- |
| `independent` | 仮説的な原因変数・説明変数 |
| `dependent` | 問いの対象となる結果変数・応答変数 |
| `mediator` | 因果連鎖の中間変数（A → M → B） |
| `moderator` | 関係性の強さや方向を条件付ける変数 |

#### 2.6.3 完全な使用例——単一DSL

自然言語の問い（`content` フィールド）：

```
雑草の生え方が場所によって違うのはなぜ？
```

気候解釈モデルを表すDSLタグ群：

```json
["dsl:model", "m1", "climate_model"],
["dsl:var",   "m1", "microclimate",  "independent"],
["dsl:var",   "m1", "weed_flora",    "dependent"],
["dsl:rel",   "m1", "microclimate",  "weed_flora"]
```

#### 2.6.4 完全な使用例——複数DSL（解釈の多様性）

同一の自然言語の問いを、複数の解釈モデルへ同時に射影できます：

```json
["dsl:model", "m1", "climate_model"],
["dsl:var",   "m1", "microclimate",  "independent"],
["dsl:var",   "m1", "weed_flora",    "dependent"],
["dsl:rel",   "m1", "microclimate",  "weed_flora"],

["dsl:model", "m2", "soil_model"],
["dsl:var",   "m2", "soil_nutrients", "independent"],
["dsl:var",   "m2", "weed_flora",     "dependent"],
["dsl:rel",   "m2", "soil_nutrients", "weed_flora"]
```

インデクサーは両モデルを統合せずそのまま保存し、解釈の多様性を問いの第一級の特性として扱います。

#### 2.6.5 拡張例——媒介変数（Mediator）

因果連鎖（A → M → B）を仮説とする問いの場合：

```json
["dsl:model", "m1", "nutrient_chain_model"],
["dsl:var",   "m1", "soil_microbe",    "independent"],
["dsl:var",   "m1", "nutrient_cycle",  "mediator"],
["dsl:var",   "m1", "crop_vitality",   "dependent"],
["dsl:rel",   "m1", "soil_microbe",    "nutrient_cycle"],
["dsl:rel",   "m1", "nutrient_cycle",  "crop_vitality"]
```

#### 2.6.6 インデクサーDBとの対応関係

`dsl` タグ群は、既存の `Tag` テーブルにスキーマ変更なしで格納されます：

| DBカラム | 格納される値 |
| --- | --- |
| `tagKey` | `dsl:model` / `dsl:var` / `dsl:rel` / `dsl:meta` |
| `tagValue1` | `<model_id>` |
| `tagValue2` | `<値1>`（変数名・モデル名・起点変数など） |

`dsl:var` の役割（`independent` 等）や `dsl:rel` の終点変数など、`tagValue2` に収まらない第2の値は、**同一の `tagKey` と `model_id` を持つ2行目の Tag レコード**として格納します。これにより、スキーマ変更なしで完全な情報を保持できます。

> **インデクサー実装者へ：** DSLタグの絞り込みには、既存の `EXISTS` サブクエリパターン（`INDEXER_API_SETUP.md §5.2` 参照）をそのまま流用できます。例えば `tagKey = 'dsl:var' AND tagValue1 = 'm1' AND tagValue2 = 'microclimate'` のように `model_id` を `tagValue1` として使うことで、モデル単位の絞り込みが可能です。

#### 2.6.7 DSLサブキーの将来的な拡張性

現在のサブキーセット（`model`・`var`・`rel`・`meta`）は変数-関係性モデリングをカバーします。システムの成熟に応じて、TIPs（§4参照）を通じて以下のような新サブキーの導入が検討されます：

* **`dsl:constraint`** — モデルの境界条件・前提条件
* **`dsl:confidence`** — モデルの確信度・エビデンス強度（AI生成DSL向け）
* **`dsl:graph_link`** — 外部ナレッジグラフノードへの参照（KG統合フェーズ向け）

TIPs経由で導入された新サブキーは、インデクサーが未知のtagKeyを無害に保存する設計のため、既存実装を壊しません。

---

## 3. イベント全体の記述例（v0.1.2）

```json
{
  "kind": 1042,
  "content": "雑草の生え方が場所によって違うのはなぜ？",
  "tags": [
    ["context",      "climate_zone",       "warm-temperate"],
    ["context",      "soil_type",          "volcanic_ash"],
    ["context",      "farming_context",    "no_till"],
    ["context",      "crop_family",        "solanaceae"],
    ["relationship", "microclimate",       "weed_flora"],
    ["phase",        "intermediate"],
    ["trigger",      "farmer_observation", "weed_change"],

    ["dsl:model",    "m1", "climate_model"],
    ["dsl:var",      "m1", "microclimate",   "independent"],
    ["dsl:var",      "m1", "weed_flora",     "dependent"],
    ["dsl:rel",      "m1", "microclimate",   "weed_flora"],

    ["dsl:model",    "m2", "soil_model"],
    ["dsl:var",      "m2", "soil_nutrients", "independent"],
    ["dsl:var",      "m2", "weed_flora",     "dependent"],
    ["dsl:rel",      "m2", "soil_nutrients", "weed_flora"]
  ]
}
```

---

## 4. 今後のボキャブラリー拡張性（TIPs）

本ドキュメントで定義した語彙は初期バージョン（v0.1.0〜v0.1.2）のものです。システムが稼働するにつれ、未知の関係性や新たなコンテキスト、DSLの表現力拡張が必要になります。

Toitoiプロジェクトでは、中央管理者が語彙を独占的に決定するのではなく、コミュニティ主導で語彙を拡張するプロトコル・ガバナンスを想定しています。

1. **自由記述の許容：**
   ローカルAIは既存語彙に当てはまらない関係性を発見した場合、暫定的に新しい文字列をタグ付けして送信できます。DSLサブキーについても、`dsl:` プレフィックスを持つ新しいキーを暫定的に提案・使用できます。

2. **Toitoi Improvement Proposals (TIPs) による標準化：**
   ある新出語彙またはDSLサブキーが有用であるとコミュニティで認知された場合、GitHub上で標準語彙への追加提案（TIPs）を行い、合意形成を経て本スキーマ定義書がアップデートされます。これにより、アグロエコロジーの知の進化に合わせてシステム自身も共進化を遂げます。

---

*本ドキュメントはデジタル・アグロエコロジー・コモンズ推進プロジェクトの一環として作成されました。*
*v0.1.2 — 2026年5月*