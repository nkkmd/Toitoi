# Transport Quick Start

**Status:** v1.0.0 candidate
**Language status:** English and Japanese sections are maintained as equivalent.
**Last synchronized:** 2026-10-20

This guide creates Canonical storage from one of Toitoi's supported transport inputs: Nostr, Lingonberry, or ATProto. A transport record is an input or delivery representation; it does not define Canonical identity.

## Shared setup

```bash
corepack enable
corepack pnpm install --frozen-lockfile
mkdir -p .local/transport-storage
```

## Path A: Nostr relay ingest

```bash
corepack pnpm --filter @toitoi/nostr-transport start -- \
  --relay-url wss://relay.example.com \
  --protocol nostr \
  --storage-dir "$PWD/.local/transport-storage/nostr"
```

The worker reads relay events, canonicalizes supported records, and writes append-only raw, Canonical, ingest-log, and index-snapshot state. Use a relay that you are authorized to access. For self-hosting and production operation, see [`../../infra/transports/nostr/NOSTR_RELAY_SETUP.md`](../../infra/transports/nostr/NOSTR_RELAY_SETUP.md).

## Path B: Lingonberry ingest

From a carrier endpoint:

```bash
corepack pnpm --filter @toitoi/lingonberry-transport start -- \
  --carrier-url https://lingonberry.example \
  --protocol lingonberry \
  --storage-dir "$PWD/.local/transport-storage/lingonberry" \
  --source-label carrier
```

From an archive directory:

```bash
corepack pnpm --filter @toitoi/lingonberry-transport start -- \
  --archive-dir /path/to/lingonberry-archive \
  --protocol lingonberry \
  --storage-dir "$PWD/.local/transport-storage/lingonberry" \
  --source-label archive
```

From a JSONL file:

```bash
corepack pnpm --filter @toitoi/lingonberry-transport start -- \
  --in /path/to/lingonberry-events.jsonl \
  --protocol lingonberry \
  --storage-dir "$PWD/.local/transport-storage/lingonberry" \
  --source-label jsonl
```

## Path C: ATProto ingest

Batch ingest from a saved JSONL archive:

```bash
corepack pnpm --filter @toitoi/atproto-transport start -- \
  --in /path/to/atproto-events.jsonl \
  --out "$PWD/.local/transport-storage/atproto-report.json" \
  --storage-dir "$PWD/.local/transport-storage/atproto"
```

Live ingest from a Jetstream-compatible endpoint:

```bash
corepack pnpm --filter @toitoi/atproto-transport start -- \
  --stream-url wss://jetstream.example/subscribe \
  --storage-dir "$PWD/.local/transport-storage/atproto"
```

Only subscribe to collections and endpoints you are authorized to process. Live availability is external to deterministic CI.

## Inspect the result through the Standard API

```bash
TOITOI_TRANSPORT_SOURCES='[
  {"protocol":"nostr","storageDir":".local/transport-storage/nostr"},
  {"protocol":"lingonberry","storageDir":".local/transport-storage/lingonberry"},
  {"protocol":"atproto","storageDir":".local/transport-storage/atproto"}
]' PORT=3000 corepack pnpm --filter @toitoi/api start
```

Then:

```bash
curl -s http://127.0.0.1:3000/api/v1/protocols
curl -s http://127.0.0.1:3000/api/v1/inquiries
```

Omit transport entries whose storage directory you did not create.

## Important boundaries

- Transport delivery success is not Canonical persistence success.
- Similar records from different transports are not automatically the same Canonical Event.
- Raw transport records and Canonical Events remain separately attributable.
- Production credentials and private keys must not be committed.

---

# Transport Quick Start

**状態:** v1.0.0候補
**言語状態:** 英語版と日本語版は同等の内容として管理します。
**最終同期日:** 2026-10-20

