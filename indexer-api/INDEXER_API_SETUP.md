# Toitoi インデクサー・アーキテクチャ設計書：問いの系譜の抽出とAPI提供
**バージョン: 1.0**

本ドキュメントは、デジタル・アグロエコロジー・コモンズ「Toitoi」における **コモンズAPI・インデクサー層** のリファレンス実装ガイドです。

この層は、分散するNostrリレーネットワークからアグロエコロジーの「問い（Kind: 11042）」を継続的に収集（サブスクライブ）し、複雑な関係性メタデータ（コンテキスト、系譜）を高速に検索・描画可能な状態へと再構築（インデックス化）して、フロントエンド・アプリケーションにREST APIとして提供する役割を担います。

---

## 1. インデクサー層の基本思想と役割

1.  **分散ネットワークの「地図」を作成する:**
    Nostrのプロトコル仕様上、リレーサーバーは「データの蓄積と配信」に特化しており、複雑な検索（「黒ボク土で、かつ、ある特定の問いから派生した問いの一覧」など）や、ツリー構造の抽出には不向きです。本インデクサーは、リレーから取得した生のイベントデータをRDB（リレーショナルデータベース）に展開し、高度なクエリを可能にします。
2.  **キャッシュ層としての機能:**
    フロントエンド（モバイルアプリ等）が直接複数のNostrリレーにWebSocket接続してデータを組み立てるのは、通信量と処理負荷の観点から非現実的です。インデクサーが中間に立つことで、アプリ側は軽量なHTTPリクエストのみで「系統樹（ツリー）」を取得できます。
3.  **複数インデクサーの許容（非中央集権性の維持）:**
    このインデクサー・システム自体もオープンソースとして公開されます。「公式インデクサー」がダウンしても、コミュニティや企業が独自のインデクサーを立ててリレーからデータを再構築できるため、システムの中央集権化（単一障害点）を防ぎます。

---

## 2. システム・アーキテクチャ構成

*   **ワーカー・プロセス (Listener):** 複数のリレー（`wss://...`）に常時接続し、新しいイベント（Kind: 11042）をリアルタイムで受信してDBにパース・保存するプロセス。
*   **API・プロセス (Server):** クライアント（アプリ）からのHTTPリクエストを受け付け、DBからデータを抽出してJSON形式でレスポンスを返すプロセス。
*   **データベース:** PostgreSQL または SQLite（JSON系の検索や再帰クエリに強いRDBを推奨）。
*   **想定技術スタック:** Node.js (Express, TypeORM / Prisma) または Go。

---

## 3. データベース設計（スキーマ）

Nostrのイベント（JSON）を効率的に検索・再構築するためのRDBスキーマ設計です。

### 3.1 テーブル構成

#### `events` テーブル（イベントの基本情報）
*   `id` (String / Primary Key): イベントのハッシュ値（64文字のHex）
*   `pubkey` (String / Index): 農家の公開鍵
*   `content` (Text): 問いの本文
*   `created_at` (Integer / Index): Unixタイムスタンプ
*   `raw_json` (JSONB): 受信したNostrイベントの完全なJSON（署名の検証やバックアップ用）

#### `tags` テーブル（検索用のメタデータ展開）
Nostrの `tags` 配列を、キー・バリュー形式で正規化して保存します。
*   `id` (Integer / Primary Key / Auto Increment)
*   `event_id` (String / Foreign Key -> events.id / Index)
*   `tag_key` (String / Index): 例 `"context"`, `"relationship"`, `"phase"`
*   `tag_value1` (String / Index): 例 `"soil_type"`
*   `tag_value2` (String): 例 `"volcanic_ash"`

#### `lineages` テーブル（問いの系譜・ツリー構築用）
`e` タグ（他のイベントへの参照）を抽出し、親子関係（グラフ構造）を定義します。
*   `id` (Integer / Primary Key / Auto Increment)
*   `child_event_id` (String / Foreign Key -> events.id / Index): 派生した（子）問いのID
*   `parent_event_id` (String / Index): 参照元（親）の問いのID
*   `relation_type` (String): `"derived_from"` (派生) または `"synthesis"` (結合)

---

## 4. REST API エンドポイント設計

フロントエンド（ダッシュボードやアプリ）に向けて提供する主なエンドポイントです。

### 4.1 問いの検索・一覧取得
特定の翻訳的文脈（属地性や観察カテゴリ）に合致する「問い」を抽出します。

*   **Endpoint:** `GET /api/v1/inquiries`
*   **Query Parameters:**
    *   `context_climate`: (String) 例 `warm-temperate`
    *   `context_soil`: (String) 例 `volcanic_ash`
    *   `relationship`: (String) 例 `microclimate`
    *   `phase`: (String) 例 `intermediate`
    *   `limit` / `offset`: ページネーション用
