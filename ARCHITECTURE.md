# デジタル・アグロエコロジー・コモンズ：システムアーキテクチャ詳細設計書 v1.0

## 1. システム・オーバービュー

本システムは、『テクノロジーを手放す農業論』に基づく「問いの循環」を実装する分散型プラットフォームです。Nostrプロトコルを基盤とし、中央集権的なデータベースを持たず、農家のエッジデバイスと有志がホスティングする分散リレーによって構成されます。

### 1.1 データフローとコンポーネント連携

```text
[ ローカル農地 (Local Context) ]
  ① IoTセンサー / 観察記録
      │ (生データ・非公開)
      ▼
  ② ローカルAIエンジン (エッジデバイス内)
      ├─ 生データを「問い(Problematizing)」に変換
      ├─ 秘密鍵(nsec)で暗号署名
      └─ JSON (Nostr Event Kind:11042) 生成
      │
      ▼ (WebSocket WSS / マルチパブリッシュ)
===================================================================
[ コモンズ・リレー層 (P2P Network) ]
  ③ アンカーリレー (wss://relay.cultivationdata.net)
  ③ コミュニティリレー (wss://relay.local-agri.org) ...etc
      │ (Kind:11042 のみを許可しアーカイブ)
===================================================================
      │ (WebSocket WSS / サブスクライブ)
      ▼
[ コモンズAPI・インデクサー層 ]
  ④ APIサーバー (Node.js/Go)
      ├─ リレーからイベントを継続取得・RDBへキャッシュ
      └─ `e`タグを再帰解析し「系統樹(ツリー)」を構築
      │
      ▼ (HTTP REST API)
[ ユーザーインターフェース (Web/App) ]
  ⑤ 農家のダッシュボード
      ├─ 問いのネットワーク(マインドマップ)を可視化
      └─ 文脈マッチングによる新たな気づきの提供
```

---

## 2. モジュール別詳細設計

### 2.1 コモンズ・リレー層（バックエンド / 分散インフラ）

特定企業に依存しない永続的な知識データベースを構築するためのリレー・ネットワーク。

*   **ベースソフトウェア:** `Nostream` (TypeScript) または `Khatru` (Go)
*   **インフラ要件:** 最小 1vCPU / 1GB RAM / 20GB SSD (月額数百円のVPSやRaspberry Pi 4で稼働可能)
*   **カスタム・フィルタリング仕様 (Application-specific Relay):**
    標準のNostrリレーとは異なり、リレー側で厳格な入場制限（Admission Policy）を設けます。
    1.  `kind === 11042` であること。
    2.  `tags` 内に `["t", "agroecology"]` が存在すること。
    3.  ペイロードサイズが 5KB 未満であること（画像や巨大なデータの埋め込みを拒否）。
*   **配布形態:**
    誰でも独自の地域リレーを立ち上げられるよう、上記設定済みの環境を `docker-compose.yml` とともにGitHubでOSSとして公開します。

### 2.2 ローカルAI・エッジ層（送信 / 発生源）

生データ（コンテキスト）を保有し、「境界対象」としての問いを生成・署名するプライベートモジュール。

*   **ソフトウェア要件:** Node.js, Python など
*   **鍵管理 (Key Management):**
    農家ごとにNostrの秘密鍵 (`nsec` / `hex`) をローカルの安全な領域（環境変数や暗号化ストレージ）に保管します。**絶対にクラウドへ送信しません。**
*   **Problematizing（問題化）パイプライン:**
    1.  **入力:** 直近1週間の土壌水分センサーの配列データ ＋ 農家のテキストメモ。
    2.  **LLM処理:** ローカルの小規模LLM（Llama3等）または商用API（Claude 3.5 Sonnet等）に専用プロンプト（「処方箋を出さず、関係性の問いをJSONで出力せよ」）を渡す。
    3.  **イベント構築:** Nostrの `nostr-tools` 等を用いて Kind 11042 イベントを構築し署名。
*   **マルチパブリッシュ・ロジック:**
    フェイルセーフのため、設定された3つ以上のリレー（アンカーリレー、地域リレー、パブリックリレー）に対して並行して `EVENT` メッセージを送信します。

### 2.3 コモンズAPI・インデクサー層（受信 / API・DB）

分散するリレーからデータを収集し、フロントエンドが利用しやすいよう「系譜（ツリー）」に再構築する中間サーバー。

*   **技術スタック:** Node.js (Express) または Go, PostgreSQL (または SQLite)
*   **インデクサーDBスキーマ (概念):**
    *   `events`: id, pubkey, content, created_at
    *   `tags`: id, event_id, key (例: context, relationship), value1, value2
    *   `lineages`: parent_event_id, child_event_id, relation_type (derived_from, synthesis)
