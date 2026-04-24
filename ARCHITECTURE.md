# Digital Agroecology Commons: System Architecture Detailed Design v2.1

*[日本語は下に続きます]*

**Version: 2.1** | Main updates from the previous version (v2.0):
* §3.2: Corrected `nutrient` → `nutrient_cycle` to align with TOITOI_PROTOCOL_SCHEMA.md (the authoritative protocol specification).
* §3.2: Added `clay` and `andisol` to `soil_type` vocabulary (sync with SCHEMA §2.1).
* §3.2: Added `farming_context` and `crop_family` context categories (sync with SCHEMA §2.1).

## 1. System Overview

This system is a decentralized platform implementing the "Circulation of Inquiry" based on the theory of "[Letting Go of Technology in Agriculture](./Letting-Go-of-Technology-in-Agriculture.md)". Built on the Nostr protocol, it features no centralized database and consists of edge devices, decentralized relays hosted by volunteers, and a permanent archive using Git.

### 1.1 Data Flow and Component Integration

```text
[ Local Farmland (Local Context) ]
  ① IoT Sensors / Observation Records
      │ (Raw data - Private)
      ▼
  ② Local AI Engine (Inside Edge Device)
      ├─ Converts raw data into "Inquiries (Problematizing)"
      ├─ Cryptographic signing with secret key (nsec)
      └─ Generates JSON (Nostr Event Kind:11042)
      │
      ▼ (WebSocket WSS / Multi-publish)
===================================================================
[ Commons Relay Layer (P2P Network) ]
  ③ Anchor Relay (wss://relay.cultivationdata.net)
  ③ Community Relay (wss://relay.local-agri.org) ...etc
      │ 
      ├─ (Allows only Kind:11042 and saves to PostgreSQL)
      └─ [NEW] JSONL + Git Archive (Permanent storage of tamper-proof history)
===================================================================
      │ (WebSocket WSS / Subscribe)
      ▼
[ Commons API / Indexer Layer ]
  ④ API Server (Node.js/Go)
      ├─ Continuously fetches events from relays & caches to RDB
      └─ Recursively parses `e` tags to build "Evolutionary Trees"
      │
      ▼ (HTTP REST API)
[ User Interface (Web/App) ]
  ⑤ Farmer's Dashboard
      ├─ Visualizes the network of inquiries (Mind map)
      └─ Provides new insights through context matching
```

---

## 2. Detailed Module Design

### 2.1 Commons Relay Layer (Backend / Decentralized Infrastructure)

A relay network designed to build a permanent knowledge database independent of specific companies.

*   **Base Software:** `Nostream` (TypeScript) or `Khatru` (Go)
*   **Infrastructure Requirements:** Minimum 1vCPU / 1GB RAM / 20GB SSD (can run on cheap VPS or Raspberry Pi 4).
*   **Custom Filtering Specs (Application-specific Relay):**
    Unlike standard Nostr relays, strict admission policies are enforced at the relay level:
    1. Must be `kind === 11042`.
    2. Must contain the `["t", "agroecology"]` tag.
    3. Payload size must be less than 20KB (rejecting images or massive data embeddings).
*   **Permanent Archiving of Knowledge Lineage (JSONL + Git):**
    To prepare for PostgreSQL failures or VPS termination, we implement an archiving mechanism utilizing the nature of Nostr events as "self-contained, cryptographically signed data." By periodically exporting differential events in `JSONL` format via the `nak` tool and committing them to a Git repository, we ensure complete protocol-level portability and recoverability independent of infrastructure.
*   **Distribution Format:**
    A pre-configured `docker-compose.yml` and automated archiving scripts will be released as OSS on GitHub, allowing anyone (e.g., regional ag-coops) to launch their own community relay.

### 2.2 Local AI Edge Layer (Sender / Source)

A private module holding raw data (context), generating and signing inquiries as "Boundary Objects."

*   **Software Requirements:** Node.js, Python, etc.
*   **Key Management:**
    Each farmer's Nostr secret key (`nsec` / `hex`) is stored in a secure local area (environment variables or encrypted storage). **Keys are never transmitted to the cloud.**
*   **Problematizing Pipeline:**
    1. **Input:** Array data from soil moisture sensors over the past week + farmer's text memos.
    2. **LLM Processing:** A dedicated prompt ("Output relational inquiries in JSON without providing prescriptions") is passed to a local small LLM (e.g., Llama-3) or commercial API (e.g., Claude 3.5 Sonnet).
    3. **Event Construction:** Constructs and signs a Kind 11042 event using libraries like `nostr-tools`.
*   **Multi-publish Logic:**
    For fail-safe redundancy, the `EVENT` message is simultaneously broadcast to three or more configured relays (anchor relay, community relay, public relay).

### 2.3 Commons API & Indexer Layer (Receiver / API & DB)

An intermediate server that collects data from decentralized relays and reconstructs it into "Lineages (Trees)" for easy frontend consumption.

