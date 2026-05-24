# ディレクトリ責務ルール

**Status: stable** | **Last updated: 2026-05-22**

## 目的

このドキュメントは、Toitoi リポジトリにおけるディレクトリ配置の判断基準と、主要ディレクトリの役割をまとめた正本です。

狙いは、実装が進んでも「どこに何を置くべきか」の意味を安定させることです。

## 判断原則

ファイルは「現時点の形」ではなく、「将来を含む責務」によって配置します。

迷ったときは、次の順で判断します。

1. これは配備される実行アプリか
2. これはインフラ運用のための資産か
3. これは再利用される共通モジュールか
4. これは横断的な仕様・思想ドキュメントか

## ディレクトリ構成

以下の並びは、判断原則の 1 → 4 に合わせた責務の優先順です。

```text
Toitoi/
├── README.md
├── CONTRIBUTING.md
├── LICENSE-AGPL
├── LICENSE-MIT
├── LICENSE_POLICY.md
│
├── apps/
│   ├── frontend/
│   ├── edge-ai/
│   └── api/
├── infra/
│   ├── transports/
│   │   └── nostr/
│   └── indexers/
│       └── nostr/
├── packages/
│   ├── atproto/
│   ├── localfs/
│   ├── protocol/
│   └── nostr/
│       ├── adapter/
│       ├── converter/
│       ├── storage/
│       └── protocol.js
├── docs/
│   ├── architecture/
│   ├── protocols/
│   ├── operations/
│   ├── concepts/
│   ├── essays/
│   └── roadmap/
├── schemas/
├── examples/
└── assets/
```

## ルートファイル

### `README.md`

プロジェクト全体の入口です。

含む内容:

- Toitoi の概要
- プロジェクト思想
- アーキテクチャ概要
- ドキュメント一覧
- 実行アプリケーション群
- ライセンス
- 参加方法

### `CONTRIBUTING.md`

コントリビューションガイドです。

含む内容:

- issue / PR 方針
- coding rules
- documentation policy
- protocol proposal process

### `LICENSE-AGPL` / `LICENSE-MIT`

各モジュールで利用する OSS ライセンスです。

### `LICENSE_POLICY.md`

ライセンス構成全体の説明です。

## `apps/`

配備される実行アプリケーション本体（実行単位）を置きます。

### `apps/frontend/`

ユーザー向けの viewer / UI layer を置きます。

含まれる主なファイル:

- `FRONTEND_UX_DESIGN.md`

### `apps/edge-ai/`

local-first AI inference layer を置きます。

含まれる主なファイル:

- `EDGE_AI_SETUP.md`

### `apps/api/`

Standard API の reference implementation を置きます。

canonical event と derived index をそのまま外に出すのではなく、薄い service layer を経由して canonical view を返します。

含まれる主なファイル:

- `README.md`
- `server.js`
- `standard_api_service.js`
- `test_standard_api_service.js`

## `infra/`

インフラ運用・構築・監視に関する資産を置きます。

例:

- relay / indexer のセットアップ手順
- 運用手順、監視手順
- 将来的な `docker-compose`、`Caddyfile`、`pm2` 設定、監視設定

ドキュメント中心の段階でも、責務がインフラ運用なら `infra/` に置きます。

### `infra/transports/nostr/`

Nostr relay layer の運用資産を置きます。

含まれる主なファイル:

- `NOSTR_RELAY_SETUP.md`
- `PREREQUISITE_INSTALLATION.md`
- `MONITOR_SETUP.md`
- `BACKUP_AND_RESTORE.md`
- `CLEAN_START.md`
- `INGEST_RETRY_POLICY.md`
- `OPERATION_CHECKLIST.md`
- `relay_ingest_worker.js`
- `test_relay.js`
- `test_relay_ingest_worker.js`
- `test_operational_e2e.js`

### `infra/indexers/nostr/`

Distributed event indexing layer の運用資産を置きます。

現時点ではセットアップ / 参照用ドキュメント中心です。

含まれる主なファイル:

- `INDEXER_API_SETUP.md`

## `packages/`

複数のアプリ・サービスから利用される再利用可能コードを置きます。

例:

- transport adapter
- canonical converter
- protocol utility

現行のフェーズ5実装では、Nostr の protocol-specific 共有コードを次のように分けています。

