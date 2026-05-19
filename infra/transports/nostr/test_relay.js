// test_relay.js
// Toitoi リレー統合テストスクリプト
// Protocol Schema v0.1.2 / Architecture v0.3.0 対応
//
// 使用法:
//   node test_relay.js
//   RELAY_URL=wss://relay.example.com node test_relay.js
//   RELAY_URL=wss://relay.example.com SKIP_NIP11=1 node test_relay.js
//
// 必要なパッケージ:
//   npm install nostr-tools ws
//
// テスト構成:
//   §0.  NIP-11: リレー情報エンドポイント（HTTP）
//   §1.  リレー基本フィルタリング — EVENT 送受信
//   §2.  REQ / フィルタ動作
//   §3.  Boundary Object 層（第1層）— 語彙・タグ網羅
//   §4.  DSL 層（第2層）— 単一モデル
//   §5.  DSL 層（第2層）— 複数モデル（解釈の多様性）
//   §6.  DSL 層（第2層）— mediator / moderator
//   §7.  DSL 層（第2層）— dsl:meta タグ
//   §8.  Lineage（e タグ）— derived_from / synthesis
//   §9.  DSL バリデーション — 異常系（送信前ローカル拒否）
//   §10. 境界値テスト — ペイロードサイズ

'use strict';

const { generateSecretKey, finalizeEvent, Relay } = require('nostr-tools');
const WebSocket = require('ws');
global.WebSocket = WebSocket;

// ═══════════════════════════════════════════════════════════════
// 設定
// ═══════════════════════════════════════════════════════════════

const RELAY_URL  = process.env.RELAY_URL  ?? 'wss://new-relay.your-domain.com';
const SKIP_NIP11 = process.env.SKIP_NIP11 === '1';

// wss:// → https:// に変換（NIP-11 確認用）
const HTTP_URL = RELAY_URL.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');

// テストイベントの created_at ずらし用カウンター（同一秒 id 衝突防止）
let _seq = 0;
const now = () => Math.floor(Date.now() / 1000) + (_seq++);

// ═══════════════════════════════════════════════════════════════
// テスト結果管理
// ═══════════════════════════════════════════════════════════════

const results = [];

function pass(label) {
    results.push({ ok: true, label });
    console.log(`  🟢 PASS: ${label}`);
}

function fail(label, reason = '') {
    results.push({ ok: false, label, reason });
    console.error(`  🔴 FAIL: ${label}${reason ? `\n         ↳ ${reason}` : ''}`);
}

function skip(label, reason = '') {
    results.push({ ok: null, label, reason });
    console.log(`  ⏭️  SKIP: ${label}${reason ? ` (${reason})` : ''}`);
}

function section(no, title) {
    console.log(`\n${'═'.repeat(62)}`);
    console.log(`  §${no}. ${title}`);
    console.log('═'.repeat(62));
}

// ═══════════════════════════════════════════════════════════════
// DSL ローカルバリデーター（送信前チェック）
// Protocol Schema v0.1.2 §2.6 準拠
// ═══════════════════════════════════════════════════════════════

const VALID_DSL_SUBKEYS  = new Set(['dsl:model', 'dsl:var', 'dsl:rel', 'dsl:meta']);
const VALID_VAR_ROLES    = new Set(['independent', 'dependent', 'mediator', 'moderator']);

/**
 * タグ配列中の dsl:* タグをプロトコル仕様に照らして検証する。
 * @param {Array[]} tags
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateDsl(tags) {
    const errors = [];
    const dslTags = tags.filter(t => typeof t[0] === 'string' && t[0].startsWith('dsl:'));

    for (const tag of dslTags) {
        const [subKey, modelId, val1, val2] = tag;

        if (!VALID_DSL_SUBKEYS.has(subKey)) {
            errors.push(`未知の dsl サブキー: "${subKey}"`);
            continue;
        }
        if (!modelId || modelId.trim() === '') {
            errors.push(`${subKey}: model_id が空`);
        }

        switch (subKey) {
            case 'dsl:model':
                if (!val1 || val1.trim() === '')
                    errors.push(`dsl:model [${modelId}]: モデル名（val1）が空`);
                break;

            case 'dsl:var':
                if (!val1 || val1.trim() === '')
                    errors.push(`dsl:var [${modelId}]: 変数名（val1）が空`);
                if (!val2 || !VALID_VAR_ROLES.has(val2))
                    errors.push(
                        `dsl:var [${modelId}/${val1}]: 役割（val2）が不正 — ` +
                        `有効値: ${[...VALID_VAR_ROLES].join(' | ')}`
                    );
                break;

            case 'dsl:rel':
                if (!val1 || val1.trim() === '')
                    errors.push(`dsl:rel [${modelId}]: 起点変数（val1）が空`);
                if (!val2 || val2.trim() === '')
                    errors.push(`dsl:rel [${modelId}]: 終点変数（val2）が空`);
                break;

            // dsl:meta はキーと値の自由形式のため構造チェックのみ
            case 'dsl:meta':
                if (!val1 || val1.trim() === '')
                    errors.push(`dsl:meta [${modelId}]: キー（val1）が空`);
                break;
        }
    }

    // model_id 一貫性チェック:
    // dsl:var / dsl:rel / dsl:meta で参照している model_id に
    // 対応する dsl:model 宣言が存在するか
    const declared  = new Set(dslTags.filter(t => t[0] === 'dsl:model').map(t => t[1]));
    const referenced = new Set(dslTags.filter(t => t[0] !== 'dsl:model').map(t => t[1]));
    for (const ref of referenced) {
        if (!declared.has(ref))
            errors.push(`model_id "${ref}" が dsl:var/rel/meta で参照されているが dsl:model 宣言がない`);
    }

    return { ok: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════
// イベント生成ヘルパー
// ═══════════════════════════════════════════════════════════════

/**
 * テスト用マーカーを付与してイベントテンプレートを正規化する。
 * - tags に ['test', 'true'] を追加
 * - content に "[TEST]" プレフィックスを付与（既にある場合はスキップ）
 * - created_at にシーケンス番号を付与
 */
function markTestEvent(template) {
    const tags = [...(template.tags ?? [])];
    if (!tags.some(t => t[0] === 'test'))
        tags.push(['test', 'true']);

    let content = template.content ?? '';
    if (!content.startsWith('[TEST]'))
        content = `[TEST] ${content}`;

    return {
        ...template,
        created_at: template.created_at ?? now(),
        tags,
        content,
    };
}

