# Toitoi Protocol Schema Specification
**Data Structure as a Boundary Object (Version 1.1 - Standard Vocabulary)**

*[日本語は下に続きます]*

This document defines the strict data schema and Standard Vocabulary for **"Inquiries" (Nostr Event Kind: 11042)**, which is the sole unit of data circulating on the network in the Toitoi Digital Agroecology Commons.

This specification serves as the common protocol (constitution) that all module developers—Edge AI (sender), Indexer (receiver/interpreter), and Frontend (display)—must adhere to.

**Version: 1.1** | Main updates from the previous version (v1.0):
* §2.5: Added `trigger` tag definition (sync with ARCHITECTURE §3.1 and EDGE_AI_SETUP §3).

---

## 1. Basic Philosophy of the Data Structure

The `tags` array in this system is not merely for search keywords. It is a metadata structure designed to conceal raw data while functioning as a "Boundary Object" that allows others to translate the data into their own farmland.

The system describes agroecological knowledge in a four-layer structure: "Context," "Relationship," "Phase (of mastery)," and "Lineage."

---

## 2. Deep Reference and Standard Vocabulary of the Tag Structure

### 2.1 `context` (Metadata of Locality)
**Role:** Instead of using raw data (such as absolute latitude/longitude or specific moisture percentages), this tag categorizes and abstracts the "ecological and translational context" of the farmland. It functions as a key for the Indexer to match farmers who, despite being far apart, have similar ecological conditions.

*   **Format:** `["context", "<category_key>", "<value>"]`
*   **Category Keys and Recommended Vocabulary (v1.0):**

    *   **1. Climate Zone (`climate_zone`)**
        *   `subarctic` 
        *   `cool-temperate`
        *   `warm-temperate`
        *   `subtropical`

    *   **2. Soil Type (`soil_type`)**
        The most important context determining nutrient retention and drainage.
        *   `volcanic_ash` / `andisol` (High nutrient retention, but poor phosphorus availability)
        *   `alluvial` (Fertile soil along river basins)
        *   `sandy` (Good drainage, low nutrient retention)
        *   `clay` (High water/nutrient retention, poor physical properties)
        *   `peat`

    *   **3. Farming Context/Methods (`farming_context`)**
        *   `open_field` 
        *   `greenhouse_unheated`
        *   `greenhouse_heated`
        *   `no_till`
        *   `organic` (No synthetic pesticides/fertilizers)
        *   `conventional`

    *   **4. Crop Family (`crop_family`)**
        Described at the "Family" level rather than specific variety names, abstracting common pest risks and replant failures.
        *   `solanaceae` (Tomatoes, eggplants, peppers, etc.)
        *   `brassica` (Cabbages, radishes, broccoli, etc.)
        *   `legume` (Soybeans, peas, etc. - important for nitrogen fixation)
        *   `cucurbitaceae` (Cucumbers, pumpkins, etc.)
        *   `poaceae` (Rice, corn, green manure grasses, etc.)

### 2.2 `relationship` (Observation Category / Focus of Translation)
**Role:** Clarifies which non-linear interactions in the ecosystem the farmer or AI is currently focusing on (suspecting a chain of translation). This serves as the "common language" in the commons under diverse environments.

*   **Format:** `["relationship", "<Element_A>", "<Element_B>"]`
    *(Note: To avoid directionality, the order of A and B is treated as identical by the Indexer.)*
*   **Recommended Vocabulary for Elements:**
    *   **Physical/Environmental Elements:**
        `soil_moisture` (Waterlogging, over-drying, etc.)
        `microclimate` (Local ventilation, temperature differences, sunlight, etc.)
        `soil_physical` (Aggregate structure, hardness, drainage, etc.)
    *   **Biological Elements:**
        `weed_flora` (Dominant weed types, height, etc.)
        `pest` (Feeding damage, outbreak patterns, etc.)
        `natural_enemy` (Native natural enemies, birds, etc.)
        `soil_microbe` (Mycorrhizal fungi, actinomycetes, pathogens, etc.)
        `crop_vitality` (Leaf color, root development, etc.)
    *   **Chemical Elements:**
        `nutrient_cycle` (Nitrogen availability, trace elements, etc.)

