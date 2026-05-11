# Toitoi フロントエンド設計書：生態学的直感を刺激するUI/UX

**バージョン: 0.2.0**

本ドキュメントは、デジタル・アグロエコロジー・コモンズ「Toitoi」における **フロントエンド・ビューア層（農家向けダッシュボード / アプリケーション）** のリファレンス実装ガイドおよびUX設計書です。

既存のスマート農業アプリが「指示・管理・ダッシュボード（グラフの羅列）」を志向するのに対し、本システムは「探索・共鳴・ネットワークの可視化」を志向します。

**バージョン: 0.2.0** ｜ 前バージョン (v0.1.0) からの主なアップデート：

- **§2.1：** コンテキスト・ヘッダーに `trigger` タグ（問いの起点）の表示を追加。Discovery Feed の検索を `/api/v1/inquiries/query` エンドポイントに統一（API_REFERENCE v0.2.0 準拠）。
- **§2.2：** ノード詳細パネルに `trigger` 情報と DSL 解釈モデル（第2層）の表示を追加。複数 DSL モデルの並列表示 UI を設計。`synthesis` ノードの視覚的表現を強化。
- **§2.3：** タグ入力 UI に `trigger` カテゴリ（センサー異常・農家観察・定期レビュー・外部イベント）のサジェストを追加。DSL タグ（`dsl:model` / `dsl:var` / `dsl:rel`）のプレビュー表示を追加。
- **§2.4（新設）：** 統合検索・フィルタリング UI — pg_trgm 全文検索と `context` / `relationship` / `phase` / `dsl_*` タグフィルタを組み合わせた複合検索画面の設計。`highlight` フィールドのレンダリング仕様を含む。
- **§2.5（新設）：** Web of Trust ビュー — NIP-32/NIP-51 に基づく信頼ネットワークの可視化と優先表示制御 UI。
- **§3：** 推奨技術スタックを更新。
- **§4：** クライアント側データフローを全面的に更新。API エンドポイント・パラメータを API_REFERENCE v0.2.0 に同期。DSL タグの2行レコードパターン解釈ロジックを追加。
- **§5：** アイデンティティとプライバシーの説明を更新。`trigger` タグのクライアント生成ガイドラインを追加。
- **§6（新設）：** UI 表示文言対応表（全タグの日本語 UI ラベル）を追加。

---

## 1. UXの基本思想（テクノロジーを手放すためのデザイン）

1. **「正解」を提示しない（Anti-Prescriptive UI）：** 画面上に「最適値」「アラート（赤色の警告）」「〇〇すべき」という表現を一切使用しません。情報は常に「仮説」や「他者の観察結果（問い）」として控えめに提示され、最終判断は農家の身体的実践に委ねられます。DSL 解釈モデル（第2層）も同様に「ひとつの視点」として提示し、正答を示すものではないことを UI で明示します。

2. **文脈の共鳴（Contextual Serendipity）：** 農家がアプリを開いた際、単なる時系列のタイムラインではなく、「自分の農地の土壌・気候・直面している課題（コンテキスト）」と類似する、遠く離れた農家の「問い」が優先的に表示（レコメンド）されます。

3. **進化の可視化（Tree Visualization）：** アグロエコロジーの知識がどのように派生し、結びついたかを「系統樹（マインドマップ）」としてグラフィカルに表示し、「自分の小さな観察が、コモンズ全体の知を育てている」という手触り（貢献感）を提供します。

4. **二層の問い（Boundary Object + DSL）：** 農家には常に自然言語の問い（第1層）が主役として表示されます。DSL 解釈モデル（第2層）はオプションとして折りたたみ表示し、興味のある農家・研究者だけが深掘りできる設計とします。DSL がない問いも完全に有効であり、UI 上で差別化しません。

---

## 2. 画面構成と主要機能（UI設計）

フロントエンドは、主に以下の5つのビュー（画面）で構成されます。

### 2.1 ホーム・ビュー：【共鳴のタイムライン】

アプリを起動して最初に表示される画面。インデクサー API のマッチング機能を利用し、農家の「今」に最も関連する問いを提示します。

**UI要素：**

