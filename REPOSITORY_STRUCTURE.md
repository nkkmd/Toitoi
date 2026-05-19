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
│   └── edge-ai/
├── infra/
│   ├── transports/
│   │   └── nostr/
│   └── indexers/
│       └── nostr/
├── packages/
│   └── nostr/
│       └── converter/
│
└── archive/
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
| NOSTR.md | Nostr の役割 |
| CANONICAL_JSONL.md | canonical archive format |
| TOITOI_PROTOCOL_SCHEMA.md | protocol schema |

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
| MULTI_PROTOCOL_VISION.md | protocol portability |
| ROADMAP.md | development direction |

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

| File | 内容 |
|---|---|
| NOSTR_RELAY_SETUP.md | relay setup guide |

---

# infra/indexers/nostr/

## 役割

distributed event indexing layer。

---

## 含まれる内容

- indexing
- search
- graph generation
- API

---

## 主なファイル

| File | 内容 |
|---|---|
| INDEXER_API_SETUP.md | setup guide |

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

| File | 内容 |
|---|---|
| canonical_to_nostr_converter.js | Canonical Events -> Nostr 変換 CLI / utility |

---

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
