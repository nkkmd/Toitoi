# Toitoi Commons API リファレンス
**バージョン：v1.0** ｜ *デジタル・アグロエコロジー・コモンズ推進プロジェクト*

---

## はじめに

本ドキュメントは、デジタル・アグロエコロジー・コモンズ「Toitoi」のインデクサーAPIの使用方法を解説するリファレンスです。フロントエンド開発者、農家・コミュニティ運営者、および外部システムとの連携を行う実装者を対象としています。

### ベースURL

```
https://api.your-domain.com
```

### 共通仕様

| 項目 | 内容 |
|---|---|
| プロトコル | HTTPS |
| データ形式 | JSON（`Content-Type: application/json`） |
| 文字コード | UTF-8 |
| 認証 | なし（オープンAPI） |
| レート制限 | 現バージョンでは未実装 |

### エンドポイント一覧

| メソッド | パス | 概要 |
|---|---|---|
| `GET` | `/health` | サーバーの稼働確認 |
| `GET` | `/api/v1/inquiries` | 最新の問い一覧を取得 |
| `GET` | `/api/v1/inquiries/query` | 全文検索・タグ絞り込みによる複合検索 |
| `GET` | `/api/v1/inquiries/:id/tree` | 問いの系譜ツリーを取得 |

---

## エンドポイント詳細

---

### `GET /health`

サーバーが正常に稼働しているかを確認します。監視ツールや接続テストに使用してください。

#### リクエスト

パラメータなし。

```bash
curl https://api.your-domain.com/health
```

#### レスポンス

```json
{
  "status": "ok",
  "timestamp": "2026-05-01T10:00:00.000Z"
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `status` | string | 常に `"ok"` |
| `timestamp` | string | サーバー現在時刻（ISO 8601形式） |

---

### `GET /api/v1/inquiries`

インデクサーに蓄積された問いを新着順で取得します。ページネーションに対応しています。フロントエンドのタイムライン表示などに使用します。

#### クエリパラメータ

| パラメータ | 型 | 必須 | デフォルト | 上限 | 説明 |
|---|---|---|---|---|---|
| `limit` | integer | — | `20` | `100` | 1回で取得する件数 |
| `offset` | integer | — | `0` | — | 取得開始位置（ページネーション用） |

#### リクエスト例

```bash
# 最新20件を取得
curl "https://api.your-domain.com/api/v1/inquiries"

# 21件目から20件取得（2ページ目）
curl "https://api.your-domain.com/api/v1/inquiries?limit=20&offset=20"

