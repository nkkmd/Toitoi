// test_relay.js
// Toitoi プロトコル・スキーマ v1.2 対応リレー送信テストスクリプト
//
// 使用法:
//   node test_relay.js
//   RELAY_URL=wss://... node test_relay.js
//
// 必要なパッケージ:
//   npm install nostr-tools ws
//
// テスト内容:
//   §1. リレー基本フィルタリング（Kind 1042 受け入れ / Kind 1 拒否）
//   §2. Boundary Object 層（DSL なし、trigger カテゴリ網羅）
//   §3. DSL 層 — 単一モデル（全 phase 値）
//   §4. DSL 層 — 複数モデル（解釈の多様性）
//   §5. DSL 層 — mediator / moderator 変数
//   §6. DSL 層 — dsl:meta タグ
//   §7. 問いの系譜（e タグ: derived_from）+ DSL の組み合わせ
//   §8. DSL バリデーション異常系（送信前のローカル拒否）
//   §9. 境界値テスト（ペイロードサイズ）

const { generateSecretKey, finalizeEvent, Relay } = require('nostr-tools');
const WebSocket = require('ws');
global.WebSocket = WebSocket;

// ── 設定 ─────────────────────────────────────────────────────
const RELAY_URL = process.env.RELAY_URL ?? 'wss://relay.toitoi.cultivationdata.net';

// ── テスト結果カウンター ───────────────────────────────────────
let passCount = 0;
let failCount = 0;

function pass(label) {
    passCount++;
    console.log(`🟢 PASS: ${label}`);
}

function fail(label, reason = '') {
    failCount++;
    console.error(`🔴 FAIL: ${label}${reason ? ` — ${reason}` : ''}`);
}

