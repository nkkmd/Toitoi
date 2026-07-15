# Toitoi Foundation Implementation Status

**Status: current index / historical implementation record** | **Last updated: 2026-07-15**

## 目的

この文書は、[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) の現在の位置づけを明確にします。

`IMPLEMENTATION_PLAN.md` は、Canonical Event、adapter / normalizer、storage / replay、Indexer、Standard API、multi-protocol、canonical identity、identity claim、Lingonberry、registry-driven runtime selection を段階的に実装した記録です。

Phase 18 までの基盤は、v0.1.0 の release candidate 範囲として最小実装が接続済みです。その後、v0.2.0 では Golden Path、Inquiry Draft、human review、publication guard、frontend render boundary、primary transport operational smoke が追加されました。

したがって、今後の新規機能優先順位は `IMPLEMENTATION_PLAN.md` のフェーズ番号を延長して管理せず、次の文書を正本として扱います。

- プロジェクト全体の改善方針: [`IMPROVEMENT_ROADMAP.md`](./IMPROVEMENT_ROADMAP.md)
- リリースごとのスコープと acceptance criteria: `Vx.y.z_RELEASE_PLAN.md`
- 公開基準点: [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- 実作業と進捗: GitHub Issues / Pull Requests

## 文書の役割分担

| 文書 | 役割 | 更新方針 |
|---|---|---|
| `IMPLEMENTATION_PLAN.md` | Phase 1〜18 の基盤実装履歴と設計判断 | 原則として履歴保存。重大な事実誤認のみ修正 |
| `FOUNDATION_IMPLEMENTATION_STATUS.md` | 基盤の現在地と後続文書への入口 | 各minor release開始時に確認 |
| `IMPROVEMENT_ROADMAP.md` | 中長期の利用者価値・改善方向 | 方針変更時に更新 |
| `Vx.y.z_RELEASE_PLAN.md` | リリース単位の必須・条件付き・非対象・完了条件 | 対象release中はcurrent |
| `RELEASE_NOTES.md` | 公開済み／release candidate の短い記録 | release gate変更時に更新 |
| GitHub Issues | 実装単位と acceptance criteria | 作業の正本 |

## 完了済み基盤の要約

### Semantic and protocol boundary

- Canonical Event を protocol-independent semantic layer として定義
- raw / normalized / canonical の責務分離
- Adapter / Normalizer / Converter / Indexer / Standard API の境界

### Ingest, storage, and replay

- validate / verify / dedupe / canonicalize
- raw / canonical append-only storage
- deterministic replay と derived index 再構築
- protocol-specific operational workers

### Multi-transport

- Nostr を primary relay-oriented transport として接続
- Lingonberry を primary knowledge-object projection / ingest transport として接続
- ATProto を secondary compatibility transport として維持
- fan-out / fan-in、protocol registry、storage runtime selection

### Identity and provenance

- opaque canonical ID
- identity key / identity claim
- provenance / rawRef の責務分離
- explicit identity mapping による cross-transport merge
- ambiguous event を無理に統合しない方針

### Access and reference experience

- Standard API canonical view
- inquiry detail / provenance / lineage / context queries
- Golden Path fixture と integration E2E
- Inquiry Draft / human review / publication guard
- frontend transport-independent render model

## v0.3.0への移行

v0.3.0 では基盤フェーズの追加ではなく、既存基盤を使った知識空間の利用体験を実装します。

1. lineage tree
2. context exploration
3. derived inquiry creation

詳細は [`V0.3.0_RELEASE_PLAN.md`](./V0.3.0_RELEASE_PLAN.md) と [`V0.3.0_ISSUE_MAP.md`](./V0.3.0_ISSUE_MAP.md) を参照してください。

## 変更判断

今後 `IMPLEMENTATION_PLAN.md` を変更するのは、原則として次の場合に限定します。

- Phase 1〜18 の完了記録に事実誤認がある
- ファイル移動によって参照先が壊れた
- security / data integrity 上、過去の設計判断に明確な注意書きが必要になった

新しい機能、優先順位、release blocker は、Improvement Roadmap、release plan、Issue で管理します。