### 2.3 `phase` (Phase of Mastery / Scaffolding Targeting)
**Role:** Metadatas the level of a farmer's cognitive proficiency (ecological intuition) this "inquiry" is suitable to stimulate. The Indexer and local AI use this to control cognitive load appropriately.

*   **Format:** `["phase", "<level>"]`
*   **Level Definitions:**
    *   `beginner`: Inquiries prompting observation of single events or visible physical changes.
    *   `intermediate`: Inquiries prompting inferences about invisible factors (nutrients, etc.) or relationships between multiple elements.
    *   `expert`: Inquiries addressing high-level interactions overseeing the entire ecosystem or adaptation at the system level.

### 2.4 `e` Tag (Lineage / Chain of Translation)
**Role:** Engraves the "Chain of Translation" in Actor-Network Theory (ANT) onto the system as a graph (tree structure). If the inquiry is a completely new, spontaneous one (Genesis Inquiry), this tag is omitted.

*   **Format:** `["e", "<parent_event_id>", "<relay_url>", "<marker>"]`
*   **Strict Definitions of Markers (Relationship Types):**
    *   `derived_from`: A new inquiry generated as a result of applying/translating someone else's inquiry into the specific context of one's own farmland.
    *   `synthesis`: A higher-dimensional new hypothesis generated by linking multiple inquiries of different lineages locally. (In this case, multiple independent `e` tags are listed in parallel for the parent events.)

### 2.5 `trigger` Tag (Origin of the Inquiry) — Optional

**Role:** Records the direct trigger that caused the Edge AI or farmer to generate this inquiry. This enables the Indexer and Frontend to later trace back "what observation gave rise to this question," making the process of inquiry generation itself a traceable part of the knowledge lineage. If the inquiry arose spontaneously from the farmer's intuition rather than a specific event, this tag is omitted.

*   **Format:** `["trigger", "<category>", "<value>"]`
*   **Recommended Values:**

    | category | value examples | Description |
    |---|---|---|
    | `sensor_anomaly` | `soil_moisture`, `temperature`, `illuminance` | A sensor reading crossed a threshold or showed an abnormal pattern |
    | `farmer_observation` | `weed_change`, `pest_found`, `crop_symptom` | A visual observation recorded by the farmer |
    | `periodic_review` | `weekly`, `seasonal` | Routine scheduled inquiry generation |
    | `external_event` | `heavy_rain`, `frost`, `drought` | A weather or environmental event |

*   **Implementation note:** In automated pipelines, it is recommended that the Edge AI automatically appends this tag when a sensor anomaly is the trigger for inquiry generation.

---

## 3. Future Vocabulary Extensibility (TIPs)

The vocabulary defined in this document is for the initial version (v1.0). As the system operates, unknown relationships and new contexts will be required.

The Toitoi project envisions a protocol governance where the vocabulary is expanded by the community, rather than dictated exclusively by a central administrator.

1.  **Allowance of Free Description:**
    If the local AI discovers a new relationship that does not fit the existing vocabulary, it can temporarily tag and send a new string (e.g., `soil_fungal_ratio`).
2.  **Standardization via Toitoi Improvement Proposals (TIPs):**
    When a new vocabulary word is recognized as useful by the community, a "Toitoi Improvement Proposal (TIPs)" can be made on GitHub. Upon reaching a consensus, this schema definition document will be updated. In this way, the system itself co-evolves alongside the evolution of agroecological knowledge.

---

# Toitoi プロトコル・スキーマ仕様書：境界対象としてのデータ構造
**バージョン: 1.1 (Standard Vocabulary)**

本ドキュメントは、デジタル・アグロエコロジー・コモンズ「Toitoi」においてネットワーク上を流通する唯一のデータ単位である **「問い（Nostr Event Kind: 11042）」** の厳密なデータスキーマと標準語彙（Standard Vocabulary）を定義するものです。

この仕様は、エッジAI（送信側）、インデクサー（受信・解釈側）、フロントエンド（表示側）のすべてのモジュール開発者が準拠すべき共通プロトコル（憲法）として機能します。