*   **Response (JSON):**
    ```json
    {
      "total": 124,
      "inquiries": [
        {
          "id": "abc123def...",
          "pubkey": "a1b2c3...",
          "created_at": 1712800000,
          "content": "北側斜面において、土壌の乾きの遅さとスギナの繁茂に...",
          "context": {
            "climate_zone": "warm-temperate",
            "soil_type": "volcanic_ash"
          },
          "relationship": ["microclimate", "weed_flora"],
          "phase": "intermediate",
          "reply_count": 5 // この問いから派生した子の数（lineagesから算出）
        }
      ]
    }
    ```

### 4.2 系統樹（ツリー）の取得 【核心機能】
ある特定の「問い（ルート）」から、どのように派生・結合してネットワークが広がっていったか（翻訳の連鎖）を、再帰的なツリー構造のJSONとして取得します。
フロントエンドはこれを受け取り、マインドマップやグラフとして描画します。

*   **Endpoint:** `GET /api/v1/inquiries/:id/tree`
*   **Response (JSON):**
    ```json
    {
      "id": "ルートとなる最初の問いのID",
      "content": "最初の問いのテキスト...",
      "context": { "soil_type": "volcanic_ash" },
      "derived_inquiries": [
        {
          "relation_type": "derived_from",
          "id": "派生した問い(子)のID",
          "content": "当圃場(黒ボク土)で観察したところ...",
          "context": { "soil_type": "andisol" },
          // さらに再帰的に子ノードが続く
          "derived_inquiries": [
            {
               "relation_type": "synthesis",
               "id": "結合された問い(孫)のID",
               "content": "2つの問いを統合して観察しました...",
               "derived_inquiries": []
            }
          ]
        }
      ]
    }
    ```
*   **実装のポイント (DB再帰クエリ):**
    PostgreSQLを使用する場合、`WITH RECURSIVE` 句（共通テーブル式）を利用することで、`lineages` テーブルから階層の深さを問わず、単一のクエリでツリー全体を高速に抽出できます。

---

## 5. ワーカー・プロセスの実装例（Node.js）

Nostrリレーからイベントを受信し、データベース（概念コード）へパース・保存するインデクサー・ワーカーの処理イメージです。

```javascript
import { Relay } from 'nostr-tools/relay';

// 監視対象のリレー群
const RELAYS = ['wss://relay.cultivationdata.net', 'wss://relay.local-agri.org'];

async function startIndexer() {
    for (const url of RELAYS) {
        const relay = await Relay.connect(url);
        console.log(`🔗 接続完了: ${url}`);

        // Kind 11042 を購読（過去のイベントから最新まで）
        relay.subscribe([{ kinds: [11042] }], {
            onevent(event) {
                processEvent(event);
            }
        });
    }
}

async function processEvent(event) {
    // 1. 重複チェック（すでにDBに存在すればスキップ）
    if (await db.events.exists(event.id)) return;

    // 2. イベント基本情報の保存
    await db.events.insert({
        id: event.id,
        pubkey: event.pubkey,
        content: event.content,
        created_at: event.created_at,
        raw_json: event
    });

    // 3. タグの解析と保存
    for (const tag of event.tags) {
        const [tagKey, val1, val2, val3] = tag;

        // Context / Relationship / Phase 等の保存
        if (['context', 'relationship', 'phase', 'trigger'].includes(tagKey)) {
            await db.tags.insert({
                event_id: event.id,
                tag_key: tagKey,
                tag_value1: val1,
                tag_value2: val2 || null
            });
        }

        // 4. Lineage（系譜）の保存
        if (tagKey === 'e') {
            const parentId = val1;
            const relationType = val3 || 'reference'; // derived_from, synthesis etc.
            
            await db.lineages.insert({
                child_event_id: event.id,
                parent_event_id: parentId,
                relation_type: relationType
            });
        }
    }
    
    console.log(`📥 インデックス化完了: [${event.id}]`);
}

startIndexer();
```

---

## 6. 運用時の考慮事項

1.  **データ検証（Signature Validation）:**
    インデクサーはリレーを完全に信用せず、受信したイベントの `id`（ハッシュ）と `sig`（署名）を独自の処理で再検証（`verifyEvent`）してからDBに保存すべきです。これにより、悪意のあるリレーからの改ざんデータを排除できます。
2.  **インデクサーの同期状態の管理:**
    ワーカープロセスが再起動した際、リレーの最初からデータを読み直すと負荷がかかるため、「どこまで読み込んだか（最新の `created_at`）」をリレーごとにDBに記録し、次回は `--since` パラメータで差分のみを取得する設計が必須です。
