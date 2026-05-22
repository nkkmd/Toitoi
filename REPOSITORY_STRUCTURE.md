# Repository Structure

## 概要

このドキュメントは Toitoi リポジトリにおける各ディレクトリの役割と、
格納されるファイルの種類を整理したものです。

Toitoi は：

- protocol
- commons
- distributed archive
- edge AI
- semantic knowledge system

を横断するプロジェクトであるため、

> 「どの責務のファイルなのか」

を明確に分離することを重視しています。

---

## 責務ルール（必読）

ディレクトリ配置の判断基準は以下を参照してください。

- [docs/architecture/DIRECTORY_BOUNDARIES.md](./docs/architecture/DIRECTORY_BOUNDARIES.md)

---

# Repository Overview

```text
Toitoi/
├── README.md
├── CONTRIBUTING.md
├── LICENSE-AGPL
├── LICENSE-MIT
├── LICENSE_POLICY.md
│
├── docs/
├── schemas/
├── examples/
├── assets/
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
└── packages/
    ├── atproto/
    ├── localfs/
    ├── protocol/
    └── nostr/
        ├── adapter/
        ├── converter/
        ├── storage/
        └── protocol.js
```

---

# Root Files

## README.md

プロジェクト全体の入口。

含む内容：

- Toitoi の概要
- プロジェクト思想
- アーキテクチャ概要
- ドキュメント一覧
- 実行アプリケーション群
- ライセンス
- 参加方法

---

## CONTRIBUTING.md

コントリビューションガイド。

含む内容：

- issue / PR 方針
- coding rules
- documentation policy
- protocol proposal process

---

## LICENSE-AGPL / LICENSE-MIT

各モジュールで利用する OSS ライセンス。

---

## LICENSE_POLICY.md

ライセンス構成全体の説明。

---

# docs/

## 概要

Toitoi の：

- 設計
- 思想
- protocol
- concepts
- roadmap

を整理するドキュメント群。

---

# docs/architecture/

## 役割

システム設計・構造・責務分離に関する文書。

---

## 含まれるファイル

| File | 内容 |
|---|---|
| OVERVIEW.md | 全体構成 |
| EVENT_MODEL.md | event-centric architecture |
| PROTOCOL_ABSTRACTION.md | protocol-independent design |
| ADOPTED_ARCHITECTURE_DECISIONS.md | 採用済み設計判断 |
| AI_SYSTEM_OVERVIEW.md | AI subsystem の役割 |
| EDGE_AI_SETUP.md | （将来的に docs 側へ移動する場合）edge AI設計 |
| DOCUMENTATION_VERSION_POLICY.md | ドキュメント版管理ポリシー |
| DIRECTORY_BOUNDARIES.md | ディレクトリ責務ルール |

---

## 扱う内容

- system layers
- event flow
- transport abstraction
- storage model
- AI responsibilities
- synchronization model

---

# docs/concepts/

## 役割

Toitoi が扱う概念・意味論を整理する文書群。

---

## 含まれるファイル

| File | 内容 |
|---|---|
| QUESTION_MODEL.md | 問いの定義 |
| BOUNDARY_OBJECT.md | 境界対象 |
| PROVENANCE.md | 来歴 |
| TOITOI_VOCABULARY.md | 標準語彙 |

---

## 扱う内容

- inquiry
- ecological relationship
- translation
- semantic linkage
- commons memory

---

# docs/protocols/

## 役割

protocol / event structure / archive format に関する文書群。

---

## 含まれるファイル

| File | 内容 |
|---|---|
| NOSTR_TRANSPORT.md | Nostr transport の役割 |
| CANONICAL_EVENT.md | canonical event model |
| NOSTR_INQUIRY_SCHEMA.md | Nostr inquiry transport schema |

---

## 扱う内容

- event transport
- relay architecture
- canonical archive
- protocol mapping
- adapter model

---

# docs/essays/

## 役割

Toitoi の背景思想・問題意識・論考。

実装仕様ではなく：

> 「なぜ Toitoi が必要なのか」

を扱う。

---

## 含まれるファイル

| File | 内容 |
|---|---|
| letting-go-of-technology-in-agriculture.md | 英語版論考 |
| tech-wo-tebanasu-nogyoron.md | 日本語版論考 |

---

## 扱う内容

- agroecology
- commons
- critique of smart agriculture
- technological dependence
- local knowledge

---

# docs/roadmap/

## 役割

将来的な方向性・探索中の構想。

---

## 含まれるファイル

| File | 内容 |
|---|---|
| IMPLEMENTATION_PLAN.md | Toitoi 実装ロードマップ |

---

# apps/api/

## 役割

Standard API reference implementation.

Canonical view projection and HTTP entry point.

---

## 含まれる内容

- standard API service
- HTTP server entry
- contract tests

---

## 主なファイル