// ═══════════════════════════════════════════════════════════════
// リレー通信ヘルパー
// ═══════════════════════════════════════════════════════════════

/**
 * イベントをリレーに送信し、リレーからの応答（OK / NOTICE）を待つ。
 *
 * expectSuccess=true  → リレーが OK[true] を返せば PASS
 * expectSuccess=false → DSL バリデーション拒否 または リレーが OK[false]/NOTICE を返せば PASS
 *
 * @returns {object|null} 送信に成功した場合は finalizeEvent の返り値、失敗時は null
 */
async function publishTest(relay, sk, label, template, expectSuccess = true) {
    // レートリミット対策: 接続単位 48msg/分 を安全に下回るよう待機
    await new Promise(r => setTimeout(r, 1500));

    const normalized = markTestEvent(template);

    // ─ ローカル DSL バリデーション ─
    const dslResult = validateDsl(normalized.tags);
    if (!dslResult.ok) {
        if (expectSuccess) {
            fail(label, `DSL バリデーションエラー:\n         ${dslResult.errors.join('\n         ')}`);
        } else {
            pass(`${label} — DSL バリデーションで正しく拒否`);
        }
        return null;
    }

    const event = finalizeEvent(normalized, sk);

    try {
        await relay.publish(event);
        if (expectSuccess) {
            pass(label);
        } else {
            fail(label, 'リレーに受け入れられた（拒否されるべきイベント）');
        }
        return event;
    } catch (e) {
        if (expectSuccess) {
            fail(label, String(e));
        } else {
            pass(`${label} — リレーに正しく拒否: ${e}`);
        }
        return null;
    }
}

/**
 * REQ を送信し、指定時間内に返ってくるイベントを収集して返す。
 *
 * @param {Relay} relay
 * @param {string} subId  サブスクリプション ID
 * @param {object} filter NIP-01 フィルタオブジェクト
 * @param {number} waitMs 収集待機時間（ms）
 * @returns {Promise<object[]>} 受信したイベント配列
 */
function collectEvents(relay, subId, filter, waitMs = 2000) {
    return new Promise(resolve => {
        const received = [];
        const sub = relay.subscribe([filter], {
            onevent(event) { received.push(event); },
            oneose()       { /* EOSE 到達後も waitMs まで待つ */ },
        });
        setTimeout(() => { sub.close(); resolve(received); }, waitMs);
    });
}

// ═══════════════════════════════════════════════════════════════
// §0. NIP-11: リレー情報エンドポイント
// ═══════════════════════════════════════════════════════════════

async function testNip11() {
    section(0, 'NIP-11 リレー情報エンドポイント（HTTP）');

    if (SKIP_NIP11) {
        skip('NIP-11 取得', 'SKIP_NIP11=1 により省略');
        return;
    }

    try {
        const res = await fetch(HTTP_URL, {
            headers: { Accept: 'application/nostr+json' },
            signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) {
            fail('NIP-11 HTTPステータス', `${res.status} ${res.statusText}`);
            return;
        }

        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('nostr+json')) {
            pass('Content-Type: application/nostr+json');
        } else {
            fail('Content-Type: application/nostr+json', `実際の値: ${ct}`);
        }

        const info = await res.json();

        // supported_nips に 1 が含まれることを確認（基本仕様準拠）
        if (Array.isArray(info.supported_nips) && info.supported_nips.includes(1)) {
            pass('NIP-11: supported_nips に NIP-01 が含まれる');
        } else {
            fail('NIP-11: supported_nips に NIP-01 が含まれる',
                `supported_nips: ${JSON.stringify(info.supported_nips)}`);
        }

        // limitation.min_pow_difficulty が存在しないか 0 であれば登録障壁ゼロを確認
        const pow = info.limitation?.min_pow_difficulty ?? 0;
        if (pow === 0) {
            pass('NIP-11: PoW 要求なし（参加障壁ゼロ）');
        } else {
            fail('NIP-11: PoW 要求なし', `min_pow_difficulty: ${pow}`);
        }

        console.log(`  ℹ️  リレー名: ${info.name ?? '(未設定)'}`);
        console.log(`  ℹ️  説明: ${info.description ?? '(未設定)'}`);

    } catch (e) {
        fail('NIP-11 取得', String(e));
    }
}

// ═══════════════════════════════════════════════════════════════
// §1. リレー基本フィルタリング
// ═══════════════════════════════════════════════════════════════

async function testFiltering(relay, sk) {
    section(1, 'リレー基本フィルタリング — EVENT 受け入れ・拒否');

    // 1-1: Kind 1042 + 必須タグ → 受け入れ
    await publishTest(relay, sk,
        'Kind 1042 + ["t","agroecology"] + 必須タグ → 受け入れ',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone',    'warm-temperate'],
                ['context',      'soil_type',       'volcanic_ash'],
                ['context',      'farming_context', 'no_till'],
                ['context',      'crop_family',     'solanaceae'],
                ['relationship', 'microclimate',    'weed_flora'],
                ['phase',        'intermediate'],
            ],
            content: '雑草の生え方が場所によって違うのはなぜ？',
        },
        true
    );

    // 1-2: Kind 1 (通常SNS投稿) → 拒否
    await publishTest(relay, sk,
        'Kind 1 (SNS投稿) → 拒否',
        {
            kind: 1,
            created_at: now(),
            tags: [],
            content: 'これは弾かれるべき通常の投稿です。',
        },
        false
    );

    // 1-3: Kind 0 (メタデータ) → 拒否
    await publishTest(relay, sk,
        'Kind 0 (メタデータ) → 拒否',
        {
            kind: 0,
            created_at: now(),
            tags: [],
            content: JSON.stringify({ name: 'Test User' }),
        },
        false
    );
}

// ═══════════════════════════════════════════════════════════════
// §2. REQ / フィルタ動作
// ═══════════════════════════════════════════════════════════════