- **コンテキスト・ヘッダー：** 「九州・火山灰土・暖温帯」など、現在設定されている自身の属地性バッジが表示されます。ユーザーが設定した `context` タグの値（`climate_zone` / `soil_type` / `farming_context` / `crop_family`）をバッジとして並べます。
- **ローカルAIからの問いかけ（Scaffolding）：** ローカルのセンサーデータや農家の観察からAIが生成した「あなた自身の農地に対する問い」が最上部に表示されます。問いの右肩に `trigger` バッジ（例：「🌡️ センサー異常」「👁 農家観察」「📅 定期レビュー」「🌧 外部イベント」）を表示し、問いが生まれた起点を一目で確認できるようにします。
- **コモンズからの共鳴（Discovery Feed）：** 「あなたの環境に似た農地で、現在こんな問いが議論（派生）されています」というフィードが表示されます。このフィードは `GET /api/v1/inquiries/query` を用いてユーザーの `context` 条件でフィルタリングした結果を表示します。

**UXの工夫：**

一般的な SNS の「いいね（Like）」ボタンは存在しません。代わりに **「私の農地で試す（Translate）」** ボタンがあり、これを押すと、自分の農地環境に文脈を書き換えた「派生（`derived_from`）」の問いを作成するエディタが開きます。

---

### 2.2 系統樹・ビュー：【翻訳の連鎖の可視化】

特定の「問い（ノード）」をクリックした際に展開される、本アプリの核心となるグラフィカルな画面です。

**UI要素（Node & Edge グラフ）：**

- 画面全体がキャンバスとなり、問いが円（ノード）として、派生関係が線（エッジ）として描画されます。
- ノードの色やアイコンで「土壌の違い（例: 黒ボク土は茶色、沖積土はグレー）」や「気候帯の違い」を視覚的に表現します（`context` タグの値に基づく）。
- 複数の問いが結合（`synthesis`）して生まれた仮説は、より大きく輝くノードとして表現します。エッジのスタイルも `derived_from`（破線）と `synthesis`（実線・太め）で視覚的に区別します。
- `trigger` バッジをノードに付与し、各問いの起点（センサー異常、農家観察など）をグラフ上で一覧できるようにします。

**ノード詳細パネル（タップ時に展開）：**

任意のノードをタップすると、右側または下部にスライドインするパネルが表示されます。パネルには以下の情報を含みます。

```
┌──────────────────────────────────────────────────────┐
│ 問いのテキスト（content フィールド）                      │
│                                                      │
│ 📍 文脈（Context）                                    │
│   気候帯: 暖温帯 / 土壌: 火山灰土 / 農法: 不耕起          │
│                                                      │
│ 🔗 観察の焦点（Relationship）                           │
│   微気候 ↔ 雑草相                                     │
│                                                      │
│ 📶 熟達フェーズ: 中級者向け                              │
│                                                      │
│ 💡 問いの起点（Trigger）: 👁 農家観察 — 雑草の変化         │
│                                                      │
│ ▼ 解釈モデル（DSL）  [折りたたみ / 任意表示]             │
│   ┌──────────────────────────────────────────────┐   │
│   │ モデル: climate_model                         │   │
│   │   独立変数 → microclimate（微気候）             │   │
│   │   従属変数 → weed_flora（雑草相）               │   │
│   │   関係: microclimate → weed_flora             │   │
│   ├──────────────────────────────────────────────┤   │
│   │ モデル: soil_model（競合する解釈）               │   │
│   │   独立変数 → soil_nutrients                   │   │
│   │   従属変数 → weed_flora（雑草相）               │   │
│   │   関係: soil_nutrients → weed_flora           │   │
│   └──────────────────────────────────────────────┘   │
│   ⚠️ DSL は「ひとつの解釈」であり、正解ではありません       │
│                                                      │
│  [ 私の農地で試す（Translate） ]  [ 系統樹を見る ]       │
└──────────────────────────────────────────────────────┘
```

DSL セクションは初期状態では折りたたまれており、農家が明示的に展開した場合のみ表示されます。複数の DSL モデルが存在する場合はタブ切り替えまたは縦に並べて表示し、「競合する解釈の多様性」をネガティブなものとして表現せず、「異なる農地からの視点が共存している」という文脈で説明します。

**インタラクション：**