**バージョン: 1.1**　｜　前バージョン (v1.0) からの主なアップデート：
* §2.5：`trigger` タグの定義を追加（ARCHITECTURE §3.1 および EDGE_AI_SETUP §3 との同期）。

---

## 1. データ構造の基本思想

本システムにおける `tags` 配列は、単なる検索用キーワードではありません。生データを隠蔽しつつ、他者が自身の農地に翻訳するための「境界対象（バウンダリー・オブジェクト）」として機能させるためのメタデータ構造です。

システムは「文脈（Context）」「関係性（Relationship）」「熟達フェーズ（Phase）」「系譜（Lineage）」の4層構造でアグロエコロジーの知を記述します。

---

## 2. タグ構造のディープ・リファレンスと標準語彙

### 2.1 `context`（属地性のメタデータ）
**役割：** 生データ（絶対的な緯度経度、水分量〇〇%など）の代わりに、その農地の「生態学的・翻訳的文脈」を分類・抽象化して表現します。インデクサーが「遠く離れているが、生態学的な条件が似ている農家」をマッチングさせるためのキーとして機能します。

*   **フォーマット:** `["context", "<分類キー>", "<値>"]`
*   **分類キーと推奨ボキャブラリー（v1.0）:**

    *   **① 気候帯 (`climate_zone`)**
        *   `subarctic` (亜寒帯 / 例：北海道など)
        *   `cool-temperate` (冷温帯 / 例：東北・高冷地など)
        *   `warm-temperate` (暖温帯 / 例：関東〜九州の平野部など)
        *   `subtropical` (亜熱帯 / 例：沖縄・南西諸島など)

    *   **② 土壌タイプ (`soil_type`)**
        養分保持力や水はけを決定づける最重要コンテキスト。
        *   `volcanic_ash` / `andisol` (火山灰土・黒ボク土 / 保肥力は高いがリン酸が効きにくい)
        *   `alluvial` (沖積土・河川流域の肥沃な土)
        *   `sandy` (砂土 / 水はけは良いが保肥力が低い)
        *   `clay` (粘土質 / 保水・保肥力は高いが物理性が悪い)
        *   `peat` (泥炭土)

    *   **③ 栽培環境・農法 (`farming_context`)**
        *   `open_field` (露地栽培)
        *   `greenhouse_unheated` (無加温ハウス)
        *   `greenhouse_heated` (加温ハウス)
        *   `no_till` (不耕起栽培)
        *   `organic` (有機栽培 / 化学合成農薬・肥料不使用)
        *   `conventional` (慣行栽培)

    *   **④ 対象作物群 (`crop_family`)**
        品種名ではなく「科（Family）」レベルで記述し、連作障害や共通の害虫リスクを抽象化します。
        *   `solanaceae` (ナス科 / トマト、ナス、ピーマン等)
        *   `brassica` (アブラナ科 / キャベツ、大根、ブロッコリー等)
        *   `legume` (マメ科 / 大豆、エンドウ等・窒素固定の文脈)
        *   `cucurbitaceae` (ウリ科 / キュウリ、カボチャ等)
        *   `poaceae` (イネ科 / イネ、トウモロコシ、緑肥ムギ類等)

### 2.2 `relationship`（観察カテゴリ・翻訳の焦点）
**役割：** 農家やAIが「今、生態系のどの非線形な相互作用に注目して（翻訳の連鎖を疑って）いるか」を明示します。多様な環境下でのコモンズにおける「共通言語」となります。

*   **フォーマット:** `["relationship", "<要素A>", "<要素B>"]`
    *(※方向性を持たせないため、AとBの順序はインデクサー側で同一視されます)*
*   **要素（Element）の推奨ボキャブラリー:**
    *   **物理・環境的要素:**
        `soil_moisture` (土壌水分 / 滞水・過乾燥など)
        `microclimate` (微気候 / 局所的な風通し・温度差・日照など)
        `soil_physical` (土壌物理性 / 団粒構造・硬さ・水はけなど)
    *   **生物的要素:**
        `weed_flora` (雑草相 / 優占する雑草の種類・背丈など)
        `pest` (害虫 / 食害・発生パターン)
        `natural_enemy` (天敵 / 土着天敵、鳥類など)
        `soil_microbe` (土壌微生物 / 菌根菌、放線菌、病原菌など)
        `crop_vitality` (作物の活力 / 葉色、根の張りなど)
    *   **化学的要素:**
        `nutrient_cycle` (養分循環 / 窒素の効き、微量要素など)