async function testSubscription(relay, sk) {
    section(2, 'REQ / フィルタ動作 — 購読と取得確認');

    // 2-1: Kind 1042 イベントを送信してから REQ で取得できるか
    const event = await publishTest(relay, sk,
        'Kind 1042 の送信',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone',    'cool-temperate'],
                ['context',      'soil_type',       'alluvial'],
                ['context',      'farming_context', 'open_field'],
                ['context',      'crop_family',     'brassica'],
                ['relationship', 'soil_microbe',    'crop_vitality'],
                ['phase',        'beginner'],
            ],
            content: 'アブラナ科の活力と土壌微生物に関係はあるか？',
        },
        true
    );

    if (!event) {
        skip('REQ による取得確認', '送信イベントなし');
        return;
    }

    // 少し待ってから REQ
    await new Promise(r => setTimeout(r, 1000));

    const received = await collectEvents(
        relay,
        'sub-fetch-by-id',
        { ids: [event.id] },
        3000
    );

    if (received.some(e => e.id === event.id)) {
        pass('REQ: 送信したイベントを ID で取得できる');
    } else {
        fail('REQ: 送信したイベントを ID で取得できる', '取得件数: 0');
    }

    // 2-2: Kind 1042 フィルタ → Kind 1042 のみ返る（Kind 1 は含まれない）
    // ※ Kind 1 はそもそもリレーに入らないため、フィルタとして kinds:[1042] を指定して
    //    返ってきたイベントの kind が全て 1042 であることを確認する
    const recentEvents = await collectEvents(
        relay,
        'sub-kind-filter',
        { kinds: [1042], limit: 10 },
        3000
    );

    if (recentEvents.length === 0) {
        skip('REQ: kinds:[1042] フィルタで Kind 1042 のみ取得', '取得イベントなし（リレーが空の可能性）');
    } else {
        const allKind1042 = recentEvents.every(e => e.kind === 1042);
        if (allKind1042) {
            pass(`REQ: kinds:[1042] フィルタで Kind 1042 のみ取得（${recentEvents.length}件）`);
        } else {
            const wrongKinds = [...new Set(recentEvents.filter(e => e.kind !== 1042).map(e => e.kind))];
            fail('REQ: kinds:[1042] フィルタで Kind 1042 のみ取得', `Kind ${wrongKinds} が混入`);
        }
    }

    // 2-3: pubkey フィルタ — テスト鍵で送信したイベントのみ取得
    const byPubkey = await collectEvents(
        relay,
        'sub-pubkey-filter',
        { kinds: [1042], authors: [Buffer.from(require('nostr-tools').getPublicKey(sk)).toString('hex')], limit: 20 },
        3000
    );
    pass(`REQ: authors フィルタ（テスト pubkey）— ${byPubkey.length} 件取得（エラーなし）`);
}

// ═══════════════════════════════════════════════════════════════
// §3. Boundary Object 層（第1層）— 語彙・タグ網羅
// ═══════════════════════════════════════════════════════════════

async function testBoundaryObject(relay, sk) {
    section(3, 'Boundary Object 層（第1層）— DSL なし・語彙網羅');

    // 3-1: 最小必須セット（context / relationship / phase のみ）
    await publishTest(relay, sk,
        '最小必須セット（context + relationship + phase）',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone', 'subarctic'],
                ['relationship', 'soil_moisture','crop_vitality'],
                ['phase',        'beginner'],
            ],
            content: '亜寒帯環境での土壌水分と作物の活力の関係は？',
        },
        true
    );

    // 3-2: climate_zone 全語彙
    for (const zone of ['subarctic', 'cool-temperate', 'warm-temperate', 'subtropical']) {
        await publishTest(relay, sk,
            `context: climate_zone="${zone}"`,
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone', zone],
                    ['relationship', 'microclimate', 'weed_flora'],
                    ['phase',        'beginner'],
                ],
                content: `気候帯テスト: ${zone}`,
            },
            true
        );
    }

    // 3-3: soil_type 全語彙
    for (const soil of ['volcanic_ash', 'andisol', 'alluvial', 'peat', 'sandy', 'clay']) {
        await publishTest(relay, sk,
            `context: soil_type="${soil}"`,
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone', 'warm-temperate'],
                    ['context',      'soil_type',    soil],
                    ['relationship', 'soil_physical','crop_vitality'],
                    ['phase',        'intermediate'],
                ],
                content: `土壌タイプテスト: ${soil}`,
            },
            true
        );
    }

    // 3-4: farming_context 全語彙
    for (const fc of ['open_field', 'greenhouse_unheated', 'greenhouse_heated', 'no_till', 'organic', 'conventional']) {
        await publishTest(relay, sk,
            `context: farming_context="${fc}"`,
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone',    'warm-temperate'],
                    ['context',      'farming_context', fc],
                    ['relationship', 'soil_moisture',   'pest'],
                    ['phase',        'beginner'],
                ],
                content: `農法コンテキストテスト: ${fc}`,
            },
            true
        );
    }

    // 3-5: crop_family 全語彙
    for (const cf of ['solanaceae', 'brassica', 'legume', 'cucurbitaceae', 'poaceae']) {
        await publishTest(relay, sk,
            `context: crop_family="${cf}"`,
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone', 'warm-temperate'],
                    ['context',      'crop_family',  cf],
                    ['relationship', 'pest',         'natural_enemy'],
                    ['phase',        'intermediate'],
                ],
                content: `作物科テスト: ${cf}`,
            },
            true
        );
    }

    // 3-6: relationship 全語彙ペア（代表的な組み合わせ）
    const relPairs = [
        ['soil_moisture',  'weed_flora'],
        ['microclimate',   'pest'],
        ['pest',           'natural_enemy'],
        ['soil_microbe',   'nutrient_cycle'],
        ['nutrient_cycle', 'crop_vitality'],
        ['soil_physical',  'soil_moisture'],
        ['weed_flora',     'crop_vitality'],
        ['microclimate',   'soil_microbe'],
        ['natural_enemy',  'crop_vitality'],
    ];
    for (const [a, b] of relPairs) {
        await publishTest(relay, sk,
            `relationship: "${a}" — "${b}"`,
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone', 'warm-temperate'],
                    ['relationship', a, b],
                    ['phase',        'intermediate'],
                ],
                content: `関係性テスト: ${a} × ${b}`,
            },
            true
        );
    }

    // 3-7: phase 全値
    for (const phase of ['beginner', 'intermediate', 'expert']) {
        await publishTest(relay, sk,
            `phase="${phase}"`,
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone', 'warm-temperate'],
                    ['relationship', 'microclimate', 'weed_flora'],
                    ['phase',        phase],
                ],
                content: `熟達段階テスト: ${phase}`,
            },
            true
        );
    }

    // 3-8: trigger タグ — 全カテゴリ
    const triggerCases = [
        ['sensor_anomaly',    'soil_moisture'],
        ['sensor_anomaly',    'temperature'],
        ['sensor_anomaly',    'illuminance'],
        ['farmer_observation','weed_change'],
        ['farmer_observation','pest_found'],
        ['farmer_observation','crop_symptom'],
        ['periodic_review',   'weekly'],
        ['periodic_review',   'seasonal'],
        ['external_event',    'heavy_rain'],
        ['external_event',    'frost'],
        ['external_event',    'drought'],
    ];
    for (const [cat, val] of triggerCases) {
        await publishTest(relay, sk,
            `trigger: category="${cat}" value="${val}"`,
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone', 'warm-temperate'],
                    ['relationship', 'microclimate', 'weed_flora'],
                    ['phase',        'intermediate'],
                    ['trigger', cat, val],
                ],
                content: `トリガーテスト: ${cat}/${val}`,
            },
            true
        );
    }

    // 3-9: 複数 context タグ（全 4 カテゴリ同時付与）
    await publishTest(relay, sk,
        '全 4 context カテゴリ同時付与',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone',    'cool-temperate'],
                ['context',      'soil_type',       'peat'],
                ['context',      'farming_context', 'organic'],
                ['context',      'crop_family',     'legume'],
                ['relationship', 'nutrient_cycle',  'crop_vitality'],
                ['phase',        'expert'],
                ['trigger',      'periodic_review', 'seasonal'],
            ],
            content: '泥炭土壌の有機農場でマメ科作物の窒素固定はどう機能するか？',
        },
        true
    );
}

