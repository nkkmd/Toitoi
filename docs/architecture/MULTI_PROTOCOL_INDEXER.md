# Multi-Protocol Indexer Architecture

**Status: evolving** | **Last updated: 2026-05-31**

## 目的

Toitoi の indexer を、特定 protocol 専用の実装の寄せ集めではなく、canonical event を共通入力とする multi-protocol 対応の層として整理します。

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

## 推奨構成

### 共通層

共通化したいものは、protocol ごとに分けずに 1 つの core に寄せます。

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

### infra 層

`infra/indexers/` は、実装本体ではなく運用入口として扱います。

- 現時点では共通の multi-protocol 入口と、Nostr 固有の wrapper を分けて置いている
- protocol-aware な起動、復旧、再構築は `infra/indexers/` 直下に寄せる
- Nostr 固有の作業は `infra/transports/nostr/` に閉じる

## 現在の扱い

現時点の `infra/indexers/` は、protocol-aware な reference / operator entrypoint です。  
Nostr 固有の運用手順は `infra/transports/nostr/` に置きます。

したがって、今後 protocol が増えても次の方針を守ります。

- protocol ごとに indexer core を増やさない
- 共通 indexer core を拡張する
- ops ドキュメントは必要に応じて protocol 別に残す
- deployment topology が共通化できた時点で Nostr 固有の運用資料をさらに縮小する

## 将来の整理案

今は名前を急いで変えず、移行しやすい形を保つのが安全です。  
共通入口はすでに置いているので、以後は wrapper の縮小と protocol 追加の wiring だけを進めます。

将来的に共通 indexer core が安定したら、次のような整理が候補になります。

- `infra/indexers/core/`
  - 共通 indexer の運用入口
  - protocol 非依存の起動、復旧、監視、再構築手順
- `infra/transports/nostr/`
  - Nostr 固有の補助手順
  - transport ingest / relay 運用の入口
- `infra/indexers/atproto/`
  - ATProto 固有の補助手順
- `infra/indexers/localfs/`
  - LocalFS 固有の補助手順

この整理に切り替える条件は、少なくとも次を満たしたときです。

- 共通 indexer core の起動・復旧手順が protocol 非依存で書ける
- 追加 protocol の運用差分が wrapper に閉じる
- README と setup guide が protocol 横断で参照しやすい

Nostr 固有の作業が必要でも、共通入口から逸れずに wrapper に閉じるのが基本です。

## 判断基準

新しい処理をどこに置くか迷ったら、次の順で判断します。

1. それは transport 由来の検証・正規化か
2. それは canonical event の保存・再生・索引構築か
3. それは API の canonical view 化か
4. それは operator 向けの起動・復旧・監視か

1 に当てはまるなら protocol package 側、2 と 3 に当てはまるなら共通 indexer core、4 に当てはまるなら `infra/` 側に置きます。

## 参照

- [DIRECTORY_BOUNDARIES.md](./DIRECTORY_BOUNDARIES.md)
- [STANDARD_API_MVP.md](./STANDARD_API_MVP.md)
- [../roadmap/IMPLEMENTATION_PLAN.md](../roadmap/IMPLEMENTATION_PLAN.md)
