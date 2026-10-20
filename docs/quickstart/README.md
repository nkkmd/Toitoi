# Toitoi Developer Quick Starts

**Status:** v1.0.0 candidate
**Language status:** English and Japanese sections are maintained as equivalent.
**Last synchronized:** 2026-10-20

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
git checkout main
corepack enable
corepack pnpm install --frozen-lockfile
```

The v1.0.0 implementation is merged into main. Use `main` for pre-release evaluation. After v1.0.0 is published, use the `v1.0.0` tag to reproduce the public release.

## What these guides do not replace

- Production operations: [`../operations/V1.0.0_OPERATIONS_RUNBOOK.md`](../operations/V1.0.0_OPERATIONS_RUNBOOK.md)
- Full reference scenario: [`../reference/V1.0.0_SETUP_AND_DEMO.md`](../reference/V1.0.0_SETUP_AND_DEMO.md)
- Canonical contract: [`../protocols/CANONICAL_EVENT.md`](../protocols/CANONICAL_EVENT.md)
- Architecture: [`../architecture/ARCHITECTURE_OVERVIEW.md`](../architecture/ARCHITECTURE_OVERVIEW.md)

---

# Toitoi 外部開発者向けQuick Start

**状態:** v1.0.0候補
**言語状態:** 英語版と日本語版は同等の内容として管理します。
**最終同期日:** 2026-10-20

これらのガイドは、外部開発者がToitoi v1.0.0候補を短い手順で試すための入口です。まず動かすために必要な内容をまとめています。本番運用の手順や実装の詳細は、末尾の関連文書を参照してください。

## 目的別の入口

1. Canonical Eventの索引とStandard APIを起動する: [`INDEXER_API_QUICKSTART.md`](./INDEXER_API_QUICKSTART.md)
2. Nostr、Lingonberry、ATProtoから取り込む: [`TRANSPORT_QUICKSTART.md`](./TRANSPORT_QUICKSTART.md)
3. Edge AIの処理と人間による確認の仕組みを調べ、ローカルモデルを接続する: [`EDGE_AI_QUICKSTART.md`](./EDGE_AI_QUICKSTART.md)

一連の評価では、次の順序を推奨します。

```text
Indexer / Standard API
  -> いずれかの配信経路からの取り込み
  -> Edge AIの処理確認と人間による確認の仕組み
```

## 共通の前提条件

- Git
- Node.js 20以上
- Corepack
- このリポジトリの作業用コピー

```bash
git clone https://github.com/nkkmd/Toitoi.git
cd Toitoi
git checkout main
corepack enable
corepack pnpm install --frozen-lockfile
```

v1.0.0の実装はmainに統合済みです。正式公開前の評価には`main`を使います。v1.0.0公開後は、公開版を再現するために`v1.0.0`タグを使用してください。

## 詳細文書との関係

- 本番運用: [`../operations/V1.0.0_OPERATIONS_RUNBOOK.md`](../operations/V1.0.0_OPERATIONS_RUNBOOK.md)
- 参照シナリオ全体とセットアップ: [`../reference/V1.0.0_SETUP_AND_DEMO.md`](../reference/V1.0.0_SETUP_AND_DEMO.md)
- Canonical Eventの仕様: [`../protocols/CANONICAL_EVENT.md`](../protocols/CANONICAL_EVENT.md)
- 全体構成: [`../architecture/ARCHITECTURE_OVERVIEW.md`](../architecture/ARCHITECTURE_OVERVIEW.md)