// ═══════════════════════════════════════════════════════════════
// §4. DSL 層（第2層）— 単一モデル
// ═══════════════════════════════════════════════════════════════

async function testDslSingle(relay, sk) {
    section(4, 'DSL 層（第2層）— 単一モデル');

    // 4-1: 最小 DSL（model + 2変数 + 1関係）
    await publishTest(relay, sk,
        'DSL 最小構成: independent → dependent',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone', 'warm-temperate'],
                ['context',      'soil_type',    'volcanic_ash'],
                ['context',      'farming_context','no_till'],
                ['context',      'crop_family',  'solanaceae'],
                ['relationship', 'microclimate', 'weed_flora'],
                ['phase',        'intermediate'],
                ['trigger',      'farmer_observation', 'weed_change'],
                // DSL: スキーマ §2.6.3 の基本例
                ['dsl:model', 'm1', 'climate_model'],
                ['dsl:var',   'm1', 'microclimate', 'independent'],
                ['dsl:var',   'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',   'm1', 'microclimate', 'weed_flora'],
            ],
            content: '雑草の生え方が場所によって違うのはなぜ？',
        },
        true
    );

    // 4-2: DSL なしのイベントも有効（optional）
    await publishTest(relay, sk,
        'DSL タグなし（第1層のみ）— optional なので有効',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone', 'subtropical'],
                ['context',      'soil_type',    'sandy'],
                ['context',      'crop_family',  'cucurbitaceae'],
                ['relationship', 'soil_physical','crop_vitality'],
                ['phase',        'beginner'],
            ],
            content: '砂質土壌でウリ科の根が浅いのは排水性のためか？',
        },
        true
    );

    // 4-3: phase ✕ DSL — 全 phase 値で確認
    for (const phase of ['beginner', 'intermediate', 'expert']) {
        await publishTest(relay, sk,
            `DSL + phase="${phase}"`,
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone', 'warm-temperate'],
                    ['relationship', 'soil_moisture','weed_flora'],
                    ['phase', phase],
                    ['dsl:model', 'm1', 'moisture_model'],
                    ['dsl:var',   'm1', 'soil_moisture', 'independent'],
                    ['dsl:var',   'm1', 'weed_flora',    'dependent'],
                    ['dsl:rel',   'm1', 'soil_moisture', 'weed_flora'],
                ],
                content: `phase=${phase} — 土壌水分と雑草相の問い`,
            },
            true
        );
    }
}

// ═══════════════════════════════════════════════════════════════
// §5. DSL 層（第2層）— 複数モデル（解釈の多様性）
// ═══════════════════════════════════════════════════════════════

async function testDslMulti(relay, sk) {
    section(5, 'DSL 層（第2層）— 複数モデル（解釈の多様性）');

    // 5-1: 2 モデル共存（スキーマ §2.6.4 の正典例）
    await publishTest(relay, sk,
        '2 モデル共存: climate_model (m1) + soil_model (m2)',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone',    'warm-temperate'],
                ['context',      'soil_type',       'volcanic_ash'],
                ['context',      'farming_context', 'no_till'],
                ['context',      'crop_family',     'solanaceae'],
                ['relationship', 'microclimate',    'weed_flora'],
                ['phase',        'intermediate'],
                ['trigger',      'farmer_observation', 'weed_change'],
                // m1: 気候解釈
                ['dsl:model', 'm1', 'climate_model'],
                ['dsl:var',   'm1', 'microclimate',  'independent'],
                ['dsl:var',   'm1', 'weed_flora',     'dependent'],
                ['dsl:rel',   'm1', 'microclimate',   'weed_flora'],
                // m2: 土壌解釈（意図的な競合モデル）
                ['dsl:model', 'm2', 'soil_model'],
                ['dsl:var',   'm2', 'soil_nutrients', 'independent'],
                ['dsl:var',   'm2', 'weed_flora',     'dependent'],
                ['dsl:rel',   'm2', 'soil_nutrients', 'weed_flora'],
            ],
            content: '雑草の生え方が場所によって違うのはなぜ？',
        },
        true
    );

    // 5-2: 3 モデル共存（天敵出現パターン — 捕食・生息地・微気候）
    await publishTest(relay, sk,
        '3 モデル共存: predation / habitat / microclimate モデル',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone', 'cool-temperate'],
                ['context',      'soil_type',    'alluvial'],
                ['relationship', 'pest',         'natural_enemy'],
                ['phase',        'expert'],
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
            content: '天敵の出現パターンはどの要因で最もよく説明できるか？',
        },
        true
    );

    // 5-3: 同一 dependent 変数を複数モデルが異なる独立変数で説明するパターン
    await publishTest(relay, sk,
        '競合モデル: 同一 dependent を異なる independent で説明',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone',    'warm-temperate'],
                ['context',      'soil_type',       'clay'],
                ['context',      'farming_context', 'conventional'],
                ['context',      'crop_family',     'poaceae'],
                ['relationship', 'soil_moisture',   'pest'],
                ['phase',        'intermediate'],
                // m1: 水分ストレスモデル
                ['dsl:model', 'm1', 'moisture_stress_model'],
                ['dsl:var',   'm1', 'soil_moisture', 'independent'],
                ['dsl:var',   'm1', 'pest',           'dependent'],
                ['dsl:rel',   'm1', 'soil_moisture', 'pest'],
                // m2: 微気候モデル
                ['dsl:model', 'm2', 'thermal_model'],
                ['dsl:var',   'm2', 'microclimate',  'independent'],
                ['dsl:var',   'm2', 'pest',           'dependent'],
                ['dsl:rel',   'm2', 'microclimate',  'pest'],
            ],
            content: 'イネ科圃場の害虫増加は土壌水分の影響か、それとも微気候の問題か？',
        },
        true
    );
}