- ピンチイン・アウト（拡大縮小）とスワイプで、広大な「知識の森」を探索できます。
- ミニマップ（画面端の小さなナビゲーター）で全体の位置を把握できます。
- 特定の `context` 条件（例：「火山灰土のみ表示」）でノードをフィルタリングできるサイドパネルを提供します。

---

### 2.3 実践記録・ビュー：【暗黙知の言語化サポート】

農家が自身の観察や、他者から受け取った問いに対する「実践の結果」を入力（言語化・表出化）する画面です。

**UI要素：**

- **テキスト入力：** 問いの本文（`content`）を入力するメインフィールド。口語での入力を歓迎し、後述の AI サジェストで構造化を補助します。

- **タグ・サジェスト（Context）：** `climate_zone` / `soil_type` / `farming_context` / `crop_family` の各カテゴリについて、推奨語彙をタップ選択できるトークン UI を提供します。手打ちさせないことで表記揺れを防ぎます。

- **タグ・サジェスト（Relationship）：** 「関係性（Relationship）」を入力する際、推奨ボキャブラリー（`microclimate` / `weed_flora` / `soil_moisture` など）からタップで選択できます。2つの要素をペアで選ぶ UI（例：「微気候」 ↔ 「雑草相」）とします。

- **問いの起点（Trigger）の選択：** 以下の4カテゴリから起点をタップ選択できます。選択は任意で、直感による自発的な問いの場合はスキップできます。

  | カテゴリ | アイコン | 値の例 |
  |---|---|---|
  | センサー異常 | 🌡️ | `soil_moisture` / `temperature` / `illuminance` |
  | 農家観察 | 👁 | `weed_change` / `pest_found` / `crop_symptom` |
  | 定期レビュー | 📅 | `weekly` / `seasonal` |
  | 外部イベント | 🌧 | `heavy_rain` / `frost` / `drought` |

- **熟達フェーズ（Phase）の選択：** 「初心者向け」「中級者向け」「上級者向け」をタップで選択します。選択が難しい場合は AI が `content` を解析してサジェストします。

- **DSL プレビュー（任意・折りたたみ）：** AI アシストが有効な場合、入力された自然言語の問いから自動生成した DSL タグ群のプレビューを折りたたみ式で表示します。農家はこれを確認・修正・破棄できます。DSL は完全にオプションであり、強制されないことを UI で明示します。

  ```
  ▼ AIが解釈した構造（任意・変更可）
    モデル名: climate_model
    独立変数: microclimate（微気候）
    従属変数: weed_flora（雑草相）
    関係: microclimate → weed_flora
    [ この解釈を使う ] [ 使わない ] [ 編集する ]
  ```

- **AIアシスト（任意）：** 農家が「スギナが増えて、土がジメジメしている」と口語で入力すると、ローカル AI が「『微気候と雑草相の関係』に関する問いの形式に整形しましょうか？」とサジェスト（足場掛け）します。

---

### 2.4 統合検索・ビュー：【知識の森を探索する】

コモンズ全体の問いを横断して検索・発見するための画面です。`GET /api/v1/inquiries/query` エンドポイントを活用し、全文検索・コンテキストフィルタ・DSL フィルタを自由に組み合わせられます。

**UI要素：**

- **テキスト検索バー（`q` パラメータ）：** `content` フィールドに対して部分一致で検索します。マッチ箇所はハイライト表示します。

  > **実装上の注意：** API レスポンスの `highlight` フィールドには `<em>...</em>` タグが含まれます。レンダリングには `innerHTML` を使用してください。なお、本フィールドはサーバー側でXSSエスケープ済みのため安全に使用できます。表示スタイルは以下を推奨します。
  > ```css
  > em { background-color: #fffbcc; font-style: normal; font-weight: bold; }
  > ```
  > また、日本語検索には `pg_trgm` 拡張によるトライグラムインデックスを使用しているため、形態素解析は行われません。「土壌水分」で検索した場合に「土壌」や「水分」単独ではヒットしない点に留意し、`content` に含まれる実際の表現でのキーワード検索を案内するヘルプテキストを表示することを推奨します。

