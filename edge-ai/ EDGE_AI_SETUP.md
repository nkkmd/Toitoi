# Toitoi エッジ・アーキテクチャ設計書：ローカルAIと「問い」の生成
**バージョン: 0.2.0**　｜　前バージョン (v0.1.1) からの主な修正：
* §4 コード例のリレー数を3つに拡張（アンカー・地域・パブリック）し、`Promise.allSettled()` による並列送信に変更（ARCHITECTURE §2.2 フェイルセーフ要件への対応）。
* §4 コード例の `relationship` タグ値を `nutrient_cycle` → `nutrient` に修正（ARCHITECTURE §3.2 推奨ボキャブラリーへの統一）。
* §3・§4 に `trigger` タグのサンプルおよびコメントを追加（ARCHITECTURE §3.1 任意タグ仕様の明示）。

本ドキュメントは、デジタル・アグロエコロジー・コモンズ「Toitoi」における **ローカルAI・エッジ層（エッジクライアント）** のリファレンス実装ガイドです。

この層は、農地固有の「生データ（センサー値・観察メモ）」を、他者が翻訳可能な「境界対象（バウンダリー・オブジェクト）」としての **『問い（Kind: 1042）』** に変換し、Nostrコモンズ・ネットワークへ送信する役割を担います。

---

## 1. エッジ層の基本思想とセキュリティ原則

1.  **ゼロ・データ・エクスポージャー（生データの完全隠蔽）:**
    土壌水分量、温度の時系列データ、正確な位置情報（GPS）などの生データは、農家のスマートフォンやローカルPC、エッジサーバー内に**完全に留め置かれます**。クラウドやリレーサーバーには一切送信しません。
2.  **秘密鍵のローカル管理:**
    Nostrプロトコルの根幹であるアイデンティティ（秘密鍵：`nsec` / `hex`）は、エッジデバイス内のみに保存され、すべてのイベント（問い）は送信前にローカルで暗号署名されます。
3.  **「答え」ではなく「問い」の抽出（Problematizing）:**
    ローカルAIは、データから「明日の朝に灌水せよ」というマニュアル（答え）を導き出すのではなく、「なぜ北側区画の乾きが遅いのか？」という『問い』を導き出すようプロンプト設計されます。

---

## 2. エッジ・パイプラインの構成

ローカルAIクライアントは、以下の4つのパイプラインで動作します。

```text
[生データ] ──(1.収集)──> [ローカルDB] ──(2.LLM解析)──> [『問い』の生成] ──(3.Nostr署名)──> [マルチパブリッシュ(送信)]
```

### 2.1 データ収集フェーズ
*   **IoTセンサー:** 水分、温度、照度などの時系列データをローカル（SQLite等）に保存。
*   **人間の観察:** 農家がアプリに入力した「テキストメモ」や「写真」。

### 2.2 LLM解析フェーズ（Problematizing）
収集したコンテキストをLLM（ローカルで動く Llama-3-8B や、商用APIの Claude 3.5 Sonnet 等）に渡し、以下のプロンプト制約のもとでJSONを出力させます。

> **[システムプロンプトの例]**
> あなたはアグロエコロジー実践を支援する認知的パートナー（AI）です。提供されたセンサーデータと農家の観察メモを読み解き、「処方箋（答え）」ではなく、農家の生態学的直感を刺激する「関係性についての問い」を生成してください。出力は指定された Toitoi Nostr Schema に準拠した JSON 形式のみとします。

### 2.3 イベント署名フェーズ
出力されたJSONを、`nostr-tools` 等のライブラリを使用してハッシュ化（ID生成）し、農家の秘密鍵でシュノア署名（Schnorr signature）を施します。

### 2.4 マルチパブリッシュ・フェーズ
署名済みのイベントを、コモンズを構成する**3つ以上**のリレー（アンカーリレー、地域リレー、パブリックリレー）へWebSocket（`wss://`）経由で**並列に**同時送信します。フェイルセーフのため、いずれかのリレーへの送信が失敗しても他のリレーへの送信は継続されます。

---

## 3. 送信データの構造（概要）

生成されるNostrイベント（JSON）の基本的な構造です。
※ 各タグ（`context`, `relationship`等）の厳密な定義と標準ボキャブラリーについては、システム全体の共通仕様書である **[`TOITOI_PROTOCOL_SCHEMA.md`](../TOITOI_PROTOCOL_SCHEMA.md)** を必ず参照して実装してください。