// ═══════════════════════════════════════════════════════════════
// §6. DSL 層（第2層）— mediator / moderator
// ═══════════════════════════════════════════════════════════════

async function testDslRoles(relay, sk) {
    section(6, 'DSL 層（第2層）— 媒介変数・調整変数');

    // 6-1: mediator — 因果連鎖 A → M → B（スキーマ §2.6.5 の正典例）
    await publishTest(relay, sk,
        'mediator: 因果連鎖 soil_microbe → nutrient_cycle → crop_vitality',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone',    'warm-temperate'],
                ['context',      'soil_type',       'volcanic_ash'],
                ['context',      'farming_context', 'organic'],
                ['relationship', 'soil_microbe',    'crop_vitality'],
                ['phase',        'expert'],
                ['trigger',      'periodic_review', 'seasonal'],
                ['dsl:model', 'm1', 'nutrient_chain_model'],
                ['dsl:var',   'm1', 'soil_microbe',   'independent'],
                ['dsl:var',   'm1', 'nutrient_cycle',  'mediator'],
                ['dsl:var',   'm1', 'crop_vitality',   'dependent'],
                ['dsl:rel',   'm1', 'soil_microbe',   'nutrient_cycle'],
                ['dsl:rel',   'm1', 'nutrient_cycle',  'crop_vitality'],
            ],
            content: '土壌微生物が作物の活力を高めるとしたら、それは養分循環を介しているのだろうか？',
        },
        true
    );

    // 6-2: mediator — 別系統: weed_flora → soil_microbe → soil_physical
    await publishTest(relay, sk,
        'mediator: weed_flora → soil_microbe → soil_physical',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone',    'cool-temperate'],
                ['context',      'farming_context', 'no_till'],
                ['relationship', 'weed_flora',      'soil_physical'],
                ['phase',        'expert'],
                ['dsl:model', 'm1', 'weed_soil_chain'],
                ['dsl:var',   'm1', 'weed_flora',   'independent'],
                ['dsl:var',   'm1', 'soil_microbe',  'mediator'],
                ['dsl:var',   'm1', 'soil_physical', 'dependent'],
                ['dsl:rel',   'm1', 'weed_flora',   'soil_microbe'],
                ['dsl:rel',   'm1', 'soil_microbe',  'soil_physical'],
            ],
            content: '不耕起圃場で雑草が多いほど土壌物理性がよい傾向があるが、土壌微生物が仲介しているのか？',
        },
        true
    );

    // 6-3: moderator — 関係性の強さを条件づける変数
    await publishTest(relay, sk,
        'moderator: microclimate が soil_moisture → pest の関係を調整する',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone', 'warm-temperate'],
                ['context',      'soil_type',    'clay'],
                ['relationship', 'soil_moisture','pest'],
                ['phase',        'intermediate'],
                ['dsl:model', 'm1', 'pest_moisture_model'],
                ['dsl:var',   'm1', 'soil_moisture', 'independent'],
                ['dsl:var',   'm1', 'microclimate',  'moderator'],
                ['dsl:var',   'm1', 'pest',           'dependent'],
                ['dsl:rel',   'm1', 'soil_moisture', 'pest'],
                ['dsl:rel',   'm1', 'microclimate',  'pest'],
            ],
            content: '土壌水分と害虫発生の関係は、圃場の微気候によって変わるのだろうか？',
        },
        true
    );

    // 6-4: mediator + moderator の同居
    await publishTest(relay, sk,
        'mediator + moderator の同居（1 モデル内で 4 役割全て使用）',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone', 'subtropical'],
                ['context',      'crop_family',  'legume'],
                ['relationship', 'microclimate', 'crop_vitality'],
                ['phase',        'expert'],
                ['dsl:model', 'm1', 'complex_model'],
                ['dsl:var',   'm1', 'microclimate',  'independent'],
                ['dsl:var',   'm1', 'soil_moisture',  'mediator'],
                ['dsl:var',   'm1', 'weed_flora',     'moderator'],
                ['dsl:var',   'm1', 'crop_vitality',  'dependent'],
                ['dsl:rel',   'm1', 'microclimate',  'soil_moisture'],
                ['dsl:rel',   'm1', 'soil_moisture',  'crop_vitality'],
                ['dsl:rel',   'm1', 'weed_flora',     'crop_vitality'],
            ],
            content: '微気候・土壌水分・雑草密度が作物の活力に与える複合的な効果はどう整理できるか？',
        },
        true
    );
}

// ═══════════════════════════════════════════════════════════════
// §7. DSL 層（第2層）— dsl:meta タグ
// ═══════════════════════════════════════════════════════════════

