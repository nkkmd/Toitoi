# Multi-Protocol Indexer Architecture

**Status: evolving** | **Last updated: 2026-06-24**

## 目的

Toitoi の indexer を、特定 protocol 専用の実装の寄せ集めではなく、canonical event を共通入力とする multi-protocol 対応の層として整理します。

Phase 17 以降は、Nostr / Lingonberry / ATProto をまたいだ multi-transport replay と provenance 集約もこの indexer layer の前提に含めます。  
source 跨ぎの identity mapping は、API / replay / ops が協調して扱い、indexer は canonical view を壊さないことを優先します。

この文書は、次の判断基準を固定するためのものです。

- どこまでが protocol 固有責務か
- どこからが共通の indexer 責務か
- `infra/indexers/` をどう運用入口として切るか

## 基本方針

1. Indexer は canonical semantics を変形しない
2. protocol 固有の validate / verify / normalize / dedupe / ordering は adapter 側に閉じる
3. Indexer は lookup / list / search / relation / lineage などの参照補助構造を作る
4. API は protocol schema ではなく canonical view を返す
5. protocol ごとの差分は metadata と capability に寄せる
6. `TOITOI_TRANSPORT_SOURCES` を使う場合は、複数 transport の replay を 1 つの canonical view にまとめる

## 推奨構成

### 共通層

共通化したいものは、protocol ごとに分けずに 1 つの共通処理に寄せます。

- canonical event の index
- derived index の構築
- lookup / list / search / relation / lineage の公開形
- protocol registry を使った振る舞いの切り替え

### protocol 固有層

protocol ごとの差分は、既存の protocol package に残します。

- `packages/<protocol>/adapter/`
- `packages/<protocol>/storage/`
- `packages/<protocol>/converter/`
- `packages/<protocol>/protocol.js`
- `packages/protocol/multi_transport_replay.js`
- `packages/protocol/multi_transport_outbound.js`
- `packages/protocol/multi_transport.js`

### infra 層

`infra/indexers/` は、実装本体ではなく運用入口として扱います。

- 現時点では共通の multi-protocol 入口と、transport 固有の運用入口を分けて置いている
- Phase 17 以降は、Nostr / Lingonberry / ATProto の replay と outbound fan-out の最小入口が追加済みである
- protocol-aware な起動、復旧、再構築は `infra/indexers/` 直下に寄せる
- transport 固有の ingest / relay / carrier 作業は `infra/transports/<protocol>/` に閉じる

## 現在の扱い

現時点の `infra/indexers/` は、protocol-aware な reference / operator entrypoint です。  
Nostr 固有の relay 運用手順は `infra/transports/nostr/` に、Lingonberry 固有の carrier / archive ingest 運用手順は `infra/transports/lingonberry/` と `docs/operations/LINGONBERRY_STORAGE_AND_REPLAY.md` に置きます。ATProto 固有の ingest 運用手順は `infra/transports/atproto/` に置きます。

したがって、今後 protocol が増えても次の方針を守ります。

- protocol ごとに専用の indexer 実装を増やさない
- 共通 indexer の役割を拡張する
- ops ドキュメントは必要に応じて protocol 別に残す
- deployment topology が共通化できた時点で transport 固有の運用資料をさらに縮小する

## 将来の整理案

今は名前を急いで変えず、移行しやすい形を保つのが安全です。  
共通入口はすでに置いているので、以後は wrapper の縮小と protocol 追加の wiring だけを進めます。

将来的に必要に応じて、次のような整理が候補になります。

- `infra/indexers/`
  - 共通 indexer の運用入口
  - protocol 非依存の起動、復旧、監視、再構築手順
- `infra/transports/nostr/`
  - Nostr 固有の補助手順
  - transport ingest / relay 運用の入口
- `infra/transports/lingonberry/`
  - Lingonberry 固有の補助手順
  - archive / wire log / carrier ingest 運用の入口
- `infra/transports/atproto/`
  - ATProto 固有の補助手順
  - Jetstream / PDS 由来の ingest 運用の入口

この整理に切り替える条件は、少なくとも次を満たしたときです。

- 共通 indexer の起動・復旧手順が protocol 非依存で書ける
- 追加 protocol の運用差分が wrapper に閉じる
- README と setup guide が protocol 横断で参照しやすい

transport 固有の作業が必要でも、共通入口から逸れずに wrapper に閉じるのが基本です。

## 判断基準

新しい処理をどこに置くか迷ったら、次の順で判断します。

1. それは transport 由来の検証・正規化か
2. それは canonical event の保存・再生・索引構築か
3. それは API の canonical view 化か
4. それは operator 向けの起動・復旧・監視か

1 に当てはまるなら protocol package 側、2 と 3 に当てはまるなら共通 indexer 側、4 に当てはまるなら `infra/` 側に置きます。

## 参照

- [DIRECTORY_BOUNDARIES.md](./DIRECTORY_BOUNDARIES.md)
- [STANDARD_API_MVP.md](./STANDARD_API_MVP.md)
- [../roadmap/IMPLEMENTATION_PLAN.md](../roadmap/IMPLEMENTATION_PLAN.md)