*   **Tech Stack:** Node.js (Express) or Go, PostgreSQL (or SQLite)
*   **Indexer DB Schema (Conceptual):**
    *   `events`: id, pubkey, content, created_at
    *   `tags`: id, event_id, key (e.g., context, relationship), value1, value2
    *   `lineages`: parent_event_id, child_event_id, relation_type (derived_from, synthesis)
*   **REST API Endpoint Design:**
    *   `GET /api/v1/inquiries`: Fetch the latest inquiries (with pagination).
    *   `GET /api/v1/inquiries/search`: Filter search based on `context` tags (soil, climate, etc.).
    *   `GET /api/v1/inquiries/tree/:id`: Takes a specified event ID as the root, recursively joins the `lineages` table, and returns an N-level deep tree structure of child nodes (derived/synthesized inquiries) as JSON (for graph rendering).

### 2.4 Frontend Viewer Layer (UI/UX)

*   **Tech Stack:** React, Vue.js, etc. / `React Flow` or `D3.js` (for network drawing)
*   **Core UI:**
    In addition to a "Timeline view," it provides a "Tree-map view (Node & Edge)" that shows how specific inquiries have undergone translational co-evolution. By clicking on a node (inquiry), farmers can compare and reference "contexts" and "inquiries" from other regions.

---

## 3. Core Protocol Specification: Nostr Event (Kind: 11042)

The data payload specification for the "Form of Inquiry (Boundary Object)," which is the lifeline of this system.

### 3.1 JSON Payload Schema

```json
{
  "kind": 11042,
  "pubkey": "<32-bytes hex string>",
  "created_at": <Unix timestamp>,
  "content": "<string: Inquiry text articulated by AI or farmer>",
  "tags": [
    // [Required] For commons routing
    ["t", "agroecology"],

    // [Required / Multiple allowed] Context: Abstracted metadata of locality
    // Format: ["context", "<category>", "<value>"]
    ["context", "climate_zone", "warm-temperate"],
    ["context", "soil_type", "volcanic_ash"],

    // [Required / Multiple allowed] Relationship: Observation category
    // Format: ["relationship", "<element1>", "<element2>"]
    ["relationship", "microclimate", "weed_flora"],

    // [Required] Phase: Mastery level for scaffolding targeting
    // Values: "beginner" | "intermediate" | "expert"
    ["phase", "intermediate"],

    // [Optional] Trigger: Origin of this inquiry (e.g., sensor anomaly)
    ["trigger", "sensor_anomaly", "soil_moisture"],

    // [Optional / Multiple allowed] Lineage: Chain of translation
    // Format: ["e", "<parent_event_id>", "<relay_url>", "<relation_type>"]
    // relation_type: "derived_from" | "synthesis"
    ["e", "parent_id_hex...", "wss://relay.cultivationdata.net", "derived_from"]
  ],
  "id": "<32-bytes hex string: sha256(serialize(event))>",
  "sig": "<64-bytes hex string: schnorr_signature(id, privkey)>"
}
```

### 3.2 Recommended Vocabulary for Context / Relationship

To overcome the dilemma of locality while generating searchable "weak ties," tag values are standardized by the frontend/AI using a recommended vocabulary rather than completely free text.

*   **Context (climate_zone):** `subarctic`, `cool-temperate`, `warm-temperate`, `subtropical`
*   **Context (soil_type):** `volcanic_ash` / `andisol`, `alluvial`, `peat`, `sandy`, `clay`
*   **Context (farming_context):** `open_field`, `greenhouse_unheated`, `greenhouse_heated`, `no_till`, `organic`, `conventional`
*   **Context (crop_family):** `solanaceae`, `brassica`, `legume`, `cucurbitaceae`, `poaceae`
*   **Relationship (Elements):** `soil_moisture`, `weed_flora`, `pest`, `natural_enemy`, `microclimate`, `nutrient_cycle`, `soil_physical`, `soil_microbe`, `crop_vitality`

---

## 4. Commons Governance and Social Implementation

Operational policies to maintain Ostrom's "Design principles for Common Pool Resources".

1.  **Portability of Identity (Public Key):**
    Farmers do not register users (no email/password creation) on the system. The locally generated secret/public key pair serves as the ID. Even if the API layer or dashboard stops operating, they can regain access to their "lineage of inquiries" by entering their public key into another aggregator app.
2.  **Preservation of History (Tamper-proof Guarantee):**
    Thanks to the JSONL + Git archiving mechanism, not even relay operators can secretly alter or delete the "lineage of inquiries." The Git commit log serves directly as the "chronicle of agroecology," technically guaranteeing the transparency and reliability of the entire commons.
3.  **Spam Defense and Web of Trust (Utilizing NIP-32/NIP-51):**
    Since it's an open network, there's a risk of spam. To prevent this, we will introduce an algorithm that utilizes Nostr's "Mute lists" and "Follow lists" to prioritize (weight) inquiries on the UI only from public keys approved by the "actual farmer network (Web of Trust)."