async function testDslMeta(relay, sk) {
    section(7, 'DSL 層（第2層）— dsl:meta タグ');

    // 7-1: AI 生成メタデータ付与
    await publishTest(relay, sk,
        'dsl:meta: generated_by + observation_period + confidence',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone',    'subtropical'],
                ['context',      'soil_type',       'sandy'],
                ['context',      'farming_context', 'greenhouse_unheated'],
                ['context',      'crop_family',     'cucurbitaceae'],
                ['relationship', 'soil_physical',   'crop_vitality'],
                ['phase',        'intermediate'],
                ['trigger',      'sensor_anomaly',  'soil_moisture'],
                ['dsl:model', 'm1', 'drainage_model'],
                ['dsl:var',   'm1', 'soil_physical', 'independent'],
                ['dsl:var',   'm1', 'crop_vitality', 'dependent'],
                ['dsl:rel',   'm1', 'soil_physical', 'crop_vitality'],
                ['dsl:meta',  'm1', 'generated_by',       'edge-ai-v0.3'],
                ['dsl:meta',  'm1', 'observation_period', '14d'],
                ['dsl:meta',  'm1', 'confidence_hint',    '0.75'],
            ],
            content: '砂質土壌でのウリ科の排水性問題は作物の活力にどう影響するか？',
        },
        true
    );

    // 7-2: 複数モデル × dsl:meta（各モデルに別々のメタデータ）
    await publishTest(relay, sk,
        '複数モデル × dsl:meta（各モデル独立のメタデータ）',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone', 'warm-temperate'],
                ['relationship', 'microclimate', 'weed_flora'],
                ['phase',        'intermediate'],
                // m1 + meta
                ['dsl:model', 'm1', 'climate_model'],
                ['dsl:var',   'm1', 'microclimate',  'independent'],
                ['dsl:var',   'm1', 'weed_flora',     'dependent'],
                ['dsl:rel',   'm1', 'microclimate',   'weed_flora'],
                ['dsl:meta',  'm1', 'generated_by',  'llama3-local'],
                ['dsl:meta',  'm1', 'version',        '0.2.1'],
                // m2 + meta
                ['dsl:model', 'm2', 'soil_model'],
                ['dsl:var',   'm2', 'soil_nutrients', 'independent'],
                ['dsl:var',   'm2', 'weed_flora',     'dependent'],
                ['dsl:rel',   'm2', 'soil_nutrients', 'weed_flora'],
                ['dsl:meta',  'm2', 'generated_by',  'claude-3.5-sonnet'],
                ['dsl:meta',  'm2', 'review_date',    '2026-05-01'],
            ],
            content: '雑草の生え方が場所によって違うのはなぜ？（AI 生成 DSL 付き）',
        },
        true
    );
}

// ═══════════════════════════════════════════════════════════════
// §8. Lineage（e タグ）— derived_from / synthesis
// ═══════════════════════════════════════════════════════════════

async function testLineage(relay, sk) {
    section(8, 'Lineage（e タグ）— 問いの系譜');

    // 8-1: Genesis Inquiry（e タグなし）
    const genesis = await publishTest(relay, sk,
        'Genesis Inquiry — 起点の問い（e タグなし）+ DSL',
        {
            kind: 1042,
            created_at: now(),
            tags: [
                ['t', 'agroecology'],
                ['context',      'climate_zone',    'cool-temperate'],
                ['context',      'soil_type',       'peat'],
                ['context',      'farming_context', 'open_field'],
                ['context',      'crop_family',     'legume'],
                ['relationship', 'nutrient_cycle',  'crop_vitality'],
                ['phase',        'intermediate'],
                ['trigger',      'sensor_anomaly',  'soil_moisture'],
                ['dsl:model', 'm1', 'nitrogen_model'],
                ['dsl:var',   'm1', 'nutrient_cycle', 'independent'],
                ['dsl:var',   'm1', 'crop_vitality',  'dependent'],
                ['dsl:rel',   'm1', 'nutrient_cycle', 'crop_vitality'],
            ],
            content: '泥炭土壌ではマメ科作物の窒素固定がうまく機能しないのだろうか？',
        },
        true
    );

    // 8-2: derived_from — Genesis を親とする派生問い
    let derived1 = null;
    if (genesis) {
        derived1 = await publishTest(relay, sk,
            'derived_from — Genesis から派生（context 翻訳）+ DSL',
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone',    'warm-temperate'],
                    ['context',      'soil_type',       'volcanic_ash'],
                    ['context',      'farming_context', 'organic'],
                    ['context',      'crop_family',     'legume'],
                    ['relationship', 'soil_microbe',    'nutrient_cycle'],
                    ['phase',        'intermediate'],
                    // 系譜: derived_from
                    ['e', genesis.id, RELAY_URL, 'derived_from'],
                    ['dsl:model', 'm1', 'rhizobia_model'],
                    ['dsl:var',   'm1', 'soil_microbe',  'independent'],
                    ['dsl:var',   'm1', 'nutrient_cycle', 'dependent'],
                    ['dsl:rel',   'm1', 'soil_microbe',  'nutrient_cycle'],
                ],
                content: '火山灰土壌での根粒菌活性が低い場合、土壌物理性の影響はあるか？',
            },
            true
        );
    } else {
        skip('derived_from — Genesis 送信失敗のためスキップ');
    }

    // 8-3: さらに深い derived_from（第2世代の派生）
    let derived2 = null;
    if (derived1) {
        derived2 = await publishTest(relay, sk,
            'derived_from（第2世代）— derived1 を親とする再派生',
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone',    'warm-temperate'],
                    ['context',      'soil_type',       'volcanic_ash'],
                    ['context',      'farming_context', 'no_till'],
                    ['context',      'crop_family',     'legume'],
                    ['relationship', 'soil_physical',   'soil_microbe'],
                    ['phase',        'expert'],
                    ['e', derived1.id, RELAY_URL, 'derived_from'],
                    ['dsl:model', 'm1', 'physical_microbe_model'],
                    ['dsl:var',   'm1', 'soil_physical', 'independent'],
                    ['dsl:var',   'm1', 'soil_microbe',  'dependent'],
                    ['dsl:rel',   'm1', 'soil_physical', 'soil_microbe'],
                ],
                content: '不耕起で土壌物理性が改善されると、根粒菌の活性も回復するのか？',
            },
            true
        );
    } else {
        skip('derived_from（第2世代）— derived1 送信失敗のためスキップ');
    }

    // 8-4: synthesis — 複数の独立した問いを統合した高次仮説
    //       genesis と derived1 の両方を親として synthesis
    if (genesis && derived1) {
        await publishTest(relay, sk,
            'synthesis — 2つの問いを統合した高次仮説',
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone', 'warm-temperate'],
                    ['context',      'soil_type',    'volcanic_ash'],
                    ['relationship', 'soil_physical','crop_vitality'],
                    ['phase',        'expert'],
                    // 系譜: 2つの親を synthesis
                    ['e', genesis.id,  RELAY_URL, 'synthesis'],
                    ['e', derived1.id, RELAY_URL, 'synthesis'],
                    // 統合 DSL: mediator を含む高次モデル
                    ['dsl:model', 'm1', 'integrated_model'],
                    ['dsl:var',   'm1', 'soil_physical', 'independent'],
                    ['dsl:var',   'm1', 'soil_microbe',  'mediator'],
                    ['dsl:var',   'm1', 'nutrient_cycle', 'mediator'],
                    ['dsl:var',   'm1', 'crop_vitality',  'dependent'],
                    ['dsl:rel',   'm1', 'soil_physical', 'soil_microbe'],
                    ['dsl:rel',   'm1', 'soil_microbe',  'nutrient_cycle'],
                    ['dsl:rel',   'm1', 'nutrient_cycle', 'crop_vitality'],
                    ['dsl:meta',  'm1', 'synthesis_source', '2-events'],
                ],
                content: '土壌物理性の改善 → 根粒菌の回復 → 窒素固定の活性化 → 作物の活力向上、という連鎖は成立するか？',
            },
            true
        );
    } else {
        skip('synthesis — 親イベントの送信失敗のためスキップ');
    }

    // 8-5: e タグを複数持つ synthesis（3つの親）
    if (genesis && derived1 && derived2) {
        await publishTest(relay, sk,
            'synthesis — 3つの親からの統合',
            {
                kind: 1042,
                created_at: now(),
                tags: [
                    ['t', 'agroecology'],
                    ['context',      'climate_zone', 'warm-temperate'],
                    ['relationship', 'soil_microbe', 'crop_vitality'],
                    ['phase',        'expert'],
                    ['e', genesis.id,  RELAY_URL, 'synthesis'],
                    ['e', derived1.id, RELAY_URL, 'synthesis'],
                    ['e', derived2.id, RELAY_URL, 'synthesis'],
                    ['dsl:model', 'm1', 'grand_synthesis_model'],
                    ['dsl:var',   'm1', 'soil_physical', 'independent'],
                    ['dsl:var',   'm1', 'soil_microbe',  'mediator'],
                    ['dsl:var',   'm1', 'crop_vitality',  'dependent'],
                    ['dsl:rel',   'm1', 'soil_physical', 'soil_microbe'],
                    ['dsl:rel',   'm1', 'soil_microbe',  'crop_vitality'],
                    ['dsl:meta',  'm1', 'synthesis_depth', '3'],
                ],
                content: '火山灰土壌の不耕起圃場における土壌物理性・微生物・養分循環・作物活力の連鎖仮説の総合検証',
            },
            true
        );
    } else {
        skip('synthesis（3親）— 一部の親イベント送信失敗のためスキップ');
    }
}

