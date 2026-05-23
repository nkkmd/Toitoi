# Toitoi エッジ・アーキテクチャ設計書：ローカルAIと「問い」の生成

**Version: 0.4.0** | **Status: evolving** | **Last updated: 2026-05-22**

> **現在の実装状態について:**
> Toitoi は現時点で「概念的に整合（conceptually coherent）しているが、実装詳細は発展途上（implementation-evolving）」な段階にあります。これは分散実験・複数実装・意味的探索を許容するための意図的な設計です。本ドキュメントで「未固定」と記された仕様は、将来的にTIPs（Toitoi Improvement Proposals）を通じて形式化されます。

本ドキュメントは、デジタル・アグロエコロジー・コモンズ「Toitoi」における **ローカルAI・エッジ層（エッジクライアント）** のリファレンス実装ガイドです。

この層は、農地固有の「生データ（センサー値・観察メモ）」を、まず内部で **Canonical Event** として正規化し、必要に応じて Nostr への transport projection として **『問い（Kind: 1042）』** を送信する役割を担います。

---

## 1. エッジ層の基本思想とセキュリティ原則

1.  **ゼロ・データ・エクスポージャー（生データの完全隠蔽）:**
    土壌水分量、温度の時系列データ、正確な位置情報（GPS）などの生データは、農家のスマートフォンやローカルPC、エッジサーバー内に**完全に留め置かれます**。クラウドやリレーサーバーには一切送信しません。

2.  **秘密鍵のローカル管理:**
    Nostrプロトコルの根幹であるアイデンティティ（秘密鍵：`nsec` / `hex`）は、エッジデバイス内のみに保存され、すべてのイベント（問い）は送信前にローカルで暗号署名されます。

3.  **「答え」ではなく「問い」の抽出（Problematizing）:**
    ローカルAIは「answer generation system」でも「centralized ontology engine」でもありません。データから「明日の朝に灌水せよ」というマニュアル（答え）を導き出すのではなく、「なぜ北側区画の乾きが遅いのか？」という『問い』を導き出すようプロンプト設計されます。目的は problematization、すなわち問いを生成し、多様な意味射影を許容し、分散知識形成を支援することです。

4.  **問いの二層構造（CANONICAL_EVENT.md / NOSTR_INQUIRY_SCHEMA.md 準拠）:**
    生成される問いは以下の二層で構成されます。
    ```
    【内部基準】 Canonical Event ── body / contexts / relationships / lineage / provenance
                      ↓  converter
    【出力層】   Nostr Inquiry Event ─ content / tags / kind / sig
                      ↓  transport
    【公開層】   Relay / Sync / Archive
    ```
    この流れの **converter と transport projection はエッジAIの責務** です。第1層は Canonical Event の `body.text` に格納される自然言語の主表現であり、農家・研究者・AIが各々の視点で読める「社会的インターフェース」です。第2層は Canonical Event の DSL projection として保持され、Nostr Inquiry Event へ写像される際に `dsl:*` タグ群へ展開されます。**DSLタグを持たない問いも完全に有効です。**

5.  **解釈の多様性（Interpretive Plurality）:**
    DSL は唯一の意味体系ではありません。異なる `model_id` を持つ複数のDSLモデルが一つのイベント上に共存でき、それぞれが独立した意味論的解釈を持ちます。
    ```
    m1 = agroecology-v1        （アグロエコロジー的解釈）
    m2 = indigenous-observation-v1  （在来知的観察の解釈）
    m3 = soil-microbe-v2       （土壌微生物学的解釈）
    ```
    競合するDSLモデルの共存は禁止されません。単一のオントロジーへの統合も行いません。Toitoiは解釈の多様性を問いの第一級の特性として扱います。

---

## 2. エッジ・パイプラインの構成

ローカルAIクライアントは、以下の6ステップのPipelineで動作します。

```text
    [生データ] ──(1.収集)──> [ローカルDB]
    ──(2.Canonical Event生成)──> [Canonical Event]
    ──(3.DSL射影（任意）)──────> [意味的補助構造]
    ──(4.スキーマ検証)────────> [Canonical Event検証]
    ──(5.transport projection)─> [Nostr Inquiry Event]
    ──(6.署名・送信)──────────> [マルチパブリッシュ]
```