- `packages/nostr/adapter/`: validate / verify / normalize / canonicalize
- `packages/nostr/storage/`: append-only 保存、replay、derived index
- `packages/nostr/converter/`: canonical と Nostr の相互変換

デプロイ手順書や運用手順は `packages/` に置きません。

### `packages/protocol/`

protocol 共通の descriptor / interface helper / capability table helper を置きます。

### `packages/atproto/`

ATProto の protocol skeleton と将来の adapter / converter 入口を置きます。

### `packages/localfs/`

LocalFS の protocol skeleton と将来の archive / file ingestion 入口を置きます。

### `packages/nostr/`

Nostr を Toitoi の first operational transport layer として扱うための共通入口です。

### `packages/nostr/converter/`

Canonical Event と Nostr event の相互変換を担う protocol-specific package です。

### `packages/nostr/adapter/`

Nostr event の検証・正規化・canonical 化を担う protocol-specific package です。

### `packages/nostr/storage/`

Append-only storage、replay、derived indexing を担う persistence / index layer です。

## `docs/`

Toitoi の設計、思想、protocol、operations、concepts、roadmap を整理するドキュメント群です。

### `docs/architecture/`

システム設計・構造・責務分離に関する文書です。

含まれるファイル:

| File | 内容 |
|---|---|
| `AI_SYSTEM_OVERVIEW.md` | AI subsystem の役割 |
| `DOCUMENTATION_VERSION_POLICY.md` | ドキュメント版管理ポリシー |
| `DIRECTORY_BOUNDARIES.md` | ディレクトリ責務ルール |
| `STANDARD_API_MVP.md` | Standard API の契約 |

扱う内容:

- system layers
- event flow
- transport abstraction
- storage model
- AI responsibilities
- synchronization model

### `docs/protocols/`

protocol / event structure / archive format に関する文書群です。

含まれるファイル:

| File | 内容 |
|---|---|
| `NOSTR_TRANSPORT.md` | Nostr transport の役割 |
| `CANONICAL_EVENT.md` | canonical event model |
| `NOSTR_INQUIRY_SCHEMA.md` | Nostr inquiry transport schema |

扱う内容:

- event transport
- relay architecture
- canonical archive
- protocol mapping
- adapter model

### `docs/operations/`

運用・保守・復旧に関する文書群です。

含まれるファイル:

| File | 内容 |
|---|---|
| `NOSTR_STORAGE_AND_REPLAY.md` | Nostr storage / replay の運用メモ |

扱う内容:

- storage layout
- replay procedure
- backup / restore
- operational recovery

### `docs/concepts/`

Toitoi が扱う概念・意味論を整理する文書群です。

含まれるファイル:

| File | 内容 |
|---|---|
| `QUESTION_MODEL.md` | 問いの定義 |
| `BOUNDARY_OBJECT.md` | 境界対象 |
| `PROVENANCE.md` | 来歴 |
| `TOITOI_VOCABULARY.md` | 標準語彙 |

扱う内容:

- inquiry
- ecological relationship
- translation
- semantic linkage
- commons memory

### `docs/essays/`

Toitoi の背景思想・問題意識・論考です。

実装仕様ではなく、「なぜ Toitoi が必要なのか」を扱います。

### `docs/roadmap/`

将来的な方向性・探索中の構想を置く領域です。

## `schemas/`

canonical structure の schema 定義を置きます。

現時点では `canonical-event.schema.json` が中心です。

## `examples/`

実際の event / archive / inquiry の例を置きます。

Toitoi では、example も重要な仕様補助資料として扱います。

現時点では `sample-nostr-archive.jsonl` などのサンプルが入ります。

## `assets/`

プロジェクトで使用する静的アセットを置きます。

例:

- `toitoi-logo.svg`
- `toitoi-logo-inverted.svg`

## 配置クイックガイド

- 配備される実行アプリ: `apps/`
- インフラ構築/運用資産: `infra/`
- 再利用コード: `packages/`
- 横断仕様・思想文書: `docs/`

## 移行ポリシー

1. 一時的な都合より責務の安定性を優先する
2. ファイル移動は責務変更が起きたときだけ行う
3. 移動時はリンク更新を同一変更で完了させる
4. このドキュメントを正本として参照する