| File | 内容 |
|---|---|
| README.md | 起動方法とエンドポイント概要 |
| standard_api_service.js | Canonical view projection and routing service |
| server.js | Node.js HTTP server entry point |
| test_standard_api_service.js | Contract tests |

---

## 扱う内容

- future adapters
- local-first architecture
- federation
- protocol migration
- ecosystem growth

---

# schemas/

## 役割

canonical structure の schema 定義。

---

## 含まれるファイル

| File | 内容 |
|---|---|
| canonical-event.schema.json | canonical event schema |
| question.schema.json | question structure |
| provenance.schema.json | provenance structure |

---

## 扱う内容

- validation
- interoperability
- canonical structure
- machine readability

---

# examples/

## 役割

実際の event / archive / question の例。

Toitoi では：

> Example = Documentation

として重要視される。

---

## 含まれるファイル

| File | 内容 |
|---|---|
| sample-event.json | 単一イベント |
| sample-question.json | 問い例 |
| sample-archive.jsonl | archive example |

---

# assets/

## 役割

プロジェクトで使用する静的アセット。

---

## 含まれるファイル

| File | 内容 |
|---|---|
| toitoi-logo.svg | ロゴ |
| toitoi-logo-inverted.svg | ダーク背景用 |

---

# apps/frontend/

## 役割

Toitoi の viewer / UI layer。

---

## 含まれる内容

- UI
- visualization
- question graph
- interaction layer

---

## 主なファイル

| File | 内容 |
|---|---|
| FRONTEND_UX_DESIGN.md | UI設計 |
| src/ | frontend source |
| public/ | static assets |

---

# infra/transports/nostr/

## 役割

Nostr relay layer。

Toitoi commons の transport infrastructure。

---

## 含まれる内容

- relay setup
- relay policy
- event persistence

---

## 主なファイル

| File | 内容 | 主な使用箇所 |
|---|---|---|
| NOSTR_RELAY_SETUP.md | Relay setup guide | リレー運用者の初回構築、再構築、設定見直し |
| PREREQUISITE_INSTALLATION.md | 必須ソフトウェアのインストール手順 | VPS 準備、依存ツール不足の解消 |
| MONITOR_SETUP.md | 負荷監視と自動回復の手順 | リレー/インデクサーの常時監視、運用自動化 |
| BACKUP_AND_RESTORE.md | storage のバックアップと復旧 | 日次バックアップ、障害復旧、退避作業 |
| CLEAN_START.md | データを破棄して再初期化する手順 | 互換性のない変更後、破損時の再構築 |
| INGEST_RETRY_POLICY.md | ingest 再試行ポリシー | `relay_ingest_worker.js` の retry 設計、障害切り分け |
| OPERATION_CHECKLIST.md | 日常運用の確認項目 | オンコール、手順確認、障害対応の入口 |
| relay_ingest_worker.js | relay から問いを取り込む運用 CLI | PM2/cron による継続 ingest |
| test_relay.js | リレー接続テスト | 接続確認、CI |
| test_relay_ingest_worker.js | ingest worker テスト | 取り込み回帰確認、CI |
| test_operational_e2e.js | 運用 end-to-end テスト | リレー立ち上げ後の総合確認 |

---

# infra/indexers/nostr/

## 役割

Distributed event indexing layer.

このディレクトリは現時点ではセットアップ/参照用ドキュメント中心で、実行用の JS 実装は置いていません。

---

## 含まれる内容

- indexing
- search
- graph generation
- API

---

## 主なファイル

| File | 内容 | 主な使用箇所 |
|---|---|---|
| INDEXER_API_SETUP.md | Setup guide | インデクサー運用者の初回構築、再構築、構成見直し |
| API_REFERENCE.md | API リファレンス | API 利用者、フロントエンド、連携先実装者 |

---

# packages/protocol/

## 役割

protocol 共通の descriptor / interface helper / capability table helper を置く。

---

## 含まれる内容

- adapter interface helper
- converter interface helper
- capability descriptor / capability table
- protocol descriptor validation

---

## 主なファイル

| File | 内容 |
|---|---|
| protocol_descriptor.js | Protocol descriptor and capability helper |
| protocol_registry.js | Protocol registry and capability matrix helper |
| protocol_catalog.js | Default catalog for Nostr / ATProto / LocalFS |
| index.js | Re-export of protocol helpers |

---

# packages/atproto/

## 役割

ATProto の protocol skeleton と将来の adapter / converter 入口を置く。

---

## 主なファイル

| File | 内容 |
|---|---|
| protocol.js | ATProto protocol descriptor skeleton |
| test_protocol.js | Descriptor regression test |

---

# packages/localfs/

## 役割

LocalFS の protocol skeleton と将来の archive / file ingestion 入口を置く。

---

## 主なファイル

| File | 内容 |
|---|---|
| protocol.js | LocalFS protocol descriptor skeleton |
| test_protocol.js | Descriptor regression test |

