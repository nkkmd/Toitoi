# Toitoi 標準語彙リスト（暫定）

**Version: 0.1.0** | **Status: evolving** | **Last updated: 2026-05-19**

本ドキュメントは、`NOSTR_INQUIRY_SCHEMA.md` と `CANONICAL_EVENT.md` に基づく標準語彙（Controlled Vocabulary）を、実装者・エッジAI開発者・コントリビューターが参照しやすい形に整理したリファレンスです。

> **暫定リストについて:** 本語彙リストはシステムの初期バージョン（v0.1.0）のものです。未知の関係性・新たなコンテキストが発見された場合、エッジAIは暫定的に新しい文字列をタグ付けして送信できます。有用な新出語彙はコミュニティによる TIPs（Toitoi Improvement Proposals）を通じて本リストに追加されます（「4. 語彙拡張プロセス」参照）。

---

## 1. `context` タグの語彙

**フォーマット:** `["context", "<category_key>", "<value>"]`

**役割:** 生データ（緯度経度・センサー絶対値等）を送信せず、農地の「生態学的・翻訳的文脈」を抽象化・カテゴリ化するメタデータです。インデクサーが遠隔地の農家を生態条件で照合するためのキーとして機能します。

---

### 1.1 気候帯 `climate_zone`

| 値 | 説明 |
|---|---|
| `subarctic` | 亜寒帯 |
| `cool-temperate` | 冷温帯 |
| `warm-temperate` | 暖温帯 |
| `subtropical` | 亜熱帯 |

---

### 1.2 土壌タイプ `soil_type`

**役割:** 養分保持・排水性を規定する最重要コンテキスト。

| 値 | 別名 | 説明 |
|---|---|---|
| `volcanic_ash` | `andisol` | 黒ボク土。養分保持力が高いがリン酸固定が起きやすい |
| `alluvial` | — | 沖積土。河川流域の肥沃な土壌 |
| `sandy` | — | 砂土。排水性が高く養分保持力が低い |
| `clay` | — | 粘土質。保水・保肥力が高いが物理性が悪くなりやすい |
| `peat` | — | 泥炭土 |

> **注:** `volcanic_ash` と `andisol` は同義として扱われます。エッジAIは `volcanic_ash` を推奨標準値として使用してください。

---

### 1.3 営農形態 `farming_context`

| 値 | 説明 |
|---|---|
| `open_field` | 露地栽培 |
| `greenhouse_unheated` | 無加温ハウス |
| `greenhouse_heated` | 加温ハウス |
| `no_till` | 不耕起栽培 |
| `organic` | 有機農業（合成農薬・化学肥料不使用） |
| `conventional` | 慣行農業 |

---

### 1.4 対象作物群 `crop_family`

**役割:** 特定の品種名ではなく「科」レベルで記述することで、病害リスク・連作障害・害虫-天敵関係などの共通性を抽象化します。異なる圃場・地域間で「同じ問い」を照合するための翻訳の単位です。

**命名規則:** 値は原則として**植物学上の科名（英語）をスネークケースで表記**します（`Apiaceae` → `apiaceae`）。ただし日本農業で慣習的に別名が広く使われる科（例：アブラナ科 = `Brassicaceae` だが `brassica` が通用）については、慣習名を採用しています。新しい科を暫定追加する場合は「命名ガイドライン」（下記）に従ってください。

---

#### 野菜・畑作物