### 2.3 `phase`（熟達の段階：足場掛けのターゲティング）
**役割：** この「問い」がどの習熟度の農家の認知を刺激するのに適しているかをメタデータ化します。インデクサーやローカルAIはこれを用いて適切な認知負荷の制御を行います。

*   **フォーマット:** `["phase", "<レベル>"]`
*   **レベル定義:**
    *   `beginner` (初心者): 単一の事象や物理的な変化への観察を促す問い。
    *   `intermediate` (中級者): 複数の要素の関係性や、目に見えない要因（養分等）への推論を促す問い。
    *   `expert` (熟練者): 生態系全体を俯瞰する高度な相互作用や、システムレベルでの適応を問うもの。

### 2.4 `e`タグ（Lineage：問いの系譜・翻訳の連鎖）
**役割：** アクター・ネットワーク理論（ANT）における「翻訳の連鎖」をシステム上にグラフ（ツリー構造）として刻印します。完全に新規の自発的な問い（Genesis Inquiry）の場合、このタグは付与されません。

*   **フォーマット:** `["e", "<親のイベントID>", "<リレーURL>", "<マーカー>"]`
*   **マーカー（関係性の種類）の厳密な定義:**
    *   `derived_from` (派生): 他者の問いを自分の農地（コンテキスト）に適用・翻訳した結果生じた、新たな問い。
    *   `synthesis` (結合・統合): 複数の異なる系統の問いをローカルで結びつけ、より高次元の新たな仮説を生み出した場合。（この場合、親イベントに対して独立した `e` タグを複数並列させます）

### 2.5 `trigger` タグ（問いの起点）— 任意

**役割：** エッジAIまたは農家がこの問いを生成した直接的な起点を記録します。インデクサーやフロントエンドが「何の観察からこの問いが生まれたか」を遡れるようにし、問い生成のプロセス自体も知識の系譜として追跡可能にします。農家の直感による自発的な問いなど、特定の起点がない場合はタグを省略します。

*   **フォーマット:** `["trigger", "<カテゴリ>", "<値>"]`
*   **推奨値：**

    | カテゴリ | 値の例 | 説明 |
    |---|---|---|
    | `sensor_anomaly` | `soil_moisture`, `temperature`, `illuminance` | センサー値が閾値を超えた、または異常なパターンを示した |
    | `farmer_observation` | `weed_change`, `pest_found`, `crop_symptom` | 農家が記録した目視による観察 |
    | `periodic_review` | `weekly`, `seasonal` | 定期的なスケジュールによる問い生成 |
    | `external_event` | `heavy_rain`, `frost`, `drought` | 気象・環境イベントの発生 |

*   **実装上の注意：** 自動化パイプラインでは、センサー異常が問いの起点となった場合に本タグを自動付与することを推奨します。

---

## 3. 今後のボキャブラリー拡張性（TIPs）

本ドキュメントで定義した語彙は初期バージョン（v1.0）のものです。システムが稼働するにつれ、未知の関係性や新たなコンテキストが必要になります。

Toitoiプロジェクトでは、中央管理者が語彙を独占的に決定するのではなく、コミュニティ主導で語彙を拡張するプロトコル・ガバナンスを想定しています。

1.  **自由記述の許容:**
    ローカルAIは、既存の語彙に当てはまらない新しい関係性を発見した場合、暫定的に新しい文字列（例: `soil_fungal_ratio`）をタグ付けして送信することができます。
2.  **Toitoi Improvement Proposals (TIPs) による標準化:**
    ある新出語彙が有用であるとコミュニティで認知された場合、GitHub上で「標準語彙への追加提案（TIPs）」を行い、合意形成を経て本スキーマ定義書がアップデートされます。これにより、アグロエコロジーの知の進化に合わせてシステム自身も共進化を遂げます。