- **コンテキスト・フィルタパネル（折りたたみ式）：** 以下のパラメータをドロップダウンまたはトークン選択で指定できます。複数を同時指定した場合は AND 条件で絞り込みます。

  | フィルタ | API パラメータ | 推奨語彙（抜粋） |
  |---|---|---|
  | 気候帯 | `climate_zone` | `subarctic` / `cool-temperate` / `warm-temperate` / `subtropical` |
  | 土壌タイプ | `soil_type` | `volcanic_ash` / `alluvial` / `sandy` / `clay` / `peat` |
  | 農法 | `farming_context` | `open_field` / `no_till` / `organic` / `conventional` … |
  | 作物群 | `crop_family` | `solanaceae` / `brassica` / `legume` / `cucurbitaceae` / `poaceae` |
  | 関係性要素 | `relationship` | `weed_flora` / `microclimate` / `soil_moisture` … |
  | 熟達フェーズ | `phase` | `beginner` / `intermediate` / `expert` |

- **DSL フィルタパネル（折りたたみ式・上級者向け）：** 研究者・上級農家向けに DSL 層での検索を提供します。

  | フィルタ | API パラメータ | 説明 |
  |---|---|---|
  | DSL モデル名 | `dsl_model` | 例: `climate_model` / `soil_model` / `nutrient_chain_model` |
  | DSL 変数名 | `dsl_var` | 例: `microclimate` / `weed_flora` |
  | DSL 変数ロール | `dsl_role` | `independent` / `dependent` / `mediator` / `moderator` |

  > `dsl_model` と `dsl_var` / `dsl_role` を同時に指定した場合、現バージョンでは「同一モデル内での一致」ではなく「それぞれの条件を満たすタグがイベント内に存在する」という判定になります（API_REFERENCE v0.2.0 §よくある質問 参照）。1つのイベントに複数の DSL モデルが共存する場合はこの点を UI のヘルプテキストで案内してください。

- **日時フィルタ：** 「直近1週間」「直近1ヶ月」「期間指定」のプリセットボタンを提供し、`since` / `until` パラメータ（Unix timestamp）に変換して送信します。

- **検索結果カード：** 各問いをカード形式で表示します。カードには `content`（ハイライト付き）・`context` バッジ・`trigger` バッジ・`phase` インジケータ・DSL モデル数（例：「解釈モデル: 2件」）を表示します。パラメータが何も指定されない場合は `400 Bad Request` が返るため、UI 上で「少なくとも1つの条件を入力してください」と案内します。

---

### 2.5 Web of Trust ビュー：【農家ネットワークの可視化】

NIP-32 / NIP-51 を活用したスパム防御と信頼ネットワークの UI です。

**UI要素：**

- **Trust レベルの表示：** 各問いのカードに信頼バッジを表示します（例：★★★ = Web of Trust 内の農家、★★ = フォロー外だが農家ネットワークとの繋がりあり、★ = 未確認）。スコアは Nostr の Follow リスト・Mute リストを参照して算出します。
- **信頼ネットワークの設定：** 「信頼する農家の公開鍵を登録する」画面を提供します。公開鍵（npub 形式）の手入力または QR コード読み込みで登録できます。
- **優先表示の切替：** 「信頼ネットワーク優先」モードをトグルで切り替え可能にします。オフの場合は全ての問いを公平に表示します。

---

## 3. 推奨技術スタック

本フロントエンドを実現するためのモダンで軽量な技術スタックです。

- **フレームワーク：** `React` (Next.js) または `Vue.js` (Nuxt)
  - クロスプラットフォーム（PWA として Web / iOS / Android で動作させるため）を推奨。
- **ネットワーク描画（系統樹ビュー）：** `React Flow` または `D3.js`
  - `React Flow` はノードベースのインタラクティブな UI 構築に極めて優れており、系統樹ビューの実装に最適です。
- **Nostr プロトコル通信：** `nostr-tools` (npm)
  - 公開鍵・秘密鍵の管理、Kind **1042** イベントの構築・署名生成に使用します。
- **状態管理 / キャッシュ：** `React Query`（または `SWR`）
  - インデクサー API からのデータ取得とキャッシュ管理をスムーズに行います。
- **スタイリング：** `Tailwind CSS` または `shadcn/ui`
  - コンポーネント駆動の UI 開発に適しています。

---

## 4. クライアント側のデータフロー（インデクサーとの連携）