| 値 | 科名（学名） | 代表作物 | 農業上の特徴 |
|---|---|---|---|
| `solanaceae` | ナス科 Solanaceae | トマト・ナス・ピーマン・ジャガイモ・トウガラシ | 連作障害が顕著。青枯病・疫病リスク。同科内で害虫が共通しやすい |
| `brassica` | アブラナ科 Brassicaceae | キャベツ・ダイコン・ブロッコリー・ハクサイ・コマツナ・カブ・ルッコラ | アブラムシ・コナガ・モンシロチョウが集中。根こぶ病リスク。緑肥（からし菜等）にも使用 |
| `legume` | マメ科 Fabaceae | 大豆・エダマメ・えんどう・インゲン・ソラマメ・ラッカセイ・クローバー | 根粒菌による窒素固定。緑肥・輪作に重要。アグロエコロジーの要 |
| `cucurbitaceae` | ウリ科 Cucurbitaceae | キュウリ・カボチャ・スイカ・メロン・ゴーヤ・ズッキーニ | ウリハムシ・うどんこ病リスク。蔓性作物で管理特性が共通 |
| `apiaceae` | セリ科 Apiaceae | ニンジン・パセリ・セロリ・ミツバ・フェンネル・コリアンダー | キアゲハ幼虫の食草。アレロパシー効果あり。ハーブ類との共通点が多い |
| `asteraceae` | キク科 Asteraceae | レタス・ゴボウ・チコリ・フキ・シュンギク・カモミール・ヒマワリ | 多様性が高い科。ヒマワリは緑肥・ミツバチ誘引に使用。コンパニオンプランツとして活用されやすい |
| `amaranthaceae` | ヒユ科 Amaranthaceae | ホウレンソウ・テンサイ・アマランサス・キノア・フダンソウ | 旧アカザ科を含む。ホウレンソウは萎凋病・べと病リスク。テンサイは糖分含量が高く輪作に重要 |
| `convolvulaceae` | ヒルガオ科 Convolvulaceae | サツマイモ | 塊根形成。土壌物理性改善効果あり。連作でも比較的安定 |
| `dioscoreaceae` | ヤマノイモ科 Dioscoreaceae | ヤマイモ・ナガイモ・ジネンジョ | 塊茎作物。長期栽培・深耕が必要。土壌線虫リスク |

---

#### 穀物・イネ科

| 値 | 科名（学名） | 代表作物 | 農業上の特徴 |
|---|---|---|---|
| `poaceae` | イネ科 Poaceae | 水稲・小麦・大麦・トウモロコシ・ソルガム・ライ麦・エン麦・緑肥草類 | 最重要主食作物群。緑肥（エン麦・ライ麦・ソルガム）は土壌有機物補給に重要。イネ科雑草との識別も課題 |

---

#### 果樹・樹木作物

| 値 | 科名（学名） | 代表作物 | 農業上の特徴 |
|---|---|---|---|
| `rosaceae` | バラ科 Rosaceae | リンゴ・ナシ・モモ・サクランボ・ウメ・イチゴ | 火傷病・うどんこ病リスク。アブラムシ・カイガラムシが共通。花粉媒介者依存性が高い |
| `rutaceae` | ミカン科 Rutaceae | ウンシュウミカン・レモン・ユズ・カボス・ナツミカン | カイガラムシ・ハダニリスク。アゲハ類の食草。かいよう病に注意 |
| `vitaceae` | ブドウ科 Vitaceae | ブドウ | べと病・灰色かび病リスク。棚栽培特有の微気候が生じる |
| `ericaceae` | ツツジ科 Ericaceae | ブルーベリー・クランベリー | 強酸性土壌適応。pH管理が重要。菌根菌依存性が高い |
| `actinidiaceae` | マタタビ科 Actinidiaceae | キウイフルーツ | 雌雄異株。受粉管理が必要。カメムシリスク |
| `moraceae` | クワ科 Moraceae | イチジク | カミキリムシ・疫病リスク。乾燥に比較的強い |

---

#### 根菜・芋類

| 値 | 科名（学名） | 代表作物 | 農業上の特徴 |
|---|---|---|---|
| `araceae` | サトイモ科 Araceae | サトイモ・コンニャク | 高湿度を好む。土壌病害リスク。連作で収量低下しやすい |
| `zingiberaceae` | ショウガ科 Zingiberaceae | ショウガ・ウコン | 軟腐病・根茎腐敗病リスク。連作不可。遮光管理が重要 |

---

#### 薬草・香草・花卉