### 2.1 データ収集フェーズ

*   **IoTセンサー:** 水分、温度、照度などの時系列データをローカル（SQLite等）に保存。
*   **人間の観察:** 農家がアプリに入力した「テキストメモ」や「写真」。

### 2.2 LLM解析フェーズ（Problematizing）

収集したコンテキストをLLM（ローカル推論エンジン、または必要に応じて外部APIのLLM）に渡し、まず Canonical Event の semantic core を組み立て、その後に Nostr への transport projection を行います。

ここでの責務分担は明確で、**エッジAIが raw データと観察コンテキストから Canonical Event を内部生成し、converter を通して Nostr Inquiry Event に変換し、そのまま transport まで担う** という構成です。Relay / Sync / Archive はその結果を受け取る公開先であり、エッジAIの責務外です。

**ステップ1：Canonical Event の生成（バウンダリー・オブジェクト）**

プロンプト制約のもと、自然言語の「問い」を Canonical Event の `body.text` として保持できる形で出力させます。

> **[システムプロンプトの例]**
> あなたはアグロエコロジー実践を支援する認知的パートナー（AI）です。提供されたセンサーデータと農家の観察メモを読み解き、「処方箋（答え）」ではなく、農家の生態学的直感を刺激する「関係性についての問い」を生成してください。出力は指定された Toitoi Canonical Event 仕様に準拠した JSON 形式のみとします。

生成される問いが満たすべき条件：
* 明確な答えを含まない
* 解釈可能性を残している
* 現場の文脈（生態学的関係性）を保持している

**ステップ2：第2層の生成（DSL：任意）**

第1層の自然言語問いを入力として、第二のLLMパス（またはルールベース処理）により DSL projection を生成します。AIが信頼できる構造的射影を生成できない場合は、DSLタグを省略します（§2.4参照）。

### 2.3 Vocabulary Normalization（語彙正規化）

Edge AIは、タグ値を標準語彙（NOSTR_INQUIRY_SCHEMA.md / TOITOI_VOCABULARY.md 準拠）へ正規化するべきです。

**目的:**
* typoの抑制
* インデクサーでの検索可能性（indexability）の維持
* 語彙の断片化（semantic fragmentation）の防止

**正規化の例:**
```text
weed / weeds / weed_flora / 雑草
→ weed_flora  （推奨標準語彙）
```

**推奨実装:**
* controlled vocabulary（列挙型バリデーション）
* synonym mapping（同義語マッピング）
* LLM出力の後処理による enum 検証

**バリデーションの許容方針（Permissive優先）:**

Toitoi の primary objective は problematization であり、ontology purity ではありません。そのため、エッジ側のバリデーションは以下の方針を推奨します。

```text
未知の語彙を検出した場合:
→ Strict（rejectして送信しない）よりも
→ Permissive（警告ログを出しつつ送信する）を優先する
```

未知語彙の蓄積はTIPs（§7参照）を通じた語彙拡張の起点となります。

> **語彙ガバナンスは未固定（§7.3参照）:** 語彙管理方式（中央集権型レジストリ / 連合型 / AI支援正規化）は現時点で確定していません。詳細は§7.3を参照してください。

### 2.4 DSL Reliability Handling

DSL生成の信頼性が十分でない場合の処理方針です。

**基本原則:** AIが十分な信頼性を持たない場合、DSL projectionを**省略する**ことを推奨します。信頼性の低い意味的射影を強制的にpublishすることは避けてください。

**`dsl:confidence` メタデータ（暫定・TIP候補）:**

DSLを省略せず信頼度を付与したい場合、以下の暫定的なメタデータタグを使用できます。

```json
["dsl:confidence", "m1", "0.81"]
```

