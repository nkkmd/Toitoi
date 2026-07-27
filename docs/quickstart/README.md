# Toitoi Developer Quick Starts

**Status:** v1.0.0 candidate  
**Language status:** English and Japanese sections are maintained as equivalent.  
**Last synchronized:** 2026-07-27

These guides are the shortest supported entry points for external developers evaluating the Toitoi v1.0.0 candidate. They intentionally separate the first successful run from detailed production and implementation documentation.

## Choose a path

1. Start the Canonical index and Standard API: [`INDEXER_API_QUICKSTART.md`](./INDEXER_API_QUICKSTART.md)
2. Ingest through Nostr, Lingonberry, or ATProto: [`TRANSPORT_QUICKSTART.md`](./TRANSPORT_QUICKSTART.md)
3. Inspect the Edge AI boundary and connect a local model: [`EDGE_AI_QUICKSTART.md`](./EDGE_AI_QUICKSTART.md)

Recommended order for a complete evaluation:

```text
Indexer / Standard API
  -> one transport ingest path
  -> Edge AI inspection and review boundary
```

## Shared prerequisites

- Git
- Node.js 20 or later
- Corepack
- a checkout of this repository

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
git checkout agent/v1.0.0-reference-implementation
corepack enable
corepack pnpm install --frozen-lockfile
```

The branch command is for the current release candidate only. After v1.0.0 is published, use the `v1.0.0` tag instead.

## What these guides do not replace

- Production operations: [`../operations/V1.0.0_OPERATIONS_RUNBOOK.md`](../operations/V1.0.0_OPERATIONS_RUNBOOK.md)
- Full reference scenario: [`../reference/V1.0.0_SETUP_AND_DEMO.md`](../reference/V1.0.0_SETUP_AND_DEMO.md)
- Canonical contract: [`../protocols/CANONICAL_EVENT.md`](../protocols/CANONICAL_EVENT.md)
- Architecture: [`../architecture/ARCHITECTURE_OVERVIEW.md`](../architecture/ARCHITECTURE_OVERVIEW.md)

---

# Toitoi 外部開発者向けQuick Start

**状態:** v1.0.0候補  
**言語状態:** 英語版と日本語版は同等の内容として管理します。  
**最終同期日:** 2026-07-27

これらのガイドは、外部開発者がToitoi v1.0.0候補を評価するための最短の入口です。最初の動作確認と、production運用・詳細実装文書を意図的に分離しています。

## 目的別の入口

1. Canonical indexとStandard APIを起動する: [`INDEXER_API_QUICKSTART.md`](./INDEXER_API_QUICKSTART.md)
2. Nostr、Lingonberry、ATProtoから取り込む: [`TRANSPORT_QUICKSTART.md`](./TRANSPORT_QUICKSTART.md)
3. Edge AI境界を確認しlocal modelを接続する: [`EDGE_AI_QUICKSTART.md`](./EDGE_AI_QUICKSTART.md)

一連の評価では、次の順序を推奨します。

```text
Indexer / Standard API
  -> いずれかのtransport ingest
  -> Edge AI inspectionとreview境界
```

## 共通の前提条件

- Git
- Node.js 20以上
- Corepack
- このrepositoryのcheckout

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
git checkout agent/v1.0.0-reference-implementation
corepack enable
corepack pnpm install --frozen-lockfile
```

branch指定は現在のrelease candidate向けです。v1.0.0公開後は`v1.0.0` tagを使用します。

## 詳細文書との関係

- Production運用: [`../operations/V1.0.0_OPERATIONS_RUNBOOK.md`](../operations/V1.0.0_OPERATIONS_RUNBOOK.md)
- 完全なreference scenario: [`../reference/V1.0.0_SETUP_AND_DEMO.md`](../reference/V1.0.0_SETUP_AND_DEMO.md)
- Canonical contract: [`../protocols/CANONICAL_EVENT.md`](../protocols/CANONICAL_EVENT.md)
- Architecture: [`../architecture/ARCHITECTURE_OVERVIEW.md`](../architecture/ARCHITECTURE_OVERVIEW.md)