| 値 | 科名（学名） | 代表作物 | 農業上の特徴 |
|---|---|---|---|
| `lamiaceae` | シソ科 Lamiaceae | シソ・バジル・ミント・ラベンダー・ローズマリー・タイム | 精油成分による害虫忌避効果。コンパニオンプランツとして広く活用。ポリネーター誘引 |
| `alliaceae` | ヒガンバナ科（ネギ亜科）Amaryllidaceae | タマネギ・ネギ・ニンニク・ニラ・リーキ | アリシン成分による抗菌・忌避効果。コンパニオンプランツの定番。根腐れ・黒腐れリスク |

> **注:** `alliaceae` はかつての「ユリ科ネギ属」から分類変更されましたが、農業慣習上の識別単位として `alliaceae` の語彙値を採用します。

---

#### 記述しきれない科への対応：命名ガイドライン

標準語彙に含まれない科の作物を扱う場合は、以下のルールで**暫定的な語彙値**を自由に生成してください。インデクサーは未知の値をエラーなく保存します。

**原則:** 植物学上の科名（ラテン語）を**すべて小文字のスネークケース**に変換します。

```text
命名規則:
  科名（ラテン語）→ すべて小文字 → 語彙値

例:
  Polygonaceae（タデ科）   → polygonaceae   （ソバ・ルバーブ等）
  Malvaceae（アオイ科）    → malvaceae      （オクラ・ワタ等）
  Pedaliaceae（ゴマ科）    → pedaliaceae    （ゴマ）
  Tropaeolaceae（ノウゼンハレン科）→ tropaeolaceae （ナスタチウム等）
  Valerianaceae（オミナエシ科）→ valerianaceae （コーン・サラダ等）
```

**補足ルール:**
- スペースを含む場合はアンダースコア（`_`）で接続します（通常の科名には不要）。
- `Brassicaceae` のように一般に通じる慣習名（`brassica`）がある場合は慣習名を優先し、TIPsで正式採用を提案します。
- 暫定値を使用した場合は、TIP-CROP-FAMILY への追加提案を検討してください（§8参照）。

---

## 2. `relationship` タグの語彙

**フォーマット:** `["relationship", "<要素A>", "<要素B>"]`

**役割:** 農家やAIが「今、生態系のどの非線形な相互作用に注目しているか」を明示します。多様な環境下でコモンズの「共通言語」として機能します。

> **順序について:** AとBの順序はインデクサー側で同一視されます（方向性を持ちません）。

---

### 2.1 物理・環境的要素

| 値 | 説明 |
|---|---|
| `soil_moisture` | 土壌水分 |
| `microclimate` | 微気候（圃場内の局所的な温度・湿度・光環境） |
| `soil_physical` | 土壌物理性（団粒構造・通気性・透水性等） |

### 2.2 生物的要素

| 値 | 説明 |
|---|---|
| `weed_flora` | 雑草相（雑草の種構成・優占種・分布） |
| `pest` | 害虫 |
| `natural_enemy` | 天敵（捕食性・寄生性昆虫等） |
| `soil_microbe` | 土壌微生物（細菌・糸状菌・原生生物等） |
| `crop_vitality` | 作物の活力（草勢・色・生育ステージ等） |

### 2.3 化学的要素

| 値 | 説明 |
|---|---|
| `nutrient_cycle` | 養分循環（窒素・リン・カリウム等の動態） |

---

### 2.4 `relationship` タグの使用例

```json
["relationship", "soil_moisture", "weed_flora"]
["relationship", "microclimate",  "natural_enemy"]
["relationship", "soil_microbe",  "nutrient_cycle"]
["relationship", "nutrient_cycle","crop_vitality"]
```

---

## 3. `phase` タグの語彙

**フォーマット:** `["phase", "<level>"]`

**役割:** この「問い」がどの熟達段階の農家の認知的成長を刺激するかを記述します（Vygotsky の足場掛け / ZPD に対応）。

| 値 | 定義 |
|---|---|
| `beginner` | 単一の事象・目に見える物理的変化の観察を促す問い |
| `intermediate` | 見えない要因や複数要素間の関係性についての推論を促す問い |
| `expert` | 生態系全体を俯瞰する高次の相互作用・システムレベルの適応を扱う問い |