> **重要な制約（§10.4）:** `dsl:confidence` の算出方法・閾値・キャリブレーション手法は現時点で未固定です。異なるモデル・実装間での数値の比較可能性は保証されません（モデルAの `0.81` とモデルBの `0.81` は同等ではありません）。**`dsl:confidence` は advisory metadata（参考値）として扱い、cross-model比較の根拠としないでください。**
>
> このタグはTIPs（TIP-DSL-CONFIDENCE）を通じた将来的な形式化を想定しています（§7参照）。

---

## 3. Canonical Event からの transport projection（概要）

以下は Canonical Event を **エッジAI内の converter** が Nostr Inquiry Event に写像し、さらに transport まで進める流れの例です。
※ Canonical Event の厳密な定義・必須フィールド・来歴管理については、**[`CANONICAL_EVENT.md`](../../docs/protocols/CANONICAL_EVENT.md)** を参照してください。Nostr 側のタグ定義・DSLサブキー定義については、**[`NOSTR_INQUIRY_SCHEMA.md`](../../docs/protocols/NOSTR_INQUIRY_SCHEMA.md)** を参照してください。

Canonical Event の主要フィールドと Nostr Inquiry Event の対応は次の通りです。

* `body.text` -> `content`
* `contexts` -> `context` タグ群
* `relationships` -> `relationship` タグ
* `lineage` -> `e` タグ
* `dsl.models` -> `dsl:*` タグ群
* `provenance` / `rawRef` -> 内部追跡情報
* `kind` / `sig` -> エッジAIが生成する transport-facing metadata

```json
{
  "kind": 1042,
  "pubkey": "<農家の公開鍵 (32-bytes hex)>",
  "created_at": <Unix Timestamp>,

  // 【第1層】バウンダリー・オブジェクト：農家・研究者・AIが各々の視点で読める自然言語の問い
  "content": "北側斜面において、土壌の乾きの遅さとスギナの繁茂に相関が見られます。この微気候は天敵群集にどのような影響を与えているでしょうか？",

  "tags": [
    // [必須] コモンズ・ルーティング用（エッジ側が必ず付与する責任を持つ）
    ["t", "agroecology"],

    // [必須/複数可] Context: 属地性の抽象化メタデータ
    ["context", "climate_zone",    "warm-temperate"],
    ["context", "soil_type",       "volcanic_ash"],
    ["context", "farming_context", "no_till"],
    ["context", "crop_family",     "solanaceae"],

    // [必須] Relationship: 注目する生態学的関係性
    ["relationship", "microclimate", "weed_flora"],

    // [必須] Phase: 熟達段階（beginner / intermediate / expert）
    ["phase", "intermediate"],

    // [任意] Trigger: 問いの起点
    ["trigger", "sensor_anomaly", "soil_moisture"],

    // [任意] Lineage: 問いの系譜（relation_type: derived_from | synthesis）
    ["e", "<親イベントID>", "wss://relay.toitoi.cultivationdata.net", "derived_from"],

    // 【第2層】DSL: 構造化された意味的射影（任意・非権威的）
    // 複数の解釈モデルを model_id で識別して共存させることができる
    ["dsl:model", "m1", "climate_model"],
    ["dsl:var",   "m1", "microclimate", "independent"],
    ["dsl:var",   "m1", "weed_flora",   "dependent"],
    ["dsl:rel",   "m1", "microclimate", "weed_flora"]
  ],

  "id": "<sha256(serialize(event))>",
  "sig": "<schnorr_signature(id, privkey)>"
}
```

> **ワイヤーフォーマットについて:** イベントのタグ配列形式（ワイヤーフォーマット）は固定です。リレー・インデクサー内部のDB射影形式は実装依存であり、エッジ層は関知しません（§7.1参照）。

> **DSLタグについて（第2層）:** DSLタグは任意です。付与することで、インデクサーがモデル名・変数・関係性による絞り込み検索（`/api/v1/inquiries/query?dsl_model=<name>` 等）に対応できます。詳細は `NOSTR_INQUIRY_SCHEMA.md` を参照してください。

> **`trigger` タグについて:** センサー異常や特定の観察が問いの直接的な起点となった場合に付与する任意タグです。フォーマット: `["trigger", "<category>", "<value>"]`。自動生成パイプラインでは、センサー異常検知時に自動付与することを推奨します。