# 1回に50件取得
curl "https://api.your-domain.com/api/v1/inquiries?limit=50"
```

#### レスポンス

```json
{
  "total": 128,
  "limit": 20,
  "offset": 0,
  "results": [
    {
      "id": "abc123def456...",
      "pubkey": "9f8e7d6c5b4a...",
      "content": "北側斜面において、土壌の乾きの遅さとスギナの繁茂に相関が見られます。この微気候は天敵群集にどのような影響を与えているでしょうか？",
      "createdAt": 1714567890,
      "tags": [
        { "id": 1, "eventId": "abc123...", "tagKey": "t",            "tagValue1": "agroecology",  "tagValue2": null },
        { "id": 2, "eventId": "abc123...", "tagKey": "context",      "tagValue1": "climate_zone", "tagValue2": "cool-temperate" },
        { "id": 3, "eventId": "abc123...", "tagKey": "context",      "tagValue1": "soil_type",    "tagValue2": "volcanic_ash" },
        { "id": 4, "eventId": "abc123...", "tagKey": "relationship", "tagValue1": "microclimate", "tagValue2": "weed_flora" },
        { "id": 5, "eventId": "abc123...", "tagKey": "phase",        "tagValue1": "intermediate", "tagValue2": null }
      ]
    }
  ]
}
```

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|---|---|---|
| `total` | integer | 蓄積された問いの総件数 |
| `limit` | integer | リクエストで指定した取得件数 |
| `offset` | integer | リクエストで指定したオフセット |
| `results` | array | 問いオブジェクトの配列（新着順） |
| `results[].id` | string | NostrイベントID（64文字のhex文字列） |
| `results[].pubkey` | string | 送信者の公開鍵（64文字のhex文字列） |
| `results[].content` | string | 問いの本文テキスト |
| `results[].createdAt` | integer | 作成日時（Unix timestamp） |
| `results[].tags` | array | タグオブジェクトの配列（後述） |

#### tags オブジェクト

| フィールド | 型 | 説明 |
|---|---|---|
| `tagKey` | string | タグの種別（`context` / `relationship` / `phase` / `trigger` / `e` など） |
| `tagValue1` | string | タグの第1値（tagKey が `context` なら分類キー、`relationship` なら要素Aなど） |
| `tagValue2` | string \| null | タグの第2値（tagKey が `context` なら値、`relationship` なら要素Bなど） |

---

### `GET /api/v1/inquiries/query`

問いの本文（`content`）に対する**全文検索**と、`context`・`relationship`・`phase` タグによる**絞り込み検索**を1つのエンドポイントで統合しています。パラメータは自由に組み合わせて使用できます。

> **パラメータを何も指定しない場合は `400 Bad Request` が返ります。** 全件取得には `/api/v1/inquiries` を使用してください。

#### クエリパラメータ

**検索パラメータ（最低1つ必須）**

| パラメータ | 型 | 説明 |
|---|---|---|
| `q` | string | 検索キーワード。`content` フィールドに対して部分一致で検索します |
| `climate_zone` | string | 気候帯で絞り込みます（推奨語彙は後述） |
| `soil_type` | string | 土壌タイプで絞り込みます（推奨語彙は後述） |
| `farming_context` | string | 農法・栽培環境で絞り込みます（推奨語彙は後述） |
| `crop_family` | string | 対象作物群で絞り込みます（推奨語彙は後述） |
| `relationship` | string | 関係性の要素名を1つ指定します。要素Aと要素Bの順序は問いません |
| `phase` | string | 熟達フェーズで絞り込みます（`beginner` / `intermediate` / `expert`） |
| `since` | integer | この Unix timestamp **以降**に作成された問いに絞り込みます |
| `until` | integer | この Unix timestamp **以前**に作成された問いに絞り込みます |

**ページネーションパラメータ**

| パラメータ | 型 | デフォルト | 上限 | 説明 |
|---|---|---|---|---|
| `limit` | integer | `20` | `100` | 1回で取得する件数 |
| `offset` | integer | `0` | — | 取得開始位置 |

#### 推奨語彙

`context` 系パラメータおよび `relationship` には、以下の標準語彙（TOITOI_PROTOCOL_SCHEMA 準拠）を使用してください。

**`climate_zone`（気候帯）**

| 値 | 説明 |
|---|---|
| `subarctic` | 亜寒帯（例：北海道） |
| `cool-temperate` | 冷温帯（例：東北・高冷地） |
| `warm-temperate` | 暖温帯（例：関東〜九州の平野部） |
| `subtropical` | 亜熱帯（例：沖縄・南西諸島） |

**`soil_type`（土壌タイプ）**

| 値 | 説明 |
|---|---|
| `volcanic_ash` / `andisol` | 火山灰土・黒ボク土 |
| `alluvial` | 沖積土（河川流域の肥沃な土） |
| `sandy` | 砂土 |
| `clay` | 粘土質 |
| `peat` | 泥炭土 |

**`farming_context`（農法・栽培環境）**

| 値 | 説明 |
|---|---|
| `open_field` | 露地栽培 |
| `greenhouse_unheated` | 無加温ハウス |
| `greenhouse_heated` | 加温ハウス |
| `no_till` | 不耕起栽培 |
| `organic` | 有機栽培 |
| `conventional` | 慣行栽培 |

**`crop_family`（対象作物群）**

| 値 | 説明 |
|---|---|
| `solanaceae` | ナス科（トマト、ナス、ピーマン等） |
| `brassica` | アブラナ科（キャベツ、大根、ブロッコリー等） |
| `legume` | マメ科（大豆、エンドウ等） |
| `cucurbitaceae` | ウリ科（キュウリ、カボチャ等） |
| `poaceae` | イネ科（イネ、トウモロコシ、緑肥ムギ類等） |

**`relationship`（関係性の要素）**

| 値 | 説明 |
|---|---|
| `soil_moisture` | 土壌水分 |
| `weed_flora` | 雑草相 |
| `pest` | 害虫 |
| `natural_enemy` | 天敵 |
| `microclimate` | 微気候 |
| `nutrient_cycle` | 養分循環 |
| `soil_physical` | 土壌物理性 |
| `soil_microbe` | 土壌微生物 |
| `crop_vitality` | 作物の活力 |

#### リクエスト例

```bash
# 全文検索のみ
curl "https://api.your-domain.com/api/v1/inquiries/query?q=スギナ"