// ═══════════════════════════════════════════════════════════════
// §9. DSL バリデーション — 異常系（送信前ローカル拒否）
// ═══════════════════════════════════════════════════════════════

async function testDslValidationErrors(relay, sk) {
    section(9, 'DSL バリデーション — 異常系（送信前に拒否されるべきケース）');

    // 共通の最小タグ（context + relationship + phase）
    const base = [
        ['t', 'agroecology'],
        ['context',      'climate_zone', 'warm-temperate'],
        ['relationship', 'microclimate', 'weed_flora'],
        ['phase',        'beginner'],
    ];

    // 9-1: dsl:var の役割値が不正
    await publishTest(relay, sk,
        'dsl:var: 不正な役割値 "unknown_role" → バリデーション拒否',
        {
            kind: 1042, created_at: now(),
            tags: [
                ...base,
                ['dsl:model', 'm1', 'test_model'],
                ['dsl:var',   'm1', 'microclimate', 'unknown_role'], // ← 不正
                ['dsl:var',   'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',   'm1', 'microclimate', 'weed_flora'],
            ],
            content: '不正な役割値のテスト',
        },
        false
    );

    // 9-2: dsl:rel の終点変数が空
    await publishTest(relay, sk,
        'dsl:rel: 終点変数（val2）が空 → バリデーション拒否',
        {
            kind: 1042, created_at: now(),
            tags: [
                ...base,
                ['dsl:model', 'm1', 'test_model'],
                ['dsl:var',   'm1', 'microclimate', 'independent'],
                ['dsl:var',   'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',   'm1', 'microclimate', ''], // ← 空
            ],
            content: '終点変数が空のテスト',
        },
        false
    );

    // 9-3: dsl:rel の起点変数が空
    await publishTest(relay, sk,
        'dsl:rel: 起点変数（val1）が空 → バリデーション拒否',
        {
            kind: 1042, created_at: now(),
            tags: [
                ...base,
                ['dsl:model', 'm1', 'test_model'],
                ['dsl:var',   'm1', 'microclimate', 'independent'],
                ['dsl:var',   'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',   'm1', '',             'weed_flora'], // ← 空
            ],
            content: '起点変数が空のテスト',
        },
        false
    );

    // 9-4: dsl:model 宣言なしで dsl:var を参照
    await publishTest(relay, sk,
        'dsl:var: 対応する dsl:model 宣言なし → バリデーション拒否',
        {
            kind: 1042, created_at: now(),
            tags: [
                ...base,
                // dsl:model 宣言なし
                ['dsl:var', 'mx', 'microclimate', 'independent'],
                ['dsl:var', 'mx', 'weed_flora',   'dependent'],
                ['dsl:rel', 'mx', 'microclimate', 'weed_flora'],
            ],
            content: 'model 宣言なしのテスト',
        },
        false
    );

    // 9-5: dsl:model のモデル名（val1）が空
    await publishTest(relay, sk,
        'dsl:model: モデル名（val1）が空 → バリデーション拒否',
        {
            kind: 1042, created_at: now(),
            tags: [
                ...base,
                ['dsl:model', 'm1', ''],           // ← モデル名空
                ['dsl:var',   'm1', 'microclimate', 'independent'],
                ['dsl:var',   'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',   'm1', 'microclimate', 'weed_flora'],
            ],
            content: 'モデル名が空のテスト',
        },
        false
    );

    // 9-6: 未定義 dsl サブキー（TIPs 正式化前のキー）
    await publishTest(relay, sk,
        'dsl:confidence: 未定義サブキー → バリデーション拒否（TIPs 正式化前）',
        {
            kind: 1042, created_at: now(),
            tags: [
                ...base,
                ['dsl:model',      'm1', 'climate_model'],
                ['dsl:var',        'm1', 'microclimate', 'independent'],
                ['dsl:var',        'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',        'm1', 'microclimate', 'weed_flora'],
                ['dsl:confidence', 'm1', '0.8'],         // ← 未定義サブキー
            ],
            content: '未定義サブキーのテスト（将来 TIPs 正式化予定）',
        },
        false
    );

    // 9-7: model_id が空
    await publishTest(relay, sk,
        'dsl:var: model_id が空 → バリデーション拒否',
        {
            kind: 1042, created_at: now(),
            tags: [
                ...base,
                ['dsl:model', 'm1', 'test_model'],
                ['dsl:var',   '',   'microclimate', 'independent'], // ← model_id 空
                ['dsl:var',   'm1', 'weed_flora',   'dependent'],
                ['dsl:rel',   'm1', 'microclimate', 'weed_flora'],
            ],
            content: 'model_id が空のテスト',
        },
        false
    );
}