```json
{
  "kind": 1042,
  "pubkey": "<農家の公開鍵 (32-bytes hex)>",
  "created_at": <Unix Timestamp>,
  "content": "北側斜面において、土壌の乾きの遅さとスギナの繁茂に相関が見られます。この微気候は天敵群集にどのような影響を与えているでしょうか？",
  "tags": [
    ["t", "agroecology"],
    ["context", "climate_zone", "warm-temperate"],
    ["context", "soil_type", "volcanic_ash"],
    ["relationship", "microclimate", "weed_flora"],
    ["phase", "intermediate"],
    ["trigger", "sensor_anomaly", "soil_moisture"],  // [任意] 問いの起点となったセンサー異常等
    ["e", "<親イベントID>", "wss://relay.toitoi.cultivationdata.net", "derived_from"]
  ],
  "id": "<sha256(serialize(event))>",
  "sig": "<schnorr_signature(id, privkey)>"
}
```

> **`trigger` タグについて:** センサー異常や特定の観察が問いの直接的な起点となった場合に付与する任意タグです（ARCHITECTURE §3.1 参照）。フォーマット: `["trigger", "<category>", "<value>"]`。自動生成パイプラインでは、センサー異常検知時に自動付与することを推奨します。

---

## 4. 実装例（Node.js / nostr-tools）

ローカルのLLMからJSONが出力された後、それをNostrイベントに署名・送信する最小実装のコード例です。

```javascript
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { Relay } from 'nostr-tools/relay';
import WebSocket from 'ws';
global.WebSocket = WebSocket;

// 1. 農家のローカル管理キー（本番環境ではセキュアストレージから読み込む）
const secretKey = generateSecretKey(); 
const pubKey = getPublicKey(secretKey);

// 2. LLMが生成した「問い」のデータ構造 (※詳細は TOITOI_PROTOCOL_SCHEMA.md 参照)
const inquiryPayload = {
    kind: 1042,
    created_at: Math.floor(Date.now() / 1000),
    content: "九州の微気候の問いを当圃場（黒ボク土）で観察したところ、ハコベが優占しました。初期窒素量が関係しているのではないでしょうか？",
    tags: [
        ["t", "agroecology"],
        ["context", "climate_zone", "cool-temperate"],
        ["context", "soil_type", "volcanic_ash"],
        ["relationship", "weed_flora", "nutrient"],         // ← v1.1の "nutrient_cycle" を推奨ボキャブラリー "nutrient" に修正
        ["phase", "intermediate"],
        ["trigger", "sensor_anomaly", "soil_moisture"],     // [任意] センサー異常が問いの起点の場合に付与
        ["e", "abc123def456...", "wss://relay.toitoi.cultivationdata.net", "derived_from"]
    ]
};

// 3. ローカル環境で暗号署名（ここでIDとsigが生成される）
const signedEvent = finalizeEvent(inquiryPayload, secretKey);
console.log("署名済みイベントID:", signedEvent.id);

// 4. コモンズ・ネットワークへ送信（マルチパブリッシュ：3つ以上のリレーへ並列送信）
// フェイルセーフ: Promise.allSettled により、一部のリレーが失敗しても他への送信を継続
async function publishToCommons() {
    const targetRelays = [
        'wss://relay.toitoi.cultivationdata.net',            // アンカーリレー（必須）
        'wss://relay.local.toitoi.cultivationdata.net',      // 地域のコモンズリレー
        'wss://relay.damus.io'                        // パブリックリレー（冗長性確保）
    ];

    const results = await Promise.allSettled(
        targetRelays.map(async (url) => {
            const relay = await Relay.connect(url);
            await relay.publish(signedEvent);
            relay.close();
            return url;
        })
    );

    results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            console.log(`✅ [${targetRelays[i]}] へ送信完了`);
        } else {
            console.error(`❌ [${targetRelays[i]}] への送信失敗:`, result.reason);
        }
    });
}

publishToCommons();
```

---

*このドキュメントはデジタル・アグロエコロジー・コモンズ推進プロジェクトの一環として作成されました。*
*v0.2.0 — 2026年4月改訂*