---

## 4. `trigger` タグの語彙

**フォーマット:** `["trigger", "<category>", "<value>"]`

**役割:** エッジAIまたは農家がこの問いを生成した直接的な起点を記録します（任意タグ）。

| category | value の例 | 説明 |
|---|---|---|
| `sensor_anomaly` | `soil_moisture` / `temperature` / `illuminance` | センサー値の閾値超過・異常パターン検知 |
| `farmer_observation` | `weed_change` / `pest_found` / `crop_symptom` | 農家の目視観察の記録 |
| `periodic_review` | `weekly` / `seasonal` | 定期スケジュールによる問い生成 |
| `external_event` | `heavy_rain` / `frost` / `drought` | 気象・環境イベント |

---

## 5. `e` タグ（Lineage）のマーカー語彙

**フォーマット:** `["e", "<親イベントID>", "<リレーURL>", "<marker>"]`

| marker | 意味 |
|---|---|
| `derived_from` | 他者の問いを自農地の文脈に翻訳して生成した新しい問い（派生） |
| `synthesis` | 異なる系譜の複数の問いを連結して生成した高次の仮説（統合） |

---

## 6. DSL タグの語彙（第2層）

DSL タグは任意・非権威的です。DSL タグを持たない問いも完全に有効です。

### 6.1 サブキー定義

**フォーマット:** `["dsl:<sub_key>", "<model_id>", "<value_1>", "<value_2（任意）>"]`

| サブキー | 意味 | value_1 | value_2 |
|---|---|---|---|
| `dsl:model` | 名前付き解釈モデルの宣言 | モデル名（例: `climate_model`） | *(省略)* |
| `dsl:var` | 変数とその役割の宣言 | 変数名（例: `microclimate`） | 役割（下記参照） |
| `dsl:rel` | 2変数間の方向ある関係の宣言 | 起点変数 | 終点変数 |
| `dsl:meta` | モデルレベルの任意メタデータ | キー | 値 |

---

### 6.2 `dsl:var` の役割語彙

| 値 | 意味 |
|---|---|
| `independent` | 仮説的な原因変数・説明変数 |
| `dependent` | 問いの対象となる結果変数・応答変数 |
| `mediator` | 因果連鎖の中間変数（A → M → B） |
| `moderator` | 関係性の強さや方向を条件付ける変数 |

---

### 6.3 `dsl:model` の推奨命名例

`model_id` と モデル名はいずれも自由記述ですが、以下の命名規則を推奨します。

| model_id 例 | モデル名 例 | 想定される解釈の軸 |
|---|---|---|
| `m1` | `climate_model` | 気候・微気候による解釈 |
| `m2` | `soil_model` | 土壌物理・化学性による解釈 |
| `m3` | `biotic_model` | 生物的相互作用による解釈 |
| `m4` | `nutrient_chain_model` | 養分連鎖・土壌微生物による解釈 |
| `m5` | `indigenous_observation_model` | 在来知・経験知による解釈 |

> **注:** `model_id`（`m1` 等）はイベント内でのグルーピング識別子です。異なるイベント間での `m1` の意味は対応しません。モデル名（第3値）がセマンティクスを持ちます。

---

### 6.4 DSL で使用できる変数名

`dsl:var` の変数名には、§2（`relationship` 要素語彙）と同じ標準語彙の使用を推奨します。

| 変数名 | 対応する `relationship` 要素 |
|---|---|
| `soil_moisture` | §2.1 |
| `microclimate` | §2.1 |
| `soil_physical` | §2.1 |
| `weed_flora` | §2.2 |
| `pest` | §2.2 |
| `natural_enemy` | §2.2 |
| `soil_microbe` | §2.2 |
| `crop_vitality` | §2.2 |
| `nutrient_cycle` | §2.3 |

> `relationship` タグとDSL変数名に同じ語彙を使用することで、インデクサーのクロス検索（`dsl_var=weed_flora` と `relationship=weed_flora` の対応）が機能します。