---

# packages/nostr/

## 役割

Nostr を Toitoi の first operational transport layer として扱うための共通入口。

## 主なファイル

| File | 内容 | 主な使用箇所 |
|---|---|---|
| protocol.js | Nostr の protocol descriptor / capability registry | `packages/nostr/protocol.js` を読む他 package、将来の protocol registry |
| test_protocol.js | protocol descriptor の回帰確認 | ローカル検証、CI |

---

# packages/nostr/converter/

## 役割

Canonical Event と Nostr event の相互変換を担う protocol-specific package。

---

## 含まれる内容

- canonical to nostr conversion
- nostr to canonical conversion
- JSONL transformation

---

## 主なファイル

| File | 内容 | 主な使用箇所 |
|---|---|---|
| canonical_to_nostr_converter.js | Canonical Events -> Nostr conversion CLI / utility | 手元の canonical JSONL 変換、移行作業、下書き生成 |

---

# packages/nostr/adapter/

## 役割

Nostr event の検証・正規化・canonical 化を担う protocol-specific package。

---

## 含まれる内容

- validate / verify / normalize
- ingest pipeline
- JSONL ingest
- relay ingest

---

## 主なファイル

| File | 内容 | 主な使用箇所 |
|---|---|---|
| nostr_adapter.js | Nostr event の validate / verify / normalize / canonicalize | `ingest_pipeline.js`、`relay_ingest.js`、`protocol.js`、テスト |
| ingest_pipeline.js | ingest 分類（accepted / invalid / duplicate / unverified） | `ingest_jsonl.js`、`relay_ingest.js`、関連テスト |
| ingest_jsonl.js | JSONL ingest 入口 | 手元データ投入、検証用の一括 ingest |
| relay_ingest.js | relay subscription ingest 入口 | `relay_ingest_worker.js`、`protocol.js`、テスト |
| smoke_test.js | 取り込み系の軽量 smoke test | ローカル環境の簡易確認 |
| test_nostr_adapter.js | adapter の単体テスト | adapter 回帰確認、CI |
| test_ingest_pipeline.js | ingest pipeline の単体テスト | ingest 回帰確認、CI |
| test_ingest_jsonl.js | JSONL ingest の単体テスト | CLI 回帰確認、CI |
| test_relay_ingest.js | relay ingest の単体テスト | relay ingest 回帰確認、CI |

---

# packages/nostr/storage/

## 役割

Persistence and index layer for append-only storage, replay, and derived indexing.

---

## 含まれる内容

- append-only log
- replay / rebuild
- derived index
- lookup / list / search / relation / lineage tree

---

## 主なファイル

| File | 内容 | 主な使用箇所 |
|---|---|---|
| append_only_log.js | append-only JSONL utilities | `persistence.js`、`replay.js`、テスト |
| persistence.js | raw / canonical / ingest log persistence | `ingest_jsonl.js`、`relay_ingest_worker.js`、`replay_cli.js` |
| replay.js | replay と derived index 再構築 | `replay_cli.js`、`apps/api/server.js`、`standard_api_service.js` |
| replay_cli.js | replay CLI | 運用時の再構築、手動メンテナンス |
| indexer.js | lookup / list / search / relation / lineage tree | `standard_api_service.js`、API リファレンス、テスト |
| standard_api_views.js | API 向け view projection | `standard_api_service.js` |
| index.js | storage layer re-export entry | `packages/nostr/storage` をまとめて利用する側 |
| test_persistence.js | persistence の単体テスト | persistence 回帰確認、CI |
| test_replay.js | replay の単体テスト | replay 回帰確認、CI |
| test_replay_cli.js | replay CLI の単体テスト | replay CLI 回帰確認、CI |
| test_indexer.js | indexer の単体テスト | indexer 回帰確認、CI |
| test_standard_api_views.js | view projection の単体テスト | view projection 回帰確認、CI |

# apps/edge-ai/

## 役割

local-first AI inference layer。

生データを保持したまま問いを生成する。

---

## 含まれる内容

- local inference
- prompt pipeline
- edge runtime
- model management

---

## 主なファイル

| File | 内容 |
|---|---|
| EDGE_AI_SETUP.md | edge AI setup |
| models/ | local models |
| runtime/ | inference runtime |

---

# archive/

## 役割

canonical archive の保存領域。

将来的には：

- local archive
- exported archive
- replay archive

などを扱う可能性がある。

---

## 想定内容

| Path | 内容 |
|---|---|
| questions/ | question archive |
| observations/ | observation archive |
| commons/ | shared archive |

---

# Design Principle

Toitoi の repository structure は：

- protocol-independent
- append-only
- semantic-oriented
- local-first
- commons-oriented

な構造を目指しています。

特に：

> 「concept」
> 「architecture」
> 「protocol」
> 「implementation」

を分離することを重視しています。