# タグ絞り込みのみ（旧 /search 相当）
curl "https://api.your-domain.com/api/v1/inquiries/query?soil_type=volcanic_ash&climate_zone=cool-temperate"

# 全文検索 ＋ 複数タグの組み合わせ
curl "https://api.your-domain.com/api/v1/inquiries/query?q=スギナ&soil_type=volcanic_ash&phase=intermediate"

# relationship 絞り込み（要素の順序は問わない）
curl "https://api.your-domain.com/api/v1/inquiries/query?relationship=weed_flora"

# 時間範囲フィルタ（2026年1月1日以降）
curl "https://api.your-domain.com/api/v1/inquiries/query?q=天敵&since=1735689600"

# ページネーション（2ページ目）
curl "https://api.your-domain.com/api/v1/inquiries/query?q=土壌&limit=20&offset=20"

# パラメータなし → 400 エラー
curl "https://api.your-domain.com/api/v1/inquiries/query"
```

#### レスポンス（成功時）

```json
{
  "total": 42,
  "limit": 20,
  "offset": 0,
  "results": [
    {
      "id": "abc123def456...",
      "pubkey": "9f8e7d6c5b4a...",
      "createdAt": 1714567890,
      "content": "北側斜面において、土壌の乾きの遅さとスギナの繁茂に相関が見られます。この微気候は天敵群集にどのような影響を与えているでしょうか？",
      "highlight": "土壌の乾きの遅さと<em>スギナ</em>の繁茂に相関が見られます。",
      "tags": [
        { "tagKey": "context",      "tagValue1": "climate_zone", "tagValue2": "cool-temperate" },
        { "tagKey": "context",      "tagValue1": "soil_type",    "tagValue2": "volcanic_ash" },
        { "tagKey": "relationship", "tagValue1": "microclimate", "tagValue2": "weed_flora" },
        { "tagKey": "phase",        "tagValue1": "intermediate", "tagValue2": null }
      ]
    }
  ]
}
```

#### レスポンスフィールド（`/inquiries` との差分）

| フィールド | 型 | 説明 |
|---|---|---|
| `results[].createdAt` | integer | 作成日時（`/inquiries` の `createdAt` と同義） |
| `results[].highlight` | string \| null | `q` を指定した場合のみ返されます。マッチ箇所を `<em>...</em>` で囲んだ本文スニペット。`q` を指定しなかった場合は `null` |

> **`highlight` のレンダリングについて：** `highlight` フィールドはHTMLが含まれます。フロントエンドで表示する際は `innerHTML` を使用してください。ただし、本フィールドはAPIサーバー側でXSSエスケープ済みのため、そのまま利用しても安全です。

#### レスポンス（エラー時）

**400 Bad Request（パラメータなし）**

```json
{
  "error": "At least one query parameter is required.",
  "hint": "Use /api/v1/inquiries for the full list."
}
```

**500 Internal Server Error**

```json
{
  "error": "Internal server error"
}
```

---

### `GET /api/v1/inquiries/:id/tree`

指定したイベントIDをルート（根）として、`derived_from`（派生）や `synthesis`（結合）によってつながれた問いの系譜を、再帰的なツリー構造のJSONとして返します。フロントエンドのグラフ・マインドマップ描画に使用します。

#### パスパラメータ

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `:id` | string | ✅ | ルートとするNostrイベントID（64文字のhex文字列） |

#### リクエスト例

```bash
curl "https://api.your-domain.com/api/v1/inquiries/abc123def456.../tree"
```

#### レスポンス（成功時）

ルートノードを頂点とし、子ノードを `children` 配列に再帰的に格納したツリー構造で返します。

```json
{
  "id": "abc123def456...",
  "content": "九州の微気候に関する問いをこの圃場（黒ボク土）で観察したところ、ハコベが優占しました。初期窒素量が関係しているのではないでしょうか？",
  "createdAt": 1714567000,
  "parent_id": null,
  "children": [
    {
      "id": "bcd234efa567...",
      "content": "当農場（沖積土）でも同様の観察をしました。ハコベではなくオオイヌノフグリが優占しており、排水性の違いが雑草相を決定しているのではないでしょうか？",
      "createdAt": 1714580000,
      "parent_id": "abc123def456...",
      "children": [
        {
          "id": "cde345feb678...",
          "content": "排水性と雑草相の関係を、土壌物理性（硬度・団粒構造）の観点からさらに掘り下げられないでしょうか？",
          "createdAt": 1714600000,
          "parent_id": "bcd234efa567...",
          "children": []
        }
      ]
    },
    {
      "id": "def456fec789...",
      "content": "火山灰土の農場でも似た現象が確認されました。スギナの優占との違いは土壌pHに起因するのではないでしょうか？",
      "createdAt": 1714590000,
      "parent_id": "abc123def456...",
      "children": []
    }
  ]
}
```

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | NostrイベントID |
| `content` | string | 問いの本文テキスト |
| `createdAt` | integer | 作成日時（Unix timestamp） |
| `parent_id` | string \| null | 親ノードのイベントID。ルートノードは `null` |
| `children` | array | 子ノードの配列（同構造の再帰。派生・結合された問い） |

#### レスポンス（エラー時）

**404 Not Found（IDが存在しない場合）**

```json
{
  "error": "Event not found"
}
```

---

## 実装例

### JavaScript（fetch API）

```javascript
// 全文検索 ＋ タグ絞り込み
async function searchInquiries({ q, soilType, phase, limit = 20, offset = 0 }) {
  const params = new URLSearchParams();
  if (q)        params.set('q',         q);
  if (soilType) params.set('soil_type', soilType);
  if (phase)    params.set('phase',     phase);
  params.set('limit',  limit);
  params.set('offset', offset);

  const res = await fetch(
    `https://api.your-domain.com/api/v1/inquiries/query?${params}`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// 使用例
const result = await searchInquiries({
  q:        'スギナ',
  soilType: 'volcanic_ash',
  phase:    'intermediate',
});
console.log(`${result.total}件ヒット`);

result.results.forEach(item => {
  console.log(item.content);
  // highlight を DOM に表示する場合
  // element.innerHTML = item.highlight ?? item.content;
});
```

```javascript
// 問いの系譜ツリーを取得してノード数を数える
async function fetchTree(eventId) {
  const res = await fetch(
    `https://api.your-domain.com/api/v1/inquiries/${eventId}/tree`
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error('問いが見つかりません');
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

function countNodes(node) {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

const tree = await fetchTree('abc123def456...');
console.log(`系譜の総ノード数: ${countNodes(tree)}`);
```

### Python（requests）

```python
import requests

BASE_URL = "https://api.your-domain.com"

def search_inquiries(q=None, soil_type=None, phase=None, limit=20, offset=0):
    params = {"limit": limit, "offset": offset}
    if q:          params["q"]         = q
    if soil_type:  params["soil_type"] = soil_type
    if phase:      params["phase"]     = phase

    res = requests.get(f"{BASE_URL}/api/v1/inquiries/query", params=params)
    res.raise_for_status()
    return res.json()

def fetch_tree(event_id):
    res = requests.get(f"{BASE_URL}/api/v1/inquiries/{event_id}/tree")
    res.raise_for_status()
    return res.json()

# 使用例
result = search_inquiries(q="スギナ", soil_type="volcanic_ash")
print(f"{result['total']}件ヒット")
for item in result["results"]:
    print(item["content"])
```

---

## ページネーションの実装パターン

全件を順次取得するループの実装例です。

```javascript
async function fetchAllInquiries() {
  const all    = [];
  const limit  = 100;
  let   offset = 0;

  while (true) {
    const res = await fetch(
      `https://api.your-domain.com/api/v1/inquiries?limit=${limit}&offset=${offset}`
    );
    const data = await res.json();

    all.push(...data.results);

    if (all.length >= data.total) break;
    offset += limit;
  }

  return all;
}
```

---

## タグの読み方

各問いの `tags` 配列は以下のルールで構造化されています。

```
tagKey = "context"
  → tagValue1: 分類キー（climate_zone / soil_type / farming_context / crop_family）
  → tagValue2: 値（warm-temperate / volcanic_ash など）

tagKey = "relationship"
  → tagValue1: 関係性の要素A（microclimate など）
  → tagValue2: 関係性の要素B（weed_flora など）
  ※ AとBの順序に意味はなく、インデクサーは同一視します

tagKey = "phase"
  → tagValue1: 熟達フェーズ（beginner / intermediate / expert）
  → tagValue2: null

tagKey = "trigger"
  → tagValue1: 起点カテゴリ（sensor_anomaly / farmer_observation など）
  → tagValue2: 起点の詳細（soil_moisture / pest_found など）

tagKey = "e"（Lineage）
  → tagValue1: 親イベントID
  → tagValue2: リレーURL
  ※ 関係性の種別（derived_from / synthesis）は tagValue3 に格納されますが、
     本APIのレスポンスでは tagValue2 までを返します。rawJson を参照してください。
```

---

## よくある質問

**Q. `relationship` で2つの要素を組み合わせて絞り込めますか？**

現バージョンでは `relationship` パラメータは要素名を1つだけ指定します。指定した要素が要素Aまたは要素Bのいずれかに含まれる問いがすべてヒットします。2要素の組み合わせによる絞り込みは将来バージョンで検討予定です。

**Q. `q`（全文検索）は日本語に対応していますか？**

はい。`pg_trgm` 拡張によるトライグラムインデックスを使用しており、日本語のキーワードでの部分一致検索が可能です。ただし形態素解析は行わないため、「土壌水分」で検索した場合に「土壌」や「水分」単独ではヒットしません。検索キーワードはできるだけ実際に `content` に含まれる表現を使用してください。

**Q. `context` の複数カテゴリを同時に指定した場合はどうなりますか？**

AND条件として動作します。たとえば `soil_type=volcanic_ash&climate_zone=cool-temperate` を指定した場合、両方のタグを持つ問いのみが返ります。

**Q. 公開鍵（`pubkey`）で特定の農家の問いだけを取得できますか？**

現バージョンでは `pubkey` によるフィルタリングには対応していません。取得した結果をクライアント側でフィルタリングしてください。

**Q. `highlight` フィールドの `<em>` タグはCSSでどう装飾しますか？**

```css
em {
  background-color: #fffbcc;
  font-style: normal;
  font-weight: bold;
}
```

---

*本ドキュメントはデジタル・アグロエコロジー・コモンズ推進プロジェクトの一環として作成されました。*
*v1.0 — 2026年5月*