フロントエンド・アプリは、直接 Nostr リレーと WebSocket で通信するのではなく、インデクサー層の REST API を利用して画面を構築します。

### 4.1 主要 API エンドポイントと利用画面の対応

| API エンドポイント | 利用画面 | 用途 |
|---|---|---|
| `GET /api/v1/inquiries` | ホーム・ビュー | タイムライン（全件新着順）の取得 |
| `GET /api/v1/inquiries/query` | ホーム・ビュー / 統合検索 | コンテキストマッチング・全文検索・DSL フィルタ |
| `GET /api/v1/inquiries/:id/tree` | 系統樹・ビュー | 派生ツリーの取得・グラフ描画 |

### 4.2 Discovery Feed の構築（コンテキストマッチング）

ホーム・ビューの Discovery Feed は、ユーザーの `context` 設定を使って `/api/v1/inquiries/query` を呼び出します。

```javascript
// ユーザーの農地コンテキスト設定（ローカルに保存）
const myContext = {
  climate_zone:     'warm-temperate',
  soil_type:        'volcanic_ash',
  farming_context:  'no_till',
};

// コンテキストマッチングによる Discovery Feed の取得
async function fetchDiscoveryFeed(context, limit = 20) {
  const params = new URLSearchParams({ ...context, limit });
  const res = await fetch(
    `https://api.your-domain.com/api/v1/inquiries/query?${params}`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const feed = await fetchDiscoveryFeed(myContext);