---

## 4. 実装例（Node.js / nostr-tools）

ローカルのLLMが Canonical Event の JSON 表現を出力した後、**エッジAIの converter が Nostr Inquiry Event に変換し、そのまま transport する** 最小実装のコード例です。DSL（第2層）・`dsl:confidence`（暫定）の付与を含む構成を示します。

```javascript
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { Relay } from 'nostr-tools/relay';
import WebSocket from 'ws';
global.WebSocket = WebSocket;

// 1. 農家のローカル管理キー（本番環境ではセキュアストレージから読み込む）
const secretKey = generateSecretKey();
const pubKey = getPublicKey(secretKey);

// 2. LLMが生成した「問い」のデータ構造（Canonical Event の JSON 表現）
const inquiryPayload = {
    kind: 1042,
    created_at: Math.floor(Date.now() / 1000),

    // 【第1層】バウンダリー・オブジェクト: 自然言語の問い（必須・主要表現）
    content: "九州の微気候の問いを当圃場（黒ボク土）で観察したところ、ハコベが優占しました。初期窒素量が関係しているのではないでしょうか？",

    tags: [
        // [必須] エッジ側が付与する責任を持つ（リレー側のenforceに依存しない）
        ["t", "agroecology"],

        ["context", "climate_zone",    "cool-temperate"],
        ["context", "soil_type",       "volcanic_ash"],
        ["context", "farming_context", "open_field"],
        ["context", "crop_family",     "brassica"],
        ["relationship", "weed_flora", "nutrient_cycle"],    // NOSTR_INQUIRY_SCHEMA.md の推奨ボキャブラリー
        ["phase", "intermediate"],
        ["trigger", "sensor_anomaly", "soil_moisture"],      // [任意] センサー異常が問いの起点の場合に付与
        ["e", "abc123def456...", "wss://relay.toitoi.cultivationdata.net", "derived_from"],

        // 【第2層】DSL: 構造化された意味的射影（任意）
        // AIが信頼できる構造的射影を生成できない場合はこのブロックを省略する
        ["dsl:model", "m1", "nutrient_model"],
        ["dsl:var",   "m1", "nutrient_cycle", "independent"],
        ["dsl:var",   "m1", "weed_flora",     "dependent"],
        ["dsl:rel",   "m1", "nutrient_cycle", "weed_flora"],

        // [任意・暫定] dsl:confidence: advisory metadata（参考値）
        // cross-model比較は保証されない。TIP-DSL-CONFIDENCE待ち（§7参照）
        ["dsl:confidence", "m1", "0.81"],

        // 複数の解釈モデルを共存させる場合は model_id を変えて追加（解釈の多様性）
        // ["dsl:model", "m2", "soil_model"],
        // ["dsl:var",   "m2", "soil_moisture", "independent"],
        // ["dsl:var",   "m2", "weed_flora",    "dependent"],
        // ["dsl:rel",   "m2", "soil_moisture", "weed_flora"],
    ]
};

// 3. ローカル環境で暗号署名（Nostr Inquiry Event として生成された後）
const signedEvent = finalizeEvent(inquiryPayload, secretKey);
console.log("署名済みイベントID:", signedEvent.id);

// 4. コモンズ・ネットワークへ transport（マルチパブリッシュ：3つ以上のリレーへ並列送信）
// フェイルセーフ: Promise.allSettled により、一部の Relay / Sync / Archive が失敗しても他への送信を継続
async function publishToCommons() {
    const targetRelays = [
        'wss://relay.toitoi.cultivationdata.net',            // アンカーリレー（必須）
        'wss://relay.local.toitoi.cultivationdata.net',      // 地域のコモンズリレー
        'wss://relay.damus.io'                               // パブリックリレー（冗長性確保）
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

## 5. リレー互換性とエッジ側の責任

### 5.1 エッジが必ず満たすべき条件

Toitoi コモンズリレーへのイベント受理条件は以下の通りです。エッジ側がこれを保証します。

```text
kind = 1042
かつ
["t", "agroecology"] タグを含む
かつ
ペイロードサイズ < 20KB
```

### 5.2 `["t", "agroecology"]` タグ付与の責任

リレー実装によっては、kindホワイトリストやサイズ制限のみが実装されており、タグレベルのバリデーションが未実装の場合があります。そのため、**`["t", "agroecology"]` タグが正しく付与されることを保証する責任はエッジ側にあります。** リレー側のenforceに依存してはなりません。

---

## 6. 推奨ランタイム構成

エッジデバイスでのローカル推論に推奨する構成です。ネットワーク接続なしでも動作可能なオフライン推論を前提とします。

```text
センサー
↓
ローカルストレージ（SQLite等）
↓
エッジ推論エンジン（以下のいずれか）
↓
Problematizing Pipeline
↓
ローカル署名
↓
リレーへのpublish
```

**推奨推論エンジン:**
* **Ollama** — ローカルLLM管理ツール。モデルのダウンロード・実行を統合管理。
* **llama.cpp** — CPUでも動作する量子化モデル実行環境。Raspberry Pi等の低スペック機器に対応。
* **小型量子化モデル** — オフライン推論可能な量子化LLMを推奨。Raspberry Pi等の低スペック機器でも動作させやすいものを選定してください。

農地での実運用では、常時インターネット接続を前提としない設計が重要です。

---

## 7. 未固定仕様とTIPs

本章は、現時点で完全には固定されていない実装仕様を記録します。これらはプロトコルの非整合を意味するものではなく、分散実験と意味的探索を許容するための意図的な状態です。将来的にTIPs（Toitoi Improvement Proposals）を通じて形式化されます。

### 7.1 DSL 4th-value のDB保存戦略（未固定）

ワイヤーフォーマットは以下で固定されています。

```json
["dsl:var", "m1", "weed_flora", "dependent"]
```

しかし `dependent` などの第4値をリレー/インデクサー内部DBでどのように保存するかは実装依存です（Secondary Row / JSON Column / Auxiliary Table 等）。**ワイヤーフォーマットは変更してはなりません。DB射影形式はINDEXER_API_SETUP.mdを参照してください。**

### 7.2 エッジ側バリデーションの厳格度（現時点の推奨）

* **Strict（未知語彙→reject）** と **Permissive（未知語彙→警告付きでpublish）** のどちらを採用するかは実装依存です。
* 現時点では **Permissiveを推奨** します（§2.3参照）。

### 7.3 語彙ガバナンス（未固定）

以下の語彙管理方式を将来的に検討します（TIP-VOCABULARY候補）。

* **Option A: 中央語彙レジストリ** — 公式語彙リストを一元管理。
* **Option B: 連合型語彙** — `model_id` ごとに語彙を独立管理。
* **Option C: AI支援正規化** — Embedding類似度による近似統合。

多言語マッピング（`weed_flora` ↔ `雑草` 等）も未固定です。

### 7.4 `dsl:confidence` セマンティクス（未固定）

`dsl:confidence` の算出方法・閾値・キャリブレーション・cross-model比較可能性は未固定です（§2.4参照）。TIP-DSL-CONFIDENCEを通じた形式化を想定しています。

### 7.5 Multi-DSL競合の解決（現時点の立場）

競合するDSLモデルの共存を禁止せず、単一オントロジーへの統合も行いません。これは未決事項ではなく**確定した設計方針**です。Toitoiは解釈の多様性（Interpretive Plurality）を問いの第一級の特性として扱います。

### 7.6 将来のTIPs候補

| TIP | 対象 |
|---|---|
| TIP-DSL-CONFIDENCE | confidence値の算出・比較方式 |
| TIP-VOCABULARY | 語彙管理・synonym registry・多言語マッピング |
| TIP-RELAY-POLICY | リレー側タグバリデーション・カスタムポリシー |
| TIP-INDEXER-STORAGE | DSL 4th-value のDB保存戦略 |

---

*このドキュメントはデジタル・アグロエコロジー・コモンズ推進プロジェクトの一環として作成されました。*
*v0.3.1 — 2026年5月*
