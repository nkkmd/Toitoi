# Lingonberry Package

`packages/lingonberry/` は、Lingonberry を Toitoi の transport projection / ingest source として扱うための実装入口です。

Lingonberry upstream では `knowledge object` が protocol-native な canonical object として定義されていますが、Toitoi ではそれを内部中心モデルにしません。Toitoi の中心は Canonical Event であり、この package は Lingonberry object と Canonical Event の境界を担当します。

## 全体像

```text
protocol.js
   |
   +--> adapter/lingonberry_adapter.js
   |       |
   |       +--> adapter/ingest_pipeline.js
   |
   +--> converter/canonical_to_lingonberry_converter.js
   |
   +--> storage/
           |
           +--> replay.js -> indexer.js -> standard_api_views.js
```

## 主なファイル

- `protocol.js`: Lingonberry の protocol descriptor
- `adapter/`: validate / verify / normalize / canonicalize / classify / ingest
- `converter/`: canonical と Lingonberry knowledge object の相互変換
- `live/`: HTTP carrier publish / retrieve helper
- `storage/`: raw/canonical append-only 保存、replay、index、API 向け view
- `fixtures/`: 最小 publish request fixture
- transport schema: [docs/protocols/LINGONBERRY_INQUIRY_SCHEMA.md](../../docs/protocols/LINGONBERRY_INQUIRY_SCHEMA.md)
- machine-readable schema: [schemas/lingonberry-inquiry.schema.json](../../schemas/lingonberry-inquiry.schema.json)
- 運用ガイド: [docs/operations/LINGONBERRY_STORAGE_AND_REPLAY.md](../../docs/operations/LINGONBERRY_STORAGE_AND_REPLAY.md)

## 現在の範囲

- Lingonberry `0.1.0` knowledge object / HTTP publish request を対象にする
- HTTP publish request の Ed25519 publisher signature を検証する
- archive / batch ingest を先に対象にし、live relay ingest は後続で gated smoke として扱う
- `TOITOI_PROTOCOL=lingonberry` と `TOITOI_TRANSPORT_SOURCES` の replay source として Standard API に接続する

## live smoke test

実際の Lingonberry HTTP carrier に 1 件 publish する gated smoke test は、明示した場合だけ実行します。

```bash
LINGONBERRY_LIVE_SMOKE_TEST=1 \
LINGONBERRY_CARRIER_URL=https://your-lingonberry.example \
LINGONBERRY_PUBLISHER_PUBLIC_KEY=<64-char-lowercase-hex> \
LINGONBERRY_PUBLISHER_PRIVATE_KEY="$(cat /path/to/ed25519-private-key.pem)" \
node packages/lingonberry/test_smoke.js
```

通常の test runner では `LINGONBERRY_LIVE_SMOKE_TEST=1` がない限り skip します。