```

### 4.3 全文検索とハイライト表示

統合検索ビューでの全文検索と `highlight` フィールドのレンダリング例です。

```javascript
async function searchInquiries({
  q, soilType, phase, dslModel, dslVar, dslRole, limit = 20, offset = 0
}) {
  const params = new URLSearchParams();
  if (q)        params.set('q',          q);
  if (soilType) params.set('soil_type',  soilType);
  if (phase)    params.set('phase',      phase);
  if (dslModel) params.set('dsl_model',  dslModel);
  if (dslVar)   params.set('dsl_var',    dslVar);
  if (dslRole)  params.set('dsl_role',   dslRole);
  params.set('limit',  limit);
  params.set('offset', offset);

  const res = await fetch(
    `https://api.your-domain.com/api/v1/inquiries/query?${params}`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ハイライトのレンダリング（React の場合）
// highlight フィールドはサーバー側でXSSエスケープ済み。
// <em> タグによるハイライト表示に dangerouslySetInnerHTML を使用する。
function InquiryCard({ item }) {
  const displayHtml = item.highlight ?? item.content;
  return (
    <div
      className="inquiry-card"
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  );
}
```

### 4.4 系統樹ビューの描画ロジック（React Flow）

インデクサーから取得した再帰的なツリーデータ（JSON）を React Flow 用の Nodes / Edges に変換します。

```javascript
// GET /api/v1/inquiries/:id/tree のレスポンス構造:
// { id, content, createdAt, parent_id, children: [...] }

// コンテキストの色マッピング（soil_type ベース）
const SOIL_COLOR = {
  volcanic_ash: '#6B4226',
  alluvial:     '#8D8D8D',
  sandy:        '#D4A96A',
  clay:         '#9B6B4A',
  peat:         '#4A3B2A',
};

// タグ配列から特定のキーの値を取得するユーティリティ
function getTagValue(tags, key, subKey = null) {
  const tag = (tags ?? []).find(t =>
    t.tagKey === key && (subKey === null || t.tagValue1 === subKey)
  );
  return tag?.tagValue2 ?? null;
}

// ツリーデータを React Flow の Nodes / Edges に変換
function transformToGraph(node, x = 0, y = 0, nodes = [], edges = []) {
  const soilType = getTagValue(node.tags, 'context', 'soil_type');
  const hasDsl   = (node.tags ?? []).some(t => t.tagKey === 'dsl:model');

  // 1. ノードの登録
  nodes.push({
    id:       node.id,
    position: { x, y },
    data: {
      label:    node.content,
      soilType,
      trigger:  getTagValue(node.tags, 'trigger'),
      hasDsl,
    },
    type:  'customInquiryNode',
    style: { backgroundColor: SOIL_COLOR[soilType] ?? '#4CAF50' },
  });

  // 2. 子ノードの再帰処理
  node.children?.forEach((child, index) => {
    const childX = x + (index * 280) - ((node.children.length - 1) * 140);
    const childY = y + 160;

    // エッジのスタイルを derived_from / synthesis で区別
    const isSynthesis = child.relation_type === 'synthesis';
    edges.push({
      id:       `edge-${node.id}-${child.id}`,
      source:   node.id,
      target:   child.id,
      label:    isSynthesis ? '結合' : '派生',
      animated: true,
      style:    isSynthesis
        ? { stroke: '#FF6B35', strokeWidth: 3 }
        : { stroke: '#4CAF50', strokeWidth: 1.5, strokeDasharray: '5,5' },
    });

    transformToGraph(child, childX, childY, nodes, edges);
  });

  return { nodes, edges };
}

// 使用例
const treeData = await fetch(
  `https://api.your-domain.com/api/v1/inquiries/${rootEventId}/tree`
).then(r => r.json());

const { nodes, edges } = transformToGraph(treeData);
// => <ReactFlow nodes={nodes} edges={edges} /> に渡すだけでグラフ完成
```

### 4.5 DSL タグの解釈ロジック（2行レコードパターン）

API レスポンスの `tags` 配列では、DSL タグは2行レコードパターンで格納されています（INDEXER_API_SETUP v0.2.0 §5.2 / API_REFERENCE v0.2.0 §タグの読み方 参照）。以下のユーティリティ関数でモデル単位に整形します。

```javascript
/**
 * tags 配列から DSL モデルを解釈し、構造化されたオブジェクトの配列を返す。
 *
 * 2行レコードパターン（API_REFERENCE §タグの読み方 より）:
 *   dsl:model  tagValue1=model_id, tagValue2=モデル名
 *   dsl:var    tagValue1=model_id, tagValue2=変数名  （奇数行）
 *              tagValue1=model_id, tagValue2=ロール   （偶数行）
 *   dsl:rel    tagValue1=model_id, tagValue2=起点変数 （奇数行）
 *              tagValue1=model_id, tagValue2=終点変数 （偶数行）
 */
function parseDslModels(tags) {
  const dslModels = {};

  // 1. モデル宣言の収集
  tags
    .filter(t => t.tagKey === 'dsl:model')
    .forEach(t => {
      dslModels[t.tagValue1] = {
        modelId:   t.tagValue1,
        modelName: t.tagValue2,
        vars:      [],
        rels:      [],
      };
    });

  // 2. 変数宣言の収集（2行1ペア: 変数名行 + ロール行）
  const varRows = tags.filter(t => t.tagKey === 'dsl:var');
  for (let i = 0; i < varRows.length; i += 2) {
    const nameRow = varRows[i];
    const roleRow = varRows[i + 1];
    if (!nameRow || !roleRow) break;
    const model = dslModels[nameRow.tagValue1];
    if (model) {
      model.vars.push({ name: nameRow.tagValue2, role: roleRow.tagValue2 });
    }
  }

  // 3. 関係宣言の収集（2行1ペア: 起点変数行 + 終点変数行）
  const relRows = tags.filter(t => t.tagKey === 'dsl:rel');
  for (let i = 0; i < relRows.length; i += 2) {
    const srcRow = relRows[i];
    const dstRow = relRows[i + 1];
    if (!srcRow || !dstRow) break;
    const model = dslModels[srcRow.tagValue1];
    if (model) {
      model.rels.push({ source: srcRow.tagValue2, target: dstRow.tagValue2 });
    }
  }

  return Object.values(dslModels);
}

// 使用例
const dslModels = parseDslModels(inquiry.tags);
// => [
//   { modelId: 'm1', modelName: 'climate_model',
//     vars: [{ name: 'microclimate', role: 'independent' },
//            { name: 'weed_flora',   role: 'dependent'   }],
//     rels: [{ source: 'microclimate', target: 'weed_flora' }] },
//   { modelId: 'm2', modelName: 'soil_model', ... }
// ]
```

---

## 5. アイデンティティ（鍵）とプライバシーの管理

1. **秘密鍵（nsec）はブラウザ/端末内に封じ込める：** 農家が初回起動時に生成（またはインポート）した Nostr の秘密鍵は、ブラウザの `localStorage` またはアプリの `SecureStorage` にのみ保存され、インデクサー API や外部サーバーには決して送信されません。Kind 1042 イベントの署名はすべてクライアント側で `nostr-tools` を用いて行います。

2. **投稿時の匿名性の選択：** システムは「誰が」問いを発したかよりも「どのような環境（コンテキスト）から」発されたかを重視します。プロフィール（Nostr Kind: 0）の設定は任意であり、完全に匿名（公開鍵の羅列）のままでもコモンズに参加・貢献できるよう UI を設計します。

3. **`trigger` タグのクライアント生成ガイドライン（TOITOI_PROTOCOL_SCHEMA v0.1.2 §2.5 準拠）：**
   - センサー連携機能を実装する場合、センサー値が閾値を超えた際に `["trigger", "sensor_anomaly", "<センサー種別>"]` タグを自動付与することを推奨します。
   - 農家の観察入力からの場合は `["trigger", "farmer_observation", "<観察種別>"]` をサジェスト選択式で付与します。
   - `trigger` タグが付与されない問い（自発的な直感による問い）も完全に有効であり、UI 上で差別化しません。

4. **生データは絶対に外部へ送らない：** フロントエンドが扱うのは、ローカル AI がすでに抽象化・構造化した「問い」（Nostr Event Kind 1042）のみです。IoT センサーの生値・緯度経度・農場名などの個人特定情報は、エッジ層から外に出ることなく、フロントエンドに届くことはありません。

---

## 6. 用語・タグ対応表（UI表示文言）

フロントエンドでユーザーに表示する際の日本語表記は以下を推奨します。

### Context タグ

| タグ値 | UI表示文言 |
|---|---|
| `subarctic` | 亜寒帯 |
| `cool-temperate` | 冷温帯 |
| `warm-temperate` | 暖温帯 |
| `subtropical` | 亜熱帯 |
| `volcanic_ash` / `andisol` | 火山灰土（黒ボク土） |
| `alluvial` | 沖積土 |
| `sandy` | 砂土 |
| `clay` | 粘土質 |
| `peat` | 泥炭土 |
| `open_field` | 露地栽培 |
| `greenhouse_unheated` | 無加温ハウス |
| `greenhouse_heated` | 加温ハウス |
| `no_till` | 不耕起栽培 |
| `organic` | 有機栽培 |
| `conventional` | 慣行栽培 |
| `solanaceae` | ナス科 |
| `brassica` | アブラナ科 |
| `legume` | マメ科 |
| `cucurbitaceae` | ウリ科 |
| `poaceae` | イネ科 |

### Relationship 要素

| タグ値 | UI表示文言 |
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

### Phase（熟達フェーズ）

| タグ値 | UI表示文言 | 説明 |
|---|---|---|
| `beginner` | 初心者向け | 単一の事象・物理的な変化への観察を促す問い |
| `intermediate` | 中級者向け | 複数要素の関係性・目に見えない要因への推論を促す問い |
| `expert` | 上級者向け | 生態系全体を俯瞰する高度な相互作用への問い |

### Trigger（問いの起点）

| タグ値 | UI表示文言 | アイコン |
|---|---|---|
| `sensor_anomaly` | センサー異常 | 🌡️ |
| `farmer_observation` | 農家観察 | 👁 |
| `periodic_review` | 定期レビュー | 📅 |
| `external_event` | 外部イベント | 🌧 |

### DSL 変数ロール

| タグ値 | UI表示文言 |
|---|---|
| `independent` | 独立変数（仮説的な原因） |
| `dependent` | 従属変数（問いの対象） |
| `mediator` | 媒介変数（中間経路） |
| `moderator` | 調整変数（条件付け要因） |

---

*Created for the "Digital Agroecology Commons" Project.*
*Based on the theory of "テクノロジーを手放す農業論 (Agriculture that Lets Go of Technology)".*

*FRONTEND_UX_DESIGN.md v0.2.0 — May 2026*

*Conforms to: ARCHITECTURE v0.3.0 / TOITOI_PROTOCOL_SCHEMA v0.1.2 / API_REFERENCE v0.2.0 / INDEXER_API_SETUP v0.2.0*