function section(title) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${title}`);
    console.log('─'.repeat(60));
}

// ── DSL タグのローカルバリデーション ──────────────────────────
// リレーに送信する前に v1.2 スキーマ仕様に照らして構造を検証する。
// 返り値: { ok: boolean, errors: string[] }
function validateDslTags(tags) {
    const errors = [];
    const VALID_SUB_KEYS  = ['dsl:model', 'dsl:var', 'dsl:rel', 'dsl:meta'];
    const VALID_VAR_ROLES = ['independent', 'dependent', 'mediator', 'moderator'];

    const dslTags = tags.filter(t => typeof t[0] === 'string' && t[0].startsWith('dsl:'));

    for (const tag of dslTags) {
        const [subKey, modelId, val1, val2] = tag;

        // 定義済みサブキーか
        if (!VALID_SUB_KEYS.includes(subKey)) {
            errors.push(`未知の dsl サブキー: "${subKey}"`);
            continue;
        }

        // model_id は必須
        if (!modelId || modelId.trim() === '') {
            errors.push(`${subKey}: model_id が空です`);
        }

        // dsl:model — val1 はモデル名（必須）
        if (subKey === 'dsl:model' && (!val1 || val1.trim() === '')) {
            errors.push(`dsl:model: モデル名（val1）が空です`);
        }

        // dsl:var — val1 は変数名（必須）、val2 は役割（必須かつ定義済み）
        if (subKey === 'dsl:var') {
            if (!val1 || val1.trim() === '') {
                errors.push(`dsl:var [model_id=${modelId}]: 変数名（val1）が空です`);
            }
            if (!val2 || !VALID_VAR_ROLES.includes(val2)) {
                errors.push(
                    `dsl:var [model_id=${modelId}, var=${val1}]: ` +
                    `役割（val2）が不正です。有効値: ${VALID_VAR_ROLES.join(' | ')}`
                );
            }
        }

        // dsl:rel — val1（起点変数）と val2（終点変数）は両方必須
        if (subKey === 'dsl:rel') {
            if (!val1 || val1.trim() === '') {
                errors.push(`dsl:rel [model_id=${modelId}]: 起点変数（val1）が空です`);
            }
            if (!val2 || val2.trim() === '') {
                errors.push(`dsl:rel [model_id=${modelId}]: 終点変数（val2）が空です`);
            }
        }
    }

    // model_id 一貫性チェック:
    // dsl:var / dsl:rel で参照している model_id に dsl:model 宣言があるか
    const declaredModels = new Set(
        dslTags.filter(t => t[0] === 'dsl:model').map(t => t[1])
    );
    const referencedModels = new Set(
        dslTags.filter(t => t[0] !== 'dsl:model').map(t => t[1])
    );
    for (const ref of referencedModels) {
        if (!declaredModels.has(ref)) {
            errors.push(
                `model_id "${ref}" は dsl:var/rel/meta で参照されていますが、` +
                `dsl:model で宣言されていません`
            );
        }
    }

    return { ok: errors.length === 0, errors };
}

// ── イベント送信ヘルパー ──────────────────────────────────────
// expectSuccess=true  → publish が成功すれば PASS
// expectSuccess=false → DSL バリデーション拒否 or リレー拒否されれば PASS
async function publishTest(relay, sk, label, eventTemplate, expectSuccess = true) {
    // DSL タグをローカルバリデーション（送信前チェック）
    const dslResult = validateDslTags(eventTemplate.tags ?? []);
    if (!dslResult.ok) {
        if (expectSuccess) {
            fail(label, `DSL バリデーションエラー:\n  ${dslResult.errors.join('\n  ')}`);
        } else {
            pass(`${label}（DSL バリデーションで正しく拒否）`);
        }
        return null;
    }

    const event = finalizeEvent(eventTemplate, sk);

    try {
        await relay.publish(event);
        if (expectSuccess) {
            pass(label);
        } else {
            fail(label, 'リレーに受け入れられてしまいました（拒否されるべきイベント）');
        }
        return event;
    } catch (e) {
        if (expectSuccess) {
            fail(label, String(e));
        } else {
            pass(`${label}（リレーに正しく拒否）: ${e}`);
        }
        return null;
    }
}

// ── メインテスト ──────────────────────────────────────────────
async function test() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  Toitoi test_relay.js  —  Protocol Schema v1.2          ║');
    console.log(`║  接続先: ${RELAY_URL.slice(0, 48).padEnd(48)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝');

    // ── リレー接続 ────────────────────────────────────────────
    let relay;
    try {
        relay = await Relay.connect(RELAY_URL);
        console.log(`\n✅ リレーに接続成功: ${RELAY_URL}`);
    } catch (e) {
        console.error(`\n❌ リレーへの接続に失敗しました: ${e}`);
        process.exit(1);
    }

    const sk = generateSecretKey();

    // ─────────────────────────────────────────────────────────
    // §1. 既存テスト（リレー基本フィルタリング）
    // ─────────────────────────────────────────────────────────
    section('§1. リレー基本フィルタリング（既存テスト）');

    // 1-1: Kind 1042 + agroecology タグ → 受け入れ
    await publishTest(relay, sk,
        'Kind 1042 (問い) の正常送信',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'warm-temperate'],
                ['relationship', 'microclimate', 'weed_flora'],
                ['phase', 'intermediate'],
            ],
            content: 'テストの問い: 雑草の生え方が場所によって違うのはなぜ？',
        },
        true
    );

    // 1-2: Kind 1 (SNS投稿) → 拒否
    await publishTest(relay, sk,
        'Kind 1 (SNS投稿) の送信拒否',
        {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: 'おはよう！これは弾かれるべき普通のツイートです。',
        },
        false
    );

    // ─────────────────────────────────────────────────────────
    // §2. Boundary Object 層（DSL なし）
    // ─────────────────────────────────────────────────────────
    section('§2. Boundary Object 層（第1層）— DSL なし');

    // 2-1: DSL タグなし → 完全に有効（DSL は optional）
    await publishTest(relay, sk,
        'DSL タグなしの問い（Boundary Object のみ）が正常に受け入れられる',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'cool-temperate'],
                ['context', 'soil_type', 'volcanic_ash'],
                ['context', 'farming_context', 'no_till'],
                ['context', 'crop_family', 'brassica'],
                ['relationship', 'soil_microbe', 'crop_vitality'],
                ['phase', 'beginner'],
                ['trigger', 'farmer_observation', 'crop_symptom'],
            ],
            content: '不耕起圃場でアブラナ科の葉色が悪いのは土壌微生物と関係があるのだろうか？',
        },
        true
    );

    // 2-2: trigger タグ各カテゴリの網羅確認
    const triggerCases = [
        ['sensor_anomaly',    'soil_moisture'],
        ['farmer_observation','weed_change'],
        ['periodic_review',   'weekly'],
        ['external_event',    'heavy_rain'],
    ];
    for (const [category, value] of triggerCases) {
        await publishTest(relay, sk,
            `trigger タグ: ${category} / ${value}`,
            {
                kind: 1042,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ['t', 'agroecology'],
                    ['context', 'climate_zone', 'warm-temperate'],
                    ['relationship', 'microclimate', 'weed_flora'],
                    ['phase', 'intermediate'],
                    ['trigger', category, value],
                ],
                content: `trigger テスト: ${category}`,
            },
            true
        );
    }

    // ─────────────────────────────────────────────────────────
    // §3. DSL 層 — 単一モデル
    // ─────────────────────────────────────────────────────────
    section('§3. DSL 層（第2層）— 単一モデル');

    // 3-1: 単一 DSL（気候モデル）
    await publishTest(relay, sk,
        '単一 DSL: 気候モデル（independent → dependent）',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'warm-temperate'],
                ['context', 'soil_type', 'volcanic_ash'],
                ['context', 'farming_context', 'no_till'],
                ['context', 'crop_family', 'solanaceae'],
                ['relationship', 'microclimate', 'weed_flora'],
                ['phase', 'intermediate'],
                ['trigger', 'farmer_observation', 'weed_change'],
                ['dsl:model', 'm1', 'climate_model'],
                ['dsl:var',   'm1', 'microclimate', 'independent'],
                ['dsl:var',   'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',   'm1', 'microclimate', 'weed_flora'],
            ],
            content: '雑草の生え方が場所によって違うのはなぜ？',
        },
        true
    );

    // 3-2: 全 phase 値 + DSL の組み合わせ
    for (const phase of ['beginner', 'intermediate', 'expert']) {
        await publishTest(relay, sk,
            `phase: ${phase} + DSL あり`,
            {
                kind: 1042,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ['t', 'agroecology'],
                    ['context', 'climate_zone', 'warm-temperate'],
                    ['relationship', 'soil_moisture', 'weed_flora'],
                    ['phase', phase],
                    ['dsl:model', 'm1', 'moisture_model'],
                    ['dsl:var',   'm1', 'soil_moisture', 'independent'],
                    ['dsl:var',   'm1', 'weed_flora',    'dependent'],
                    ['dsl:rel',   'm1', 'soil_moisture', 'weed_flora'],
                ],
                content: `phase=${phase} のテスト問い`,
            },
            true
        );
    }

    // ─────────────────────────────────────────────────────────
    // §4. DSL 層 — 複数モデル（解釈の多様性）
    // ─────────────────────────────────────────────────────────
    section('§4. DSL 層（第2層）— 複数モデル（解釈の多様性）');

    // 4-1: 気候モデル + 土壌モデルの共存（スキーマ §2.6.4 の例）
    await publishTest(relay, sk,
        '複数 DSL: 気候モデル (m1) + 土壌モデル (m2) の共存',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'warm-temperate'],
                ['context', 'soil_type', 'volcanic_ash'],
                ['context', 'farming_context', 'no_till'],
                ['context', 'crop_family', 'solanaceae'],
                ['relationship', 'microclimate', 'weed_flora'],
                ['phase', 'intermediate'],
                ['trigger', 'farmer_observation', 'weed_change'],
                // m1: 気候モデル
                ['dsl:model', 'm1', 'climate_model'],
                ['dsl:var',   'm1', 'microclimate',  'independent'],
                ['dsl:var',   'm1', 'weed_flora',     'dependent'],
                ['dsl:rel',   'm1', 'microclimate',   'weed_flora'],
                // m2: 土壌モデル
                ['dsl:model', 'm2', 'soil_model'],
                ['dsl:var',   'm2', 'soil_nutrients', 'independent'],
                ['dsl:var',   'm2', 'weed_flora',     'dependent'],
                ['dsl:rel',   'm2', 'soil_nutrients', 'weed_flora'],
            ],
            content: '雑草の生え方が場所によって違うのはなぜ？',
        },
        true
    );

    // 4-2: 3モデル共存（拡張性テスト）
    await publishTest(relay, sk,
        '複数 DSL: 3モデル共存（天敵出現パターン）',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'cool-temperate'],
                ['context', 'soil_type', 'alluvial'],
                ['relationship', 'pest', 'natural_enemy'],
                ['phase', 'expert'],
                // m1: 捕食モデル
                ['dsl:model', 'm1', 'predation_model'],
                ['dsl:var',   'm1', 'pest',          'independent'],
                ['dsl:var',   'm1', 'natural_enemy',  'dependent'],
                ['dsl:rel',   'm1', 'pest',           'natural_enemy'],
                // m2: 生息地モデル
                ['dsl:model', 'm2', 'habitat_model'],
                ['dsl:var',   'm2', 'weed_flora',     'independent'],
                ['dsl:var',   'm2', 'natural_enemy',  'dependent'],
                ['dsl:rel',   'm2', 'weed_flora',     'natural_enemy'],
                // m3: 微気候モデル
                ['dsl:model', 'm3', 'microclimate_model'],
                ['dsl:var',   'm3', 'microclimate',   'independent'],
                ['dsl:var',   'm3', 'natural_enemy',  'dependent'],
                ['dsl:rel',   'm3', 'microclimate',   'natural_enemy'],
            ],
            content: '天敵の出現パターンはどの要因で最も説明できるか？',
        },
        true
    );

    // ─────────────────────────────────────────────────────────
    // §5. DSL 層 — mediator / moderator
    // ─────────────────────────────────────────────────────────
    section('§5. DSL 層（第2層）— 媒介変数・調整変数');

    // 5-1: mediator 付き因果連鎖（スキーマ §2.6.5 の例）
    await publishTest(relay, sk,
        'DSL: mediator 付き因果連鎖 (A → M → B)',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'warm-temperate'],
                ['context', 'soil_type', 'volcanic_ash'],
                ['context', 'farming_context', 'organic'],
                ['relationship', 'soil_microbe', 'crop_vitality'],
                ['phase', 'expert'],
                ['trigger', 'periodic_review', 'seasonal'],
                // soil_microbe → nutrient_cycle → crop_vitality
                ['dsl:model', 'm1', 'nutrient_chain_model'],
                ['dsl:var',   'm1', 'soil_microbe',  'independent'],
                ['dsl:var',   'm1', 'nutrient_cycle', 'mediator'],
                ['dsl:var',   'm1', 'crop_vitality',  'dependent'],
                ['dsl:rel',   'm1', 'soil_microbe',   'nutrient_cycle'],
                ['dsl:rel',   'm1', 'nutrient_cycle', 'crop_vitality'],
            ],
            content: '土壌微生物が作物の活力を高めるとしたら、それは養分循環を介しているのだろうか？',
        },
        true
    );

    // 5-2: moderator 付きモデル
    await publishTest(relay, sk,
        'DSL: moderator 付きモデル（関係性の強さを条件付ける変数）',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'warm-temperate'],
                ['context', 'soil_type', 'clay'],
                ['relationship', 'soil_moisture', 'pest'],
                ['phase', 'intermediate'],
                // soil_moisture → pest, moderated by microclimate
                ['dsl:model', 'm1', 'pest_moisture_model'],
                ['dsl:var',   'm1', 'soil_moisture', 'independent'],
                ['dsl:var',   'm1', 'microclimate',  'moderator'],
                ['dsl:var',   'm1', 'pest',           'dependent'],
                ['dsl:rel',   'm1', 'soil_moisture', 'pest'],
                ['dsl:rel',   'm1', 'microclimate',  'pest'],
            ],
            content: '土壌水分と害虫発生の関係は微気候によって変わるのだろうか？',
        },
        true
    );

    // ─────────────────────────────────────────────────────────
    // §6. dsl:meta タグ
    // ─────────────────────────────────────────────────────────
    section('§6. DSL 層（第2層）— dsl:meta タグ');

    await publishTest(relay, sk,
        'dsl:meta: モデルレベルのメタデータ付与（generated_by / observation_period）',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'subtropical'],
                ['context', 'soil_type', 'sandy'],
                ['context', 'crop_family', 'cucurbitaceae'],
                ['relationship', 'soil_physical', 'crop_vitality'],
                ['phase', 'intermediate'],
                ['dsl:model', 'm1', 'drainage_model'],
                ['dsl:var',   'm1', 'soil_physical', 'independent'],
                ['dsl:var',   'm1', 'crop_vitality',  'dependent'],
                ['dsl:rel',   'm1', 'soil_physical',  'crop_vitality'],
                ['dsl:meta',  'm1', 'generated_by',       'edge-ai-v0.3'],
                ['dsl:meta',  'm1', 'observation_period',  '7d'],
            ],
            content: '砂質土壌での排水性は作物の活力とどう関係しているか？',
        },
        true
    );

    // ─────────────────────────────────────────────────────────
    // §7. 問いの系譜（e タグ）+ DSL の組み合わせ
    // ─────────────────────────────────────────────────────────
    section('§7. 問いの系譜（Lineage: e タグ）+ DSL の組み合わせ');

    // 7-1: Genesis Inquiry（e タグなし）+ DSL
    const genesisEvent = await publishTest(relay, sk,
        'Genesis Inquiry + DSL（系譜なしの起点となる問い）',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'cool-temperate'],
                ['context', 'soil_type', 'peat'],
                ['context', 'farming_context', 'open_field'],
                ['context', 'crop_family', 'legume'],
                ['relationship', 'nutrient_cycle', 'crop_vitality'],
                ['phase', 'intermediate'],
                ['trigger', 'sensor_anomaly', 'soil_moisture'],
                ['dsl:model', 'm1', 'nitrogen_model'],
                ['dsl:var',   'm1', 'nutrient_cycle', 'independent'],
                ['dsl:var',   'm1', 'crop_vitality',  'dependent'],
                ['dsl:rel',   'm1', 'nutrient_cycle', 'crop_vitality'],
            ],
            content: '泥炭土壌ではマメ科作物の窒素固定がうまく機能しないのだろうか？',
        },
        true
    );

    // 7-2: derived_from（Genesis を親として参照）
    if (genesisEvent) {
        await publishTest(relay, sk,
            'derived_from: Genesis から派生した問い + DSL',
            {
                kind: 1042,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                    ['t', 'agroecology'],
                    ['context', 'climate_zone', 'warm-temperate'],
                    ['context', 'soil_type', 'volcanic_ash'],
                    ['context', 'farming_context', 'organic'],
                    ['context', 'crop_family', 'legume'],
                    ['relationship', 'soil_microbe', 'nutrient_cycle'],
                    ['phase', 'intermediate'],
                    // 系譜
                    ['e', genesisEvent.id, RELAY_URL, 'derived_from'],
                    // DSL
                    ['dsl:model', 'm1', 'rhizobia_model'],
                    ['dsl:var',   'm1', 'soil_microbe',  'independent'],
                    ['dsl:var',   'm1', 'nutrient_cycle', 'dependent'],
                    ['dsl:rel',   'm1', 'soil_microbe',  'nutrient_cycle'],
                ],
                content: '根粒菌の活性が低い場合、それは火山灰土の影響なのか？',
            },
            true
        );
    }

    // ─────────────────────────────────────────────────────────
    // §8. DSL バリデーション — 異常系（ローカル拒否）
    // ─────────────────────────────────────────────────────────
    section('§8. DSL バリデーション — 異常系（送信前に拒否されるべきケース）');

    // 8-1: dsl:var の役割値が不正
    await publishTest(relay, sk,
        'dsl:var: 不正な役割値 "unknown_role" → バリデーションで拒否',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'warm-temperate'],
                ['relationship', 'microclimate', 'weed_flora'],
                ['phase', 'beginner'],
                ['dsl:model', 'm1', 'test_model'],
                ['dsl:var',   'm1', 'microclimate', 'unknown_role'], // ← 不正
                ['dsl:var',   'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',   'm1', 'microclimate', 'weed_flora'],
            ],
            content: '不正な役割値のテスト',
        },
        false
    );

    // 8-2: dsl:rel の終点変数が空
    await publishTest(relay, sk,
        'dsl:rel: 終点変数（val2）が空 → バリデーションで拒否',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'warm-temperate'],
                ['relationship', 'microclimate', 'weed_flora'],
                ['phase', 'beginner'],
                ['dsl:model', 'm1', 'test_model'],
                ['dsl:var',   'm1', 'microclimate', 'independent'],
                ['dsl:var',   'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',   'm1', 'microclimate', ''],            // ← 終点が空
            ],
            content: '終点変数が空のテスト',
        },
        false
    );

    // 8-3: dsl:model 宣言なしで dsl:var を参照
    await publishTest(relay, sk,
        'dsl:var: 対応する dsl:model 宣言なし → バリデーションで拒否',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'warm-temperate'],
                ['relationship', 'microclimate', 'weed_flora'],
                ['phase', 'beginner'],
                // dsl:model 宣言なし
                ['dsl:var', 'mx', 'microclimate', 'independent'],
                ['dsl:var', 'mx', 'weed_flora',   'dependent'],
                ['dsl:rel', 'mx', 'microclimate', 'weed_flora'],
            ],
            content: 'model 宣言なしのテスト',
        },
        false
    );

    // 8-4: 未定義サブキー（TIPs 正式化前）
    await publishTest(relay, sk,
        'dsl:confidence: 未定義サブキー → バリデーションで拒否（TIPs 正式化前）',
        {
            kind: 1042,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'agroecology'],
                ['context', 'climate_zone', 'warm-temperate'],
                ['relationship', 'microclimate', 'weed_flora'],
                ['phase', 'intermediate'],
                ['dsl:model',      'm1', 'climate_model'],
                ['dsl:var',        'm1', 'microclimate', 'independent'],
                ['dsl:var',        'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',        'm1', 'microclimate', 'weed_flora'],
                ['dsl:confidence', 'm1', '0.8'],                    // ← 未定義サブキー
            ],
            content: '未定義サブキーのテスト',
        },
        false
    );

    // ─────────────────────────────────────────────────────────
    // §9. 境界値テスト（ペイロードサイズ）
    // ─────────────────────────────────────────────────────────
    section('§9. 境界値テスト（ペイロードサイズ）');

    // 9-1: 10モデル共存で 20KB 未満に収まることを確認
    const manyDslTags = [
        ['t', 'agroecology'],
        ['context', 'climate_zone', 'warm-temperate'],
        ['relationship', 'microclimate', 'weed_flora'],
        ['phase', 'expert'],
    ];
    for (let i = 1; i <= 10; i++) {
        manyDslTags.push(['dsl:model', `m${i}`, `model_${i}`]);
        manyDslTags.push(['dsl:var',   `m${i}`, 'microclimate', 'independent']);
        manyDslTags.push(['dsl:var',   `m${i}`, 'weed_flora',   'dependent']);
        manyDslTags.push(['dsl:rel',   `m${i}`, 'microclimate', 'weed_flora']);
    }
    const manyDslTemplate = {
        kind: 1042,
        created_at: Math.floor(Date.now() / 1000),
        tags: manyDslTags,
        content: '多数の DSL モデルを持つ問い（境界値テスト）',
    };
    const payloadKB = Buffer.byteLength(JSON.stringify(manyDslTemplate), 'utf8') / 1024;
    console.log(`  ℹ️  ペイロードサイズ: ${payloadKB.toFixed(2)} KB（リレー上限: 20 KB）`);

    if (payloadKB < 20) {
        await publishTest(relay, sk, '10モデル DSL: 20KB 未満で正常送信', manyDslTemplate, true);
    } else {
        console.log('  ⚠️  ペイロードが 20KB を超えるためスキップ');
    }

    // ─────────────────────────────────────────────────────────
    // 結果サマリー
    // ─────────────────────────────────────────────────────────
    const total = passCount + failCount;
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    テスト結果サマリー                    ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  🟢 PASS: ${String(passCount).padEnd(3)} テスト                                    ║`);
    console.log(`║  🔴 FAIL: ${String(failCount).padEnd(3)} テスト                                    ║`);
    console.log(`║  合計   : ${String(total).padEnd(3)} テスト                                    ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');

    relay.close();
    process.exit(failCount > 0 ? 1 : 0);
}

test();