// ═══════════════════════════════════════════════════════════════
// §10. 境界値テスト — ペイロードサイズ
// ═══════════════════════════════════════════════════════════════

async function testPayloadSize(relay, sk) {
    section(10, '境界値テスト — ペイロードサイズ（上限 20 KB）');

    // 10-1: 10 モデル共存が 20 KB 未満に収まることを確認
    const tags10 = [
        ['t', 'agroecology'],
        ['context',      'climate_zone', 'warm-temperate'],
        ['relationship', 'microclimate', 'weed_flora'],
        ['phase',        'expert'],
    ];
    for (let i = 1; i <= 10; i++) {
        tags10.push(['dsl:model', `m${i}`, `model_${i}`]);
        tags10.push(['dsl:var',   `m${i}`, 'microclimate', 'independent']);
        tags10.push(['dsl:var',   `m${i}`, 'weed_flora',   'dependent']);
        tags10.push(['dsl:rel',   `m${i}`, 'microclimate', 'weed_flora']);
    }
    const template10 = {
        kind: 1042,
        created_at: now(),
        tags: tags10,
        content: '多数の DSL モデルを持つ問い（境界値テスト: 10 モデル）',
    };
    const kb10 = Buffer.byteLength(JSON.stringify(template10), 'utf8') / 1024;
    console.log(`  ℹ️  10 モデル ペイロード: ${kb10.toFixed(2)} KB（上限: 20 KB）`);

    if (kb10 < 20) {
        await publishTest(relay, sk, `10 モデル DSL (${kb10.toFixed(2)} KB) — 20 KB 未満で受け入れ`, template10, true);
    } else {
        skip('10 モデル DSL', '20 KB を超過（上限テスト対象外）');
    }

    // 10-2: maxLength: 20480B を超えるペイロードはリレーに拒否されるべき
    const baseTagsForOversize = [
        ['t', 'agroecology'],
        ['context',      'climate_zone', 'warm-temperate'],
        ['relationship', 'microclimate', 'weed_flora'],
        ['phase',        'intermediate'],
        ['test', 'true'],
    ];
    // maxLength のバイト数制限（20480B）を超えるように content を生成
    const overContent = 'a'.repeat(20480 + 100);

    const oversizeTemplate = {
        kind: 1042,
        created_at: now(),
        tags: baseTagsForOversize,
        content: overContent,
    };
    const contentBytes = Buffer.byteLength(overContent, 'utf8');
    console.log(`  ℹ️  超過ペイロード: content ${(contentBytes / 1024).toFixed(2)} KB（maxLength 20480B 超え → リレーに拒否されるべき）`);

    if (contentBytes > 20480) {
        await publishTest(relay, sk,
            `content ${(contentBytes / 1024).toFixed(2)} KB → リレーに拒否（maxLength 20480B）`,
            oversizeTemplate,
            false
        );
    } else {
        skip('20480B 超過テスト', '計算が 20480B に届かなかった（スキップ）');
    }
}

// ═══════════════════════════════════════════════════════════════
// メイン
// ═══════════════════════════════════════════════════════════════

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  Toitoi Relay Integration Test                               ║');
    console.log('║  Protocol Schema v0.1.2 / Architecture v0.3.0               ║');
    console.log(`║  接続先: ${RELAY_URL.slice(0, 52).padEnd(52)}║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // §0: NIP-11（WebSocket 接続不要）
    await testNip11();

    // WebSocket 接続
    let relay;
    try {
        relay = await Relay.connect(RELAY_URL);
        console.log(`\n✅ リレー接続成功: ${RELAY_URL}`);
    } catch (e) {
        console.error(`\n❌ リレー接続失敗: ${e}`);
        process.exit(1);
    }

    const sk = generateSecretKey();

    try {
        await testFiltering(relay, sk);
        await testSubscription(relay, sk);
        await testBoundaryObject(relay, sk);
        await testDslSingle(relay, sk);
        await testDslMulti(relay, sk);
        await testDslRoles(relay, sk);
        await testDslMeta(relay, sk);
        await testLineage(relay, sk);
        await testDslValidationErrors(relay, sk);
        await testPayloadSize(relay, sk);
    } finally {
        relay.close();
    }

    // ─── 結果サマリー ───────────────────────────────────────
    const passed  = results.filter(r => r.ok === true).length;
    const failed  = results.filter(r => r.ok === false).length;
    const skipped = results.filter(r => r.ok === null).length;
    const total   = results.length;

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                      テスト結果サマリー                      ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  🟢 PASS  : ${String(passed ).padEnd(4)} テスト                                   ║`);
    console.log(`║  🔴 FAIL  : ${String(failed ).padEnd(4)} テスト                                   ║`);
    console.log(`║  ⏭️  SKIP  : ${String(skipped).padEnd(4)} テスト                                   ║`);
    console.log(`║  合計     : ${String(total  ).padEnd(4)} テスト                                   ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');

    if (failed > 0) {
        console.log('\n🔴 失敗したテスト:');
        results.filter(r => r.ok === false).forEach(r => {
            console.log(`  - ${r.label}`);
            if (r.reason) console.log(`    ↳ ${r.reason}`);
        });
    }

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
