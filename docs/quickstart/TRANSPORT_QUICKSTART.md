# Transport Quick Start

**Status:** v1.0.0 candidate  
**Language status:** English and Japanese sections are maintained as equivalent.  
**Last synchronized:** 2026-07-27

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
**最終同期日:** 2026-07-27

このガイドでは、Toitoiが対応するNostr、Lingonberry、ATProtoのいずれかからCanonical storageを作成します。transport recordは入力または配送上の表現であり、Canonical identityを定義しません。

## 共通setup

```bash
corepack enable
corepack pnpm install --frozen-lockfile
mkdir -p .local/transport-storage
```

## Path A: Nostr relayから取り込む

```bash
corepack pnpm --filter @toitoi/nostr-transport start -- \
  --relay-url wss://relay.example.com \
  --protocol nostr \
  --storage-dir "$PWD/.local/transport-storage/nostr"
```

workerはrelay eventを読み、対応recordをcanonicalizeし、append-onlyなraw、Canonical、ingest log、index snapshotを保存します。アクセス権限のあるrelayを使用してください。self-hostingとproduction運用は[`../../infra/transports/nostr/NOSTR_RELAY_SETUP.md`](../../infra/transports/nostr/NOSTR_RELAY_SETUP.md)を参照します。

## Path B: Lingonberryから取り込む

carrier endpointから:

```bash
corepack pnpm --filter @toitoi/lingonberry-transport start -- \
  --carrier-url https://lingonberry.example \
  --protocol lingonberry \
  --storage-dir "$PWD/.local/transport-storage/lingonberry" \
  --source-label carrier
```

archive directoryから:

```bash
corepack pnpm --filter @toitoi/lingonberry-transport start -- \
  --archive-dir /path/to/lingonberry-archive \
  --protocol lingonberry \
  --storage-dir "$PWD/.local/transport-storage/lingonberry" \
  --source-label archive
```

JSONL fileから:

```bash
corepack pnpm --filter @toitoi/lingonberry-transport start -- \
  --in /path/to/lingonberry-events.jsonl \
  --protocol lingonberry \
  --storage-dir "$PWD/.local/transport-storage/lingonberry" \
  --source-label jsonl
```

## Path C: ATProtoから取り込む

保存済みJSONL archiveのbatch ingest:

```bash
corepack pnpm --filter @toitoi/atproto-transport start -- \
  --in /path/to/atproto-events.jsonl \
  --out "$PWD/.local/transport-storage/atproto-report.json" \
  --storage-dir "$PWD/.local/transport-storage/atproto"
```

Jetstream-compatible endpointからのlive ingest:

```bash
corepack pnpm --filter @toitoi/atproto-transport start -- \
  --stream-url wss://jetstream.example/subscribe \
  --storage-dir "$PWD/.local/transport-storage/atproto"
```

処理権限のあるcollectionとendpointだけを購読してください。live availabilityはdeterministic CIの対象外です。

## Standard APIから結果を確認する

```bash
TOITOI_TRANSPORT_SOURCES='[
  {"protocol":"nostr","storageDir":".local/transport-storage/nostr"},
  {"protocol":"lingonberry","storageDir":".local/transport-storage/lingonberry"},
  {"protocol":"atproto","storageDir":".local/transport-storage/atproto"}
]' PORT=3000 corepack pnpm --filter @toitoi/api start
```

続けて:

```bash
curl -s http://127.0.0.1:3000/api/v1/protocols
curl -s http://127.0.0.1:3000/api/v1/inquiries
```

作成していないstorage directoryのentryは除外してください。

## 重要な境界

- transport deliveryの成功とCanonical persistenceの成功は別です。
- 異なるtransport上の類似recordを自動的に同じCanonical Eventとして扱いません。
- raw transport recordとCanonical Eventは別々にattributionを保持します。
- production credentialとprivate keyをcommitしてはいけません。