*   **REST API エンドポイント設計:**
    *   `GET /api/v1/inquiries`: 最新の問い一覧を取得（ページネーション対応）。
    *   `GET /api/v1/inquiries/search`: `context` タグ（土壌、気候など）に基づくフィルタリング検索。
    *   `GET /api/v1/inquiries/tree/:id`: 指定したイベントIDをルート（根）とし、`lineages` テーブルを再帰結合して**N階層の子ノード（派生・結合された問い）をツリー構造のJSONとして返す**（グラフ描画用）。

### 2.4 フロントエンド・ビューア層（UI/UX）

*   **技術スタック:** React, Vue.js 等 / `React Flow` または `D3.js` (ネットワーク描画)
*   **コアUI:**
    「タイムライン型」の表示に加え、特定の問いがどのように翻訳的共進化を遂げたかを示す「ツリーマップ型（Node & Edge）」のUIを提供します。農家はノード（問い）をクリックすることで、他地域の「文脈」と「問い」を比較・参照できます。

---

## 3. コア・プロトコル仕様：Nostr Event (Kind: 11042)

本システムの命綱である「問いの形式（バウンダリー・オブジェクト）」のデータペイロード仕様です。

### 3.1 JSON ペイロード・スキーマ

```json
{
  "kind": 11042,
  "pubkey": "<32-bytes hex string>",
  "created_at": <Unix timestamp>,
  "content": "<string: AIまたは農家によって言語化された「問い」のテキスト>",
  "tags": [
    // [必須] コモンズ・ルーティング用
    ["t", "agroecology"],

    // [必須/複数可] Context: 属地性の抽象化メタデータ
    // フォーマット: ["context", "<category>", "<value>"]
    ["context", "climate_zone", "warm-temperate"],
    ["context", "soil_type", "volcanic_ash"],

    // [必須/複数可] Relationship: 観察すべき関係性のカテゴリ
    // フォーマット: ["relationship", "<element1>", "<element2>"]
    ["relationship", "microclimate", "weed_flora"],

    // [必須] Phase: 足場掛け(Scaffolding)の熟達段階
    // 値: "beginner" | "intermediate" | "expert"
    ["phase", "intermediate"],

    // [任意] Trigger: AIがこの問いを生成した起点(センサー異常等)
    ["trigger", "sensor_anomaly", "soil_moisture"],

    // [任意/複数可] Lineage: 問いの系譜（翻訳の連鎖）
    // フォーマット: ["e", "<parent_event_id>", "<relay_url>", "<relation_type>"]
    // relation_type: "derived_from"(派生) | "synthesis"(結合)
    ["e", "parent_id_hex...", "wss://relay.cultivationdata.net", "derived_from"]
  ],
  "id": "<32-bytes hex string: sha256(serialize(event))>",
  "sig": "<64-bytes hex string: schnorr_signature(id, privkey)>"
}
```

### 3.2 Context / Relationship の推奨ボキャブラリー

属地性のジレンマを克服しつつ、検索可能な「弱い連帯」を生むため、タグの値は完全自由記述ではなく、一定の推奨語彙（Vocabulary）をフロントエンド/AI側で標準化します。

*   **Context (climate_zone):** `subarctic`, `cool-temperate`, `warm-temperate`, `subtropical`
*   **Context (soil_type):** `volcanic_ash` (黒ボク土), `alluvial` (沖積土), `peat` (泥炭土), `sandy` (砂土)
*   **Relationship (要素群):** `soil_moisture` (土壌水分), `weed_flora` (雑草相), `pest` (害虫), `natural_enemy` (天敵), `microclimate` (微気候), `nutrient` (養分)

---

## 4. コモンズのガバナンスと社会実装へ向けて

オストロムの「コモンズの設計原則」を維持するための運用方針です。

1.  **アイデンティティ（公開鍵）のポータビリティ:**
    農家はシステムにユーザー登録（メアド・パスワードの作成）を行いません。ローカルで生成した秘密鍵/公開鍵ペアがIDとなります。万が一API層やダッシュボードの運営が停止しても、別のアグリゲートアプリに公開鍵を入力すれば、自身の「問いの系譜」にアクセスし直すことができます。
2.  **スパム防御とWeb of Trust (NIP-32/NIP-51の活用):**
    オープンなネットワークであるため、スパムデータの混入リスクがあります。これを防ぐため、Nostrの「Muteリスト」や「Followリスト」を活用し、「実際の農家ネットワーク（Web of Trust）」から承認されている公開鍵からの問いのみをUI上で優先表示（重みづけ）するアルゴリズムを導入します。
3.  **プロトコルのアップデート:**
    Kind:11042のタグ仕様変更等が発生した場合は、Nostrネットワーク上でNIP（Nostr Implementation Possibility）のような形でコミュニティベースでの提案・合意形成を行います。

---
*Created for the "Digital Agroecology Commons" Project. Based on the theory of "テクノロジーを手放す農業論".*