---

### 6.5 `dsl:confidence`（暫定・TIP候補）

```json
["dsl:confidence", "<model_id>", "<0.0〜1.0の数値文字列>"]
```

AIが生成したDSLの信頼度を付与する任意タグです。**現時点では算出方法・閾値・cross-model比較可能性は未固定**です（advisory metadata として扱う）。TIP-DSL-CONFIDENCE を通じた将来的な形式化を想定しています。

---

## 7. Vocabulary Normalization（語彙正規化）ガイドライン

エッジAIが語彙正規化を行う際の参考表です。

### 7.1 `relationship` / DSL 変数名の正規化例

| 非推奨・typo例 | 正規化後（推奨標準語彙） |
|---|---|
| `weed` / `weeds` / `雑草` | `weed_flora` |
| `nutrient` / `nutrients` | `nutrient_cycle` |
| `microorganism` / `bacteria` | `soil_microbe` |
| `soil_water` / `moisture` | `soil_moisture` |
| `enemy_insect` / `beneficial` | `natural_enemy` |
| `soil_structure` / `drainage` | `soil_physical` |
| `crop_health` / `plant_vigor` | `crop_vitality` |

### 7.2 `context` 語彙の正規化例

| 非推奨・typo例 | 正規化後（推奨標準語彙） |
|---|---|
| `andisol` | `volcanic_ash`（同義・`volcanic_ash` を推奨） |
| `loam` / `loamy` | 最も近い `alluvial` または `clay`（文脈依存） |
| `temperate` | `cool-temperate` または `warm-temperate`（文脈依存） |
| `rice` / `corn` / `wheat` / `barley` | `poaceae` |
| `tomato` / `potato` / `eggplant` / `pepper` | `solanaceae` |
| `cabbage` / `radish` / `broccoli` / `brassicaceae` | `brassica` |
| `soybean` / `pea` / `bean` / `fabaceae` | `legume` |
| `cucumber` / `pumpkin` / `melon` | `cucurbitaceae` |
| `carrot` / `parsley` / `celery` | `apiaceae` |
| `lettuce` / `sunflower` / `chrysanthemum` | `asteraceae` |
| `spinach` / `beet` / `quinoa` / `chenopodiaceae` | `amaranthaceae` |
| `apple` / `pear` / `peach` / `strawberry` | `rosaceae` |
| `citrus` / `mandarin` / `lemon` | `rutaceae` |
| `onion` / `garlic` / `leek` / `chive` | `alliaceae` |
| `basil` / `mint` / `shiso` / `lavender` | `lamiaceae` |
| `taro` / `colocasia` | `araceae` |
| `ginger` / `turmeric` | `zingiberaceae` |
| `sweet_potato` / `morning_glory` | `convolvulaceae` |
| `blueberry` / `cranberry` | `ericaceae` |

---

## 8. 語彙拡張プロセス（TIPs）

既存語彙に当てはまらない関係性・コンテキストを発見した場合：

1. **暫定使用を許容:** エッジAIは新しい文字列を暫定的にタグ付けして送信できます。インデクサーは未知の tagKey・tagValue をエラーなく保存します（後方互換性が保証されています）。
2. **蓄積と観察:** 新出語彙が複数の農家・地域で繰り返し使用される場合、有用性が認められます。
3. **TIPsによる標準化:** GitHub 上で TIPs（Toitoi Improvement Proposals）として提案し、コミュニティの合意形成を経て本リストに追加されます。

**TIPs候補（現在検討中）:**

| TIP | 対象語彙・仕様 |
|---|---|
| TIP-VOCABULARY | 語彙管理方式・synonym registry・多言語マッピング |
| TIP-DSL-CONFIDENCE | `dsl:confidence` の算出方法・閾値・比較可能性 |
| TIP-CROP-FAMILY | `crop_family` の語彙拡張（根菜類・薬用植物等） |
| TIP-RELATIONSHIP | `relationship` 要素の語彙拡張 |