このガイドでは、Nostr、Lingonberry、ATProtoのいずれかから記録を取り込み、Canonical Eventの保存領域を作成します。配信先固有の記録は、入力や配送のための表現です。それ自体でCanonical Eventの同一性（Canonical identity）は決まりません。

## 共通の準備

```bash
corepack enable
corepack pnpm install --frozen-lockfile
mkdir -p .local/transport-storage
```

## 方法A: Nostrリレーから取り込む

```bash
corepack pnpm --filter @toitoi/nostr-transport start -- \
  --relay-url wss://relay.example.com \
  --protocol nostr \
  --storage-dir "$PWD/.local/transport-storage/nostr"
```

ワーカーはリレーのイベントを読み込み、対応する記録をCanonical Eventへ変換します。元データ、Canonical Event、取り込みログ、索引のスナップショットを追記型で保存します。アクセス権限のあるリレーを使用してください。自前でのホスティングと本番運用については、[`../../infra/transports/nostr/NOSTR_RELAY_SETUP.md`](../../infra/transports/nostr/NOSTR_RELAY_SETUP.md)を参照してください。

## 方法B: Lingonberryから取り込む

キャリアのエンドポイントから取り込む場合:

```bash
corepack pnpm --filter @toitoi/lingonberry-transport start -- \
  --carrier-url https://lingonberry.example \
  --protocol lingonberry \
  --storage-dir "$PWD/.local/transport-storage/lingonberry" \
  --source-label carrier
```

アーカイブ用ディレクトリから取り込む場合:

```bash
corepack pnpm --filter @toitoi/lingonberry-transport start -- \
  --archive-dir /path/to/lingonberry-archive \
  --protocol lingonberry \
  --storage-dir "$PWD/.local/transport-storage/lingonberry" \
  --source-label archive
```

JSONLファイルから取り込む場合:

```bash
corepack pnpm --filter @toitoi/lingonberry-transport start -- \
  --in /path/to/lingonberry-events.jsonl \
  --protocol lingonberry \
  --storage-dir "$PWD/.local/transport-storage/lingonberry" \
  --source-label jsonl
```

## 方法C: ATProtoから取り込む

保存済みのJSONLアーカイブを一括で取り込む場合:

```bash
corepack pnpm --filter @toitoi/atproto-transport start -- \
  --in /path/to/atproto-events.jsonl \
  --out "$PWD/.local/transport-storage/atproto-report.json" \
  --storage-dir "$PWD/.local/transport-storage/atproto"
```

Jetstream互換のエンドポイントからリアルタイムで取り込む場合:

```bash
corepack pnpm --filter @toitoi/atproto-transport start -- \
  --stream-url wss://jetstream.example/subscribe \
  --storage-dir "$PWD/.local/transport-storage/atproto"
```

処理権限のあるコレクションとエンドポイントだけを購読してください。実際の外部サービスの可用性は、固定入力で再現可能なCIの検証対象外です。

## Standard APIから結果を確認する

```bash
TOITOI_TRANSPORT_SOURCES='[
  {"protocol":"nostr","storageDir":".local/transport-storage/nostr"},
  {"protocol":"lingonberry","storageDir":".local/transport-storage/lingonberry"},
  {"protocol":"atproto","storageDir":".local/transport-storage/atproto"}
]' PORT=3000 corepack pnpm --filter @toitoi/api start
```

続けて、次を実行します。

```bash
curl -s http://127.0.0.1:3000/api/v1/protocols
curl -s http://127.0.0.1:3000/api/v1/inquiries
```

作成していない保存ディレクトリの設定項目は、除外してください。

## 区別すべきこと

- 配信の成功と、Canonical Eventの永続保存の成功は別です。
- 異なる配信経路にある記録を、似ているという理由だけで同じCanonical Eventとして扱いません。
- 受信した元の記録とCanonical Eventは、それぞれの帰属情報を保持します。
- 本番用の認証情報や秘密鍵をコミットしてはいけません。