4.  **Protocol Updates:**
    If changes to tag specifications for Kind:11042 occur, proposals and consensus-building will be conducted community-based on the Nostr network, similar to NIPs (Nostr Implementation Possibilities).

---

# デジタル・アグロエコロジー・コモンズ：システムアーキテクチャ詳細設計書 v2.1

**バージョン：2.1**　｜　前バージョン (v2.0) からの主なアップデート：
* §3.2：`nutrient`（養分）→ `nutrient_cycle`（養分循環）に修正（TOITOI_PROTOCOL_SCHEMA.md 正典への統一）。
* §3.2：`soil_type` に `clay`（粘土質）・`andisol`（黒ボク土の別名）を追記（SCHEMA §2.1 との同期）。
* §3.2：`farming_context`（栽培環境・農法）・`crop_family`（対象作物群）の context カテゴリを追加（SCHEMA §2.1 との同期）。

## 1. システム・オーバービュー

本システムは、『[テクノロジーを手放す農業論](./Tech-wo-Tebanasu-Nogyoron.md)』に基づく「問いの循環」を実装する分散型プラットフォームです。Nostrプロトコルを基盤とし、中央集権的なデータベースを持たず、農家のエッジデバイスと有志がホスティングする分散リレー、およびGitによる永続的アーカイブによって構成されます。

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
      │ 
      ├─ (Kind:11042 のみを許可しPostgreSQLへ保存)
      └─ [NEW] JSONL + Git アーカイブ (改ざん不可能な歴史の永続化)
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
    3.  ペイロードサイズが 20KB 未満であること（画像や巨大なデータの埋め込みを拒否）。
*   **知識の系譜の永続化（JSONL + Git アーカイブ）:**
    PostgreSQL（運用DB）の障害やVPSの廃止に備え、Nostrイベントが「自己完結した暗号署名済みデータ」である特性を活かしたアーカイブ機構を実装します。`nak` ツールを用いて定期的に差分イベントを `JSONL` 形式でエクスポートし、Gitリポジトリにコミットします。これにより、インフラに依存しない「プロトコルレベルでの完全な可搬性と復元性」を担保します。
*   **配布形態:**
    誰でも独自の地域リレーを立ち上げられるよう、上記設定済みの環境を `docker-compose.yml` および自動アーカイブスクリプトとともにGitHubでOSSとして公開します。

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
*   **Context (soil_type):** `volcanic_ash` / `andisol` (黒ボク土), `alluvial` (沖積土), `peat` (泥炭土), `sandy` (砂土), `clay` (粘土質)
*   **Context (farming_context):** `open_field` (露地), `greenhouse_unheated` (無加温ハウス), `greenhouse_heated` (加温ハウス), `no_till` (不耕起), `organic` (有機), `conventional` (慣行)
*   **Context (crop_family):** `solanaceae` (ナス科), `brassica` (アブラナ科), `legume` (マメ科), `cucurbitaceae` (ウリ科), `poaceae` (イネ科)
*   **Relationship (要素群):** `soil_moisture` (土壌水分), `weed_flora` (雑草相), `pest` (害虫), `natural_enemy` (天敵), `microclimate` (微気候), `nutrient_cycle` (養分循環), `soil_physical` (土壌物理性), `soil_microbe` (土壌微生物), `crop_vitality` (作物の活力)

---

## 4. コモンズのガバナンスと社会実装へ向けて

オストロムの「コモンズの設計原則」を維持するための運用方針です。

1.  **アイデンティティ（公開鍵）のポータビリティ:**
    農家はシステムにユーザー登録（メアド・パスワードの作成）を行いません。ローカルで生成した秘密鍵/公開鍵ペアがIDとなります。万が一API層やダッシュボードの運営が停止しても、別のアグリゲートアプリに公開鍵を入力すれば、自身の「問いの系譜」にアクセスし直すことができます。
2.  **歴史の保存（改ざん不可能性の担保）:**
    JSONL + Git アーカイブ機構により、リレー運営者ですら「問いの系譜」を密かに改ざん・削除することは不可能です。Gitのコミットログがそのまま「アグロエコロジーの年表」となり、コモンズ全体の透明性と信頼性を技術的に担保します。
3.  **スパム防御とWeb of Trust (NIP-32/NIP-51の活用):**
    オープンなネットワークであるため、スパムデータの混入リスクがあります。これを防ぐため、Nostrの「Muteリスト」や「Followリスト」を活用し、「実際の農家ネットワーク（Web of Trust）」から承認されている公開鍵からの問いのみをUI上で優先表示（重みづけ）するアルゴリズムを導入します。
4.  **プロトコルのアップデート:**
    Kind:11042のタグ仕様変更等が発生した場合は、Nostrネットワーク上でNIP（Nostr Implementation Possibility）のような形でコミュニティベースでの提案・合意形成を行います。

---
*Created for the "Digital Agroecology Commons" Project. Based on the theory of "Agriculture that Lets Go of Technology".*
