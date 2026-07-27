# Indexer and Standard API Quick Start

**Status:** v1.0.0 candidate  
**Language status:** English and Japanese sections are maintained as equivalent.  
**Last synchronized:** 2026-07-27

This guide starts the Toitoi Standard API with an in-memory search projection. It is the shortest path for checking process health and the Canonical read API before connecting a transport.

## 1. Install

From the repository root:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
```

## 2. Start the API

```bash
PORT=3000 corepack pnpm --filter @toitoi/api start
```

Without `TOITOI_STORAGE_DIR`, the process starts with an empty Canonical view, an in-memory FTS5 projection, development authentication, and publication workflow disabled.

Expected log prefix:

```text
Toitoi API listening on http://127.0.0.1:3000
```

## 3. Check health and the empty view

In another terminal:

```bash
curl -s http://127.0.0.1:3000/health/live
curl -s http://127.0.0.1:3000/health/ready
curl -s http://127.0.0.1:3000/api/v1/protocols
curl -s http://127.0.0.1:3000/api/v1/inquiries
curl -s 'http://127.0.0.1:3000/api/v1/search?q=soil'
```

An empty inquiry list is valid before storage is connected.

## 4. Start with one Canonical storage directory

After creating storage through a transport worker or the reference demo:

```bash
TOITOI_PROTOCOL=nostr \
TOITOI_STORAGE_DIR=/path/to/nostr-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
PORT=3000 \
corepack pnpm --filter @toitoi/api start
```

`TOITOI_PROTOCOL` may be `nostr`, `lingonberry`, or `atproto`.

## 5. Read several transports together

```bash
TOITOI_TRANSPORT_SOURCES='[
  {"protocol":"nostr","storageDir":"/path/to/nostr-storage"},
  {"protocol":"lingonberry","storageDir":"/path/to/lingonberry-storage"},
  {"protocol":"atproto","storageDir":"/path/to/atproto-storage"}
]' \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
PORT=3000 \
corepack pnpm --filter @toitoi/api start
```

The API returns a shared Canonical view. Duplicate suppression and provenance aggregation do not merge Canonical identity merely because records are similar.

## 6. Run validation

```bash
corepack pnpm --filter @toitoi/api test
corepack pnpm --filter @toitoi/conformance test
```

## Next

- Create transport storage: [`TRANSPORT_QUICKSTART.md`](./TRANSPORT_QUICKSTART.md)
- Enable AI inspection: [`EDGE_AI_QUICKSTART.md`](./EDGE_AI_QUICKSTART.md)
- Detailed API reference: [`../../apps/api/README.md`](../../apps/api/README.md)
- Production operation: [`../operations/V1.0.0_OPERATIONS_RUNBOOK.md`](../operations/V1.0.0_OPERATIONS_RUNBOOK.md)

---

# Indexer・Standard API Quick Start

**状態:** v1.0.0候補  
**言語状態:** 英語版と日本語版は同等の内容として管理します。  
**最終同期日:** 2026-07-27

このガイドでは、in-memory search projectionを使ってToitoi Standard APIを起動します。transportを接続する前に、process healthとCanonical read APIを確認するための最短経路です。

## 1. Install

repository rootで実行します。

```bash
corepack enable
corepack pnpm install --frozen-lockfile
```

## 2. APIを起動する

```bash
PORT=3000 corepack pnpm --filter @toitoi/api start
```

`TOITOI_STORAGE_DIR`を指定しない場合、空のCanonical view、in-memory FTS5 projection、development authenticationで起動し、publication workflowは無効です。

想定されるlog prefix:

```text
Toitoi API listening on http://127.0.0.1:3000
```

## 3. Healthと空のviewを確認する

別terminalで実行します。

```bash
curl -s http://127.0.0.1:3000/health/live
curl -s http://127.0.0.1:3000/health/ready
curl -s http://127.0.0.1:3000/api/v1/protocols
curl -s http://127.0.0.1:3000/api/v1/inquiries
curl -s 'http://127.0.0.1:3000/api/v1/search?q=soil'
```

storage接続前にinquiry一覧が空であることは正常です。

## 4. 1つのCanonical storage directoryを読む

transport workerまたはreference demoでstorageを作成した後、次のように起動します。

```bash
TOITOI_PROTOCOL=nostr \
TOITOI_STORAGE_DIR=/path/to/nostr-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
PORT=3000 \
corepack pnpm --filter @toitoi/api start
```

`TOITOI_PROTOCOL`には`nostr`、`lingonberry`、`atproto`を指定できます。

## 5. 複数transportをまとめて読む

```bash
TOITOI_TRANSPORT_SOURCES='[
  {"protocol":"nostr","storageDir":"/path/to/nostr-storage"},
  {"protocol":"lingonberry","storageDir":"/path/to/lingonberry-storage"},
  {"protocol":"atproto","storageDir":"/path/to/atproto-storage"}
]' \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
PORT=3000 \
corepack pnpm --filter @toitoi/api start
```

APIは共通のCanonical viewを返します。duplicate suppressionやprovenance aggregationは、recordが類似しているだけでCanonical identityを統合しません。

## 6. Validationを実行する

```bash
corepack pnpm --filter @toitoi/api test
corepack pnpm --filter @toitoi/conformance test
```

## 次に読むもの

- transport storageを作る: [`TRANSPORT_QUICKSTART.md`](./TRANSPORT_QUICKSTART.md)
- AI inspectionを有効にする: [`EDGE_AI_QUICKSTART.md`](./EDGE_AI_QUICKSTART.md)
- 詳細API reference: [`../../apps/api/README.md`](../../apps/api/README.md)
- Production運用: [`../operations/V1.0.0_OPERATIONS_RUNBOOK.md`](../operations/V1.0.0_OPERATIONS_RUNBOOK.md)
