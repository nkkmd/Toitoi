# Toitoi 実装ロードマップ

**Status: evolving** | **Last updated: 2026-06-07**

## 目的

このドキュメントは、Toitoi のアーキテクチャを実装へ落とすための作業手順を定義します。

重要なのは、最初からすべての理想形を作ることではなく、

- まずデータを安全に流せること
- その上で canonical semantics を安定させること
- 最終的に multi-protocol に拡張できること

を、段階的に実現することです。

AI 導入の段階設計と問い生成の最低仕様は、[AI_ADOPTION_ROADMAP.md](./AI_ADOPTION_ROADMAP.md) に分離してあります。

---

## 採用する前提

今後の実装は、以下の前提を採用して進めます。

- Canonical Event を内部の意味的共通表現として扱う
- Canonical Event は特定 protocol schema の写しではなく semantic layer として設計する
- 読み込み側では Adapter / Normalizer を経由してから Indexer に渡す
- Standard API は protocol ではなく意味論に基づくアクセス面として設計する
- Indexer は canonical semantics を変形せず、検索・参照のために補助構造を作る
- 文書の版管理は [DOCUMENTATION_VERSION_POLICY.md](../architecture/DOCUMENTATION_VERSION_POLICY.md) に従う

一方で、以下は固定しません。

- Canonical Event のみを唯一の保存対象にすること
- 特定 DB や検索エンジンを前提に設計を閉じること
- Nostr 的な schema をそのまま Canonical に持ち込むこと

---

## 実装原則

1. raw event と canonicalized event を分けて扱う
2. protocol 固有責務と semantic 固有責務を混ぜない
3. MVP では Nostr を最初の transport として使う
4. 未来の ATProto / LocalFS 追加を妨げる命名や責務分割を避ける
5. 仕様書先行で進めるが、仕様は必ず replay 可能な実装で検証する

---

## フェーズ の見取り図

初見の人は、まずここだけ見れば全体の流れをつかめます。

| フェーズ | ひとことでいうと | 完了すると何ができるか |
|---|---|---|
| 1 | 境界を決める | Canonical / protocol / adapter の役割が分かれる |
| 2 | Canonical の最小形を固める | Nostr から loss-aware に canonicalize できる |
| 3 | Nostr 取り込みを安定化する | validate / verify / dedupe / normalize が回る |
| 4 | 保存と replay を作る | raw event から再処理できる |
| 5 | 最小 index を作る | 参照・一覧・検索・relation ができる |
| 6 | API に入る前を整える | Standard API の契約と view を固定できる |
| 7 | 運用を整える | 障害時の復旧と再同期が説明できる |
| 8 | 多プロトコルの土台を作る | protocol ごとの差分を共通枠に閉じられる |
| 9 | 追加 protocol を 1 つ実装する | skeleton ではなく実データ ingest まで通せる |
| 10 | 起動と選択を registry 化する | どの protocol を使うかを実行時に選べる |
| 11 | API を多プロトコル対応にする | UI / AI が protocol を意識せず扱える |
| 12 | 運用と移行を標準化する | 新しい protocol 追加手順を再現できる |
| 13 | transport 間の fan-out / fan-in を定義する | 複数 transport で同じ canonical event を扱える |
| 14 | transport 横断の実装を固める | transport を跨いだ重複抑止と provenance 集約を運用できる |
| 15 | canonical identity 実装を固める | 同一イベントを 1 つの canonical id として扱える |
| 16 | identity key / claim を実装する | 送信者と受信者が分離しても第三者検証できる |
| 17 | 追加 protocol を実データで通す | skeleton ではなく実データ ingest まで通せる |
| 18 | registry 駆動の起動と選択をさらに整理する | protocol 選択を単純にできる |

---

## フェーズ 1: 境界の確定

### 目的

実装に入る前に、「Canonical に入れるもの」と「protocol 側に残すもの」をはっきり分ける。

### 作業

- Canonical Event の最小スキーマを定義する
- raw event / normalized event / canonical event の用語を確定する
- Converter と Adapter / Normalizer / Indexer / Standard API の責務境界を文書化する
- delete semantics / replace semantics / ordering / trust の扱い方針を整理する
- Nostr 固有の validate / verify / dedupe / ordering を adapter 配下に閉じる

### 完了条件

- `docs/architecture` に境界定義がある
- 「Nostr event をそのまま Canonical と見なさない」ことが明文化されている
- delete / replace / ordering / trust の扱いが protocol 固有責務として整理されている
- ingest 時の状態遷移が説明できる

### 整理メモ

- [CANONICAL_EVENT.md](../protocols/CANONICAL_EVENT.md)
- [NOSTR_INQUIRY_SCHEMA.md](../protocols/NOSTR_INQUIRY_SCHEMA.md)

---

## フェーズ 2: Canonical Event MVP

### 目的

最小限の semantic layer を定義して、Nostr から安全に変換できる形にする。

### 作業

- Canonical Event の必須フィールドを決める
- provenance, source protocol, source id を保持する設計を追加する
- raw payload への参照方法を専用フィールドで決める
- 将来拡張用の optional field を切り分ける

### 完了条件

- 最小 Canonical schema が 1 つの文書として固定されている
- Nostr event から loss-aware に変換できる
- raw event を失わず再 canonicalize できる

### 完了メモ

- `schemaVersion` は `0.3.1` に更新済み
- `rawRef` を専用フィールドとして追加済み
- `sample-nostr-archive.jsonl` で意味的な往復確認を実施済み
- `e` は `dsl:*` より前に出力するよう固定済み
- `test` タグは本番 Canonical には保持しない方針で確認済み

---

## フェーズ 3: Nostr Adapter / Normalizer 実装

### 目的

最初の protocol abstraction layer として、Nostr ingest の入口を安定化する。

### 作業

- Nostr event の validate を実装する
- signature verify を実装する
- dedupe ルールを定義する
- created_at と replaceable semantics の ordering 方針を決める
- tombstone / deletion の扱いを決める
- normalize 結果を Canonical Event に変換する

### 完了条件

- 同一入力に対して canonicalize 結果が安定する
- duplicate と invalid event を区別して扱える
- protocol 固有ロジックが adapter 配下に閉じている

### 完了メモ

- `packages/nostr/adapter/nostr_adapter.js` で validate / verify / normalize / canonicalize を実装済み
- `packages/nostr/adapter/ingest_pipeline.js` で duplicate / invalid / unverified の分類を実装済み
- `packages/nostr/adapter/ingest_jsonl.js` で JSONL ingest 入口を実装済み
- `packages/nostr/adapter/relay_ingest.js` で relay subscription ingest 入口を実装済み
- `infra/transports/nostr/relay_ingest_worker.js` で運用向けの薄い worker 入口を実装済み
- `packages/nostr/adapter/test_*` 群と `infra/transports/nostr/test_relay_ingest_worker.js` で回帰確認済み

---

## フェーズ 4: 永続化と replay 基盤

### 目的

Canonical を中心に据えつつ、raw event も保持して再処理できるようにする。

### 作業

- raw event 保存形式を決める
- canonicalized event 保存形式を決める
- append-only ingest log を用意する
- replay で index を再構築できるようにする
- failure recovery 手順を文書化する

### 完了条件

- raw event から再 canonicalize できる
- canonicalized event から index を再生成できる
- ingest と replay が同じルールで動く

### 完了メモ

- `packages/nostr/storage/append_only_log.js` で append-only JSONL 基盤を追加
- `packages/nostr/storage/persistence.js` で raw / canonical / ingest log の追記処理を追加
- `packages/nostr/storage/replay.js` で raw event からの replay と derived index 再構築を追加
- `packages/nostr/storage/replay_cli.js` で replay の実行入口を追加
- `packages/nostr/adapter/ingest_jsonl.js` と `infra/transports/nostr/relay_ingest_worker.js` に `--storage-dir` を追加
- `docs/operations/NOSTR_STORAGE_AND_REPLAY.md` を正本として復旧手順を追加
- `packages/nostr/storage/test_*` で保存・replay・CLI の回帰確認を追加

---

## フェーズ 5: Indexer MVP

### 目的

Canonical semantics を壊さずに、検索と参照のための最小機能を用意する。

### 作業

- event lookup を実装する
- 時系列 index を実装する
- relation / lineage 参照を実装する
- 必要最小限の全文検索を実装する
- embedding や graph expansion は optional に分離する

### 完了条件

- 単一 event 参照ができる
- 時系列一覧が返せる
- lineage または relation を辿れる
- index が canonical schema に依存しすぎていない

### 完了メモ

- `packages/nostr/storage/indexer.js` で `lookup` / `list` / `search` / `relation` / `lineage tree` の最小 API を追加
- `packages/nostr/storage/replay.js` で `orderedIds` / `sourceIdIndex` / `lineageChildrenByTarget` / `relationshipIndex` / `searchableTextById` を派生 index に追加
- `packages/nostr/storage/index.js` から indexer API を再公開
- `packages/nostr/storage/test_indexer.js` で lookup / 時系列一覧 / 全文検索 / relation / lineage tree を回帰確認

---

## フェーズ 6: Standard API MVP

### 着手前整理

Standard API に入る前に、Phase 5 の公開面と canonical view の前提を固定する。

#### 確認事項

- Phase 5 の `lookup` / `list` / `search` / `relation` / `lineage tree` の返り値形を凍結する
- event 取得 / list / filter / relation の canonical view を先に定義する
- API 層が `packages/nostr/storage/indexer.js` を直接使うか、薄い service 層を挟むかを決める
- `provenance` の露出範囲を決める
- `highlight` や embeddings のような将来機能を API 契約に入れない
- replay fixtures を API 契約テストへ流用できる形に整える

#### 着手条件

- Phase 5 の公開形が大きく変わらない
- Standard API の返却スキーマ草案が 1 つに収束している
- API テストに使う fixture が replay 由来で再現可能

### 目的

UI と AI が protocol を意識せずにアクセスできる最初の API 面を作る。

### 作業

- event 取得 API を定義する
- list / filter / relation 参照 API を定義する
- response を protocol schema ではなく canonical view で返す
- provenance を API 上で追えるようにする

### 完了条件

- UI が Nostr 固有 schema を知らなくても扱える
- AI が canonical event を入力として扱える
- API の戻り値が transport 差異を露出しすぎていない

### 完了メモ

- `apps/api/standard_api_service.js` で service layer を実装した
- `apps/api/server.js` で `TOITOI_STORAGE_DIR` から replay した index を参照できるようにした
- `apps/api/test_standard_api_service.js` で health / lookup / detail / list / query / relation / tree の契約確認を追加した

---

## フェーズ 7: 運用整備

### 目的

MVP を継続運用できる形に整える。

### 作業

- ingest failure 時の再試行戦略を決める
- relay / indexer / API の監視項目を決める
- バックアップと復旧手順を整える
- サンプルデータで end-to-end テストを追加する

### 完了条件

- 障害時にどこまで復旧できるか説明できる
- データ欠落時の再同期手順がある
- 運用手順が `infra/` に整理されている

### 完了メモ

- `docs/operations/NOSTR_STORAGE_AND_REPLAY.md` を storage バックアップと復旧の正本として整備
- `infra/transports/nostr/MONITOR_SETUP.md` で監視と復旧の役割分担を明確化
- `infra/transports/nostr/INGEST_RETRY_POLICY.md` で ingest failure の再試行方針を明文化
- `infra/transports/nostr/OPERATION_CHECKLIST.md` で日常運用向けの短いチェックリストを追加
- `infra/transports/nostr/CLEAN_START.md` からバックアップ手順へ参照を追加
- `docs/operations/NOSTR_STORAGE_AND_REPLAY.md` から復旧ランブックへ参照を追加して導線を正本へ統一
- `infra/transports/nostr/test_operational_e2e.js` で sample archive 由来の storage -> replay -> API service のスモークテストを追加
- `packages/nostr/adapter/relay_ingest.js` と `infra/transports/nostr/relay_ingest_worker.js` に transient failure の retry を追加
- `packages/nostr/adapter/test_relay_ingest.js` で retry / early close / retryable error の回帰確認を追加

---

## フェーズ 8-12 の共通前提

Phase 8 以降で Nostr 以外の protocol を追加・選択・運用する際は、次の共通前提で進めます。

### 共通化したい interface

- Adapter は protocol 由来の input を受け取り、canonicalize 前の状態まで整える
- Converter は canonical event と protocol-specific representation の往復を扱う

### 比較軸

Protocol ごとの差は、次の観点で整理します。

| Capability | 何を確認するか |
|---|---|
| raw acquisition | 生の event / record / file を取得できるか |
| identity verification | 送信者や source の正当性を検証できるか |
| ordering | 順序の安定性や再現性があるか |
| delete semantics | 削除の意味をどう表すか |
| replace semantics | 置換をどう表すか |
| replayability | 同じ input から再処理できるか |
| provenance fidelity | 来歴をどこまで残せるか |
| storage snapshot | append-only もしくは snapshot で保持できるか |
| source trust | どの程度 source を信頼できるか |

### trust model

Protocol ごとの trust は分けて考えます。

- source trust
- transport trust
- signature / proof trust
- storage trust
- replay trust

API では必要最小限の trust 情報だけを露出し、それ以外は provenance と内部メタデータに分離します。

### registry と実装上の方針

- adapter / converter の公開メソッド名は共通化する
- 共通の error class の扱いを決める
- capability table の記述形式を統一する
- protocol registry の公開 API を定める
- protocol ごとの欠損情報の表し方を揃える
- Standard API に露出してよい provenance の範囲を固定する

### Capability Matrix

| Capability | Nostr | ATProto | LocalFS |
|---|---|---|---|
| rawAcquisition | yes | unknown | yes |
| identityVerification | yes | unknown | no |
| ordering | yes | partial | partial |
| deleteSemantics | partial | partial | partial |
| replaceSemantics | partial | partial | partial |
| replayability | yes | partial | yes |
| provenanceFidelity | yes | yes | partial |
| storageSnapshot | yes | partial | yes |
| sourceTrust | partial | partial | partial |

読み方:

- `yes`: 現行実装または設計上、明確に扱える
- `partial`: 仕様や実装に制約があり、完全ではない
- `no`: 現行の設計では扱わない
- `unknown`: 調査対象であり、まだ固定しない

この共通前提を踏まえて、Phase 8 で多プロトコル化の実装に入ります。

---

## フェーズ 8: 多プロトコル化

### 着手前整理

Phase 8 で多プロトコル化の実装に入る前に、必要な参照先と契約だけを確認する。

#### 確認事項

- Phase 7 の retry / backup / restore 文書が参照可能であることを確認する
- Standard API の契約を Phase 8 着手前に変えない
- 現行の Nostr テストが通っていることを確認する
- Phase 8 の作業対象が `packages/protocol/` の共通 descriptor / registry / catalog と `packages/*/protocol.js` の追加であることを確認する

#### 着手条件

- Phase 8 の前提が `## フェーズ 8-12 の共通前提` に集約されている

#### 整理メモ

- adapter / converter / capability / trust の整理軸を共通前提に集約した
- capability matrix を共通前提として文書化した

### 目的

Nostr 実装を壊さずに、ATProto や LocalFS を追加できる状態にする。

### 作業

- adapter interface を共通化する
- converter interface を共通化する
- source capability の差分表を作る
- protocol ごとの欠損情報や信頼モデルを整理する

### 完了条件

- 新しい protocol を追加しても Canonical schema を大きく崩さない
- protocol 差分が adapter と converter に閉じる
- Standard API が大きく変わらない

### 完了メモ

- `packages/protocol/` に共通 descriptor / registry / catalog を追加した
- `packages/nostr/` / `packages/atproto/` / `packages/localfs/` を registry 対応にした
- 三 protocol の capability 差分と source capability の比較表を文書化した
- `packages/protocol/test_protocol_*` と `packages/*/test_protocol.js` で回帰確認を追加した

---

## フェーズ 9: まず 1 つの追加 protocol を実装する

### 目的

ATProto か LocalFS のどちらか 1 つを、descriptor だけでなく実データ ingest まで通して、multi-protocol の実装手順を確立する。

### 前提

0. 追加 protocol
   - ATProto

1. MVP の範囲
   - Phase 9 の MVP は `create record` のみとする
   - `delete` / `update` は未対応として明示する
   - 将来必要になった場合は、別の event と lineage で表現する
   - Phase 9 では transport 側の mutation semantics を持ち込まない

2. 対象 record の種類
   - Phase 9 の最初の実装は custom record から始める
   - 送信先 transport は `bsky.social` に限定する
   - `app.bsky.feed.post` は後続の互換性確認用として残す

3. 認証とアカウント運用
   - `bsky.social` 上の専用 bot アカウントを 1 つ使う
   - 認証は app password を使い、main password は使わない
   - secret は環境変数か secret manager に閉じる
   - CI では基本的に live 接続しない

4. canonical への写像ルール
   - semantic 側には Toitoi の意味だけを入れる
   - `uri` / `cid` / `did` / `collection` / `rkey` / `createdAt` は provenance に分離する
   - `at://` は DID ベースで扱い、handle ベースの参照は避ける

5. `delete` / `replace` / `ordering` の扱い
   - Phase 9 では `delete` / `update` / `replace` は扱わない
   - ordering は transport 上の観測値としてのみ扱う
   - canonical semantics に順序依存を持ち込まない
   - 将来必要なら、別 event と lineage で表現する

6. テスト方針
   - 通常の unit / integration は mock 優先とする
   - `bsky.social` への live 接続は gated smoke test のみとする
   - smoke test は専用 bot アカウントで 1 件の最小 record だけ送る
   - デフォルト CI では live write を走らせない

### 作業

- 1 つの追加 protocol を選び、実データ ingest の入口を作る
- adapter / normalizer / converter を skeleton から実装へ進める
- raw acquisition, normalize, canonicalize, replay の流れを通す
- protocol 固有の delete / replace / ordering / trust の扱いをコードで確かめる
- replay fixture と回帰テストを追加する

### 完了条件

- 追加 protocol の実データを canonical event まで変換できる
- raw event と canonical event の両方を保存・再処理できる
- protocol 固有ロジックが共通層を壊さずに収まる

### 完了メモ

- ATProto を追加 protocol として選定した
- custom record の ingest / normalize / canonicalize / replay を通した
- raw event と canonical event を append-only で保存し、derived index を再構築できるようにした
- `app.bsky.feed.post` の互換 projection を追加した
- `bsky.social` 向けの gated live smoke test を追加した
- 手元で 1 回だけ live smoke を実行する場合の手順:
  1. bot アカウントの実 PDS、handle、app password を用意する
     - `ATPROTO_PDS_HOST` には `bsky.social` ではなく、bot アカウントの DID document に載っている実 PDS host を入れる
     - Bluesky hosted アカウントの場合は、PDS host は `https://<NAME>.<REGION>.host.bsky.network` 系の値になる
     - `ATPROTO_PDS_HOST` は bot アカウントの DID document にある `service[].serviceEndpoint` を使う
     - handle は `com.atproto.identity.resolveHandle` で DID に解決する
     - `did:plc:` の場合は `https://plc.directory/<did>` を開いて DID document を読む
     - `did:web:` の場合は `https://<domain>/.well-known/did.json` を開いて DID document を読む
     - DID document の `id: #atproto_pds` にある `serviceEndpoint` をそのまま `ATPROTO_PDS_HOST` に設定する
  2. 一時的に環境変数を設定する
     ```bash
     DID=$(curl -s "https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=<bot-handle>" | jq -r .did)
     export ATPROTO_PDS_HOST=$(curl -s "https://plc.directory/$DID" | jq -r '.service[] | select(.id == "#atproto_pds") | .serviceEndpoint')
     export ATPROTO_LIVE_SMOKE_TEST=1
     export ATPROTO_HANDLE="<bot-handle>"
     export ATPROTO_APP_PASSWORD="<app-password>"
     ```
     - `ATPROTO_HANDLE` は `@` を付けない
     - `ATPROTO_APP_PASSWORD` は `!` や `&` が入る可能性があるので、必ず `"..."` か `'...'` で囲う
  3. `ATPROTO_LIVE_SMOKE_TEST=1 node packages/atproto/test_smoke.js` を 1 回だけ実行する
  4. 実行後は、必要なら `unset ATPROTO_LIVE_SMOKE_TEST ATPROTO_PDS_HOST ATPROTO_HANDLE ATPROTO_APP_PASSWORD` で環境変数を外す
- コピペ用の短い実行チェックリスト:
  1. bot の handle を DID に解決する
  2. DID document の `serviceEndpoint` を読む
  3. `ATPROTO_PDS_HOST` / `ATPROTO_HANDLE` / `ATPROTO_APP_PASSWORD` を一時設定する
  4. `ATPROTO_LIVE_SMOKE_TEST=1 node packages/atproto/test_smoke.js` を 1 回だけ流す
  5. 終わったら環境変数を外す
- Phase 9 は完了扱いとする

---

## フェーズ 10: registry 駆動の起動と選択

### 目的

protocol descriptor / registry を使って、どの protocol をどう起動するかをコード上で選べるようにする。

### 作業

- protocol descriptor を service / CLI / worker 起動に結びつける
- source ごとの adapter / converter 選択を registry 経由にする
- capability 情報を使って起動時の振る舞いを切り替える
- health / introspection / help 出力に protocol metadata を反映する

### 完了条件

- 起動経路が protocol 固有コードの直参照に依存しすぎない
- registry を見れば利用可能な protocol と capability が分かる
- 新しい protocol 追加時の wiring 量が小さい

### 完了メモ

- `packages/protocol/protocol_runtime.js` を追加し、registry ベースの protocol 選択と introspection を共通化した
- `apps/api/server.js` と `apps/api/standard_api_service.js` で `/health` と `/api/v1/protocols` に protocol metadata を反映した
- `infra/transports/nostr/relay_ingest_worker.js` で `ingestFromRelayUrl` を descriptor 経由で選ぶようにし、`--protocol` を受けられるようにした
- `packages/protocol/test_protocol_runtime.js` と関連 API / worker テストで回帰確認した

### 補足

Phase 10 以降の indexer は、protocol ごとに別実装を増やすのではなく、canonical event を共通入力とする multi-protocol の共通 indexer として扱います。

- protocol 固有の検証・正規化・重複排除・順序付けは adapter 側に閉じる
- indexer は lookup / list / search / relation / lineage の補助構造を共通で提供する
- protocol ごとの差分は registry と metadata に寄せる
- `infra/indexers/` を共通 indexer 入口として扱い、Nostr 固有の補助資料は `infra/transports/nostr/` に閉じる

---

## フェーズ 11: Standard API の multi-protocol 対応

### 目的

UI と AI が protocol を意識せずに扱える Standard API を、複数 protocol に対しても維持する。

### 作業

- canonical view を protocol 横断で維持する
- provenance / trust の露出範囲を再確認する
- list / detail / relation / tree / search の返却差分を吸収する
- protocol ごとの差分を metadata に閉じる
- 共通 indexer が protocol 追加で分岐しないことを確認する

### 完了条件

- どの protocol でも同じ API 形で参照できる
- API 契約が protocol 追加で壊れない
- provenance と trust の露出方針が維持されている
- 共通 indexer を前提に、protocol-specific な indexer 実装を増やさずに拡張できる

### 完了メモ

- `apps/api/server.js` で protocol-aware な replay / storage module 解決を導入し、`nostr` と `atproto` の実データ replay を切り替えられるようにした
- `apps/api/test_standard_api_server.js` で `atproto` の実データ replay と `localfs` の明示エラーを固定した
- `apps/api/README.md` で protocol ごとの replay module と `provenancePolicy` / `storage` の出し分けを明記した

---

## フェーズ 12: 運用・移行・拡張の固定化

### 目的

複数 protocol を安全に運用し続けるための backup, replay, monitor, migration の標準手順を固める。

### 作業

- protocol ごとの backup / restore / replay 手順を整える
- retry, alert, health check を protocol 単位で整理する
- fixture / sample archive / migration script を整備する
- 新しい protocol を追加する際の運用チェックを標準化する

### 完了条件

- 障害時の復旧経路が protocol ごとに説明できる
- 新しい protocol の追加手順が文書とテストで再現できる
- 長期運用時の責務分離が崩れない

### 完了メモ

- 2026-05-31 時点で Phase 12 を完了扱いとする
- `docs/operations/PROTOCOL_OPERATION_TEMPLATE.md` で protocol 横断の運用テンプレートを追加
- `docs/operations/ATPROTO_STORAGE_AND_REPLAY.md` で ATProto の backup / restore / replay / smoke gate を具体化
- `docs/operations/LOCALFS_MIGRATION_AND_FIXTURE_TEMPLATE.md` で LocalFS の migration / fixture 入口を最小化
- `packages/localfs/fixtures/sample-localfs-entry.json` / `sample-localfs-manifest.json` / `sample-localfs-archive.jsonl` で LocalFS の fixture / manifest / archive 実例を追加
- `scripts/localfs/normalize_localfs_manifest.js` で LocalFS の最小 migration script を追加
- `packages/localfs/protocol.js` と関連 README / boundaries で runtime replay unsupported を明記
- `docs/operations/PNPM_WORKSPACE_GUIDE.md` に pnpm store DB の回避手順を追記
- `scripts/protocol/validate_operational_template.js` と `scripts/protocol/test_operational_template.js` で共通テンプレートの欠落検知を追加
- `scripts/protocol/validate_atproto_storage_and_replay.js` / `scripts/protocol/test_atproto_storage_and_replay.js` で ATProto 運用文書を固定
- `scripts/protocol/validate_localfs_migration_fixture_template.js` / `scripts/protocol/test_localfs_migration_fixture_template.js` で LocalFS テンプレートを固定
- `scripts/localfs/test_normalize_localfs_manifest.js` で LocalFS migration 入口を固定
- `docs/operations/NOSTR_STORAGE_AND_REPLAY.md` を共通テンプレートの正本として接続

---

## フェーズ 13: multi-transport fan-out / fan-in

### 目的

ひとつの canonical event を複数 transport に送信する fan-out と、複数 relay / PDS から event を取り込んで canonical 化する fan-in の両方を、同じ semantic layer の方針で扱えるようにする。

現時点の対象 transport は Nostr と ATProto に限定します。ただし、判定基準と責務分離は将来の追加 protocol でも再利用できる形を保ちます。

### 作業

- outbound transport の fan-out 方針を決める
- source ごとの送信先差分は transport 層の責務として扱う
- source ごとの ingest は分離して扱う
- source fan-in は canonical event の identity resolution として扱う
- raw duplicate と cross-source semantic duplicate を別の段階で判定する
- canonical identity の判定基準を文書化する
- 同一と判断された event の provenance 集約方針を決める
- 同一性が曖昧な event の扱いを relation / lineage に逃がせるようにする

### 方針メモ

- merge は「明示的に同一といえるもの」に限定する
- body / labels / timestamps / similarity だけでは canonical identity の根拠にしない
- raw duplicate は transport source 内で処理し、cross-source の同一性とは切り分ける
- 曖昧な case は event を無理に畳まず、relation / lineage でつなぐ
- provenance は統合してよいが、統合の根拠を説明できる場合に限る

### 完了条件

- 1 つの canonical event を複数 transport へ送れる
- outbound fan-out と inbound fan-in の責務分離が文書化されている
- 同一 transport source 内の duplicate と source 跨ぎの duplicate を区別できる
- canonical identity を基準に event を 1 つに畳み込める
- 判定不能な event を無理に merge せずに保持できる
- API で transport ごとの重複を露出しすぎない

### 完了メモ

- 2026-06-03 時点で Phase 13 を完了扱いとする
- 対象 transport は当面 Nostr と ATProto に限定し、将来の追加 protocol にも流用できる責務分離を維持する
- canonical identity の merge は、明示的に同一といえる場合にだけ許可する
- raw duplicate は transport source 内で抑制し、cross-source の semantic duplicate は別段階で扱う
- provenance は merge が明示可能な場合にのみ集約し、曖昧な case は relation / lineage に逃がす
- 仕様の要点は `docs/architecture/MULTI_TRANSPORT_IDENTITY_POLICY.md` に集約し、API / 運用説明へも反映した
- contract test の観点は Phase 14 の実装に接続する
- 実装 skeleton は Phase 14 で扱う

---

## フェーズ 14: multi-transport 実装

### 目的

フェーズ13 で固めた fan-out / fan-in と identity resolution の方針を、実装と運用に落とし込む。

### 作業

#### Adapter / outbound fan-out

- outbound fan-out の実装入口を作る
- transport ごとの送信先解決を実装する
- transport ごとの配送失敗と retry / skip / quarantine の扱いを決める
- outbound でも canonical identity を維持できるようにする

#### Replay / fan-in

- source ごとの ingest をまとめる dispatcher を実装する
- canonical identity の判定ロジックを indexer / replay の経路に接続する
- provenance 集約と rawRef の保持を実データで検証する
- transport を跨いだ duplicate suppression を replay 時にも再現できるようにする

#### API / canonical view

- API の canonical view で重複が露出しないことを確認する
- source 跨ぎで provenance が集約された event を 1 件として返す
- 同一性が曖昧な event を API でどう見せるかを整理する

#### Tests / ops

- transport を跨いだ duplicate suppression の contract test を追加する
- fan-out / fan-in それぞれの smoke test を追加する
- 失敗時にどの transport まで影響するかを運用手順に反映する

### 完了条件

- 1 つの canonical event を複数 transport へ送信できる
- 複数 source からの ingest を同じ index / API に流せる
- source 跨ぎの duplicate が canonical view に二重表示されない
- canonical identity の判定と provenance 集約が replay 可能である
- transport ごとの失敗が他の source の ingest を壊しすぎない

### 完了メモ

- 2026-06-04 時点で、multi-transport replay dispatcher と outbound fan-out plan の最小入口を追加した
- `packages/protocol/multi_transport.js` / `packages/protocol/multi_transport_replay.js` / `packages/protocol/multi_transport_outbound.js` を共通基盤として追加した
- `packages/nostr/storage/replay.js` と `packages/atproto/storage/replay.js` で identity mapping を受け取れるようにし、replay 時の canonical 集約に接続した
- `packages/protocol/multi_transport_delivery.js` と `packages/nostr/live/outbound.js` / `packages/atproto/live/outbound.js` で outbound 実配送の入口を追加した
- `apps/api/server.js` で `TOITOI_TRANSPORT_SOURCES` を受け取り、multi-transport replay を canonical view に反映できるようにした
- `packages/protocol/test_phase14_contracts.js` と `packages/protocol/test_multi_transport.js` で source 内 duplicate suppression、cross-source non-merge、explicit identity mapping、fan-out plan の contract test を追加した
- 2026-06-04 時点で Phase 14 を完了扱いとする

---

## フェーズ 15: canonical identity / provenance 実装

### 目的

Canonical Event の `id` を converter 前に確定し、transport projection と derived event をまたいでも identity がぶれないようにする。  
Phase 14 で固めた multi-transport fan-out / fan-in の方針を、`provenance` と `lineage` を含む実装契約として固定する。

### canonical id の発行方針

- canonical id は opaque な主識別子として扱い、`body` や transport 固有の source id から直接導かない
- `Canonical Event draft` を作る時点で 1 回だけ発行し、converter 前後で同じ値を維持する
- 生成方式は opaque な `tt:evt:<opaque-id>` に統一する
- 保存時は unique 制約を前提にし、万一の衝突があれば再発行で吸収する
- cross-transport の同一性は canonical id ではなく、identity mapping や provenance で解決する

### 作業

- root canonical event / transport projection / derived event の 3 層を実装に落とす
- canonical id を draft 時点で確定し、converter 後も維持する
- `provenance.sources[]` と `rawRef` の役割分担を固定する
- multi-transport replay で canonical identity first の merge を適用する
- 同一性が曖昧な case は `lineage` / relation に逃がし、無理に merge しない
- DSL を identity の主根拠にしないことを contract test で確認する

### 完了条件

- 同じ意味内容の event が複数 transport に投影されても、明示的な同一性がある場合は 1 つの canonical id に集約できる
- 同一性が曖昧な event は別 event として保持される
- provenance から source の来歴を追える
- `lineage` で派生関係を表現できる
- API の canonical view が transport ごとの重複を過剰に露出しない

### 完了メモ

- 2026-06-05 時点で Phase 15 を完了扱いとする
- canonical id を opaque な `tt:evt:<opaque-id>` として発行し、adapter の canonicalization に接続した
- raw log に `canonicalEventId` を保持し、replay 時に canonical id を復元できるようにした
- Nostr / ATProto の replay で、raw storage から再 canonicalize しても同じ canonical id を再現できるようにした
- raw log の対応表は最初に発行された canonical id を優先し、後続バッチで同じ source が見えても replay の identity をぶらさないようにした
- `packages/protocol/test_canonical_identity.js` で canonical id の発行と mapping を回帰確認した
- `packages/nostr/storage/test_replay.js` と `packages/atproto/storage/test_replay.js` で replay 安定性を回帰確認した
- `packages/nostr/adapter/test_nostr_adapter.js` と `packages/atproto/adapter/test_atproto_adapter.js` で explicit override を含む canonicalization を固定した
- `docs/protocols/CANONICAL_EVENT.md` / `docs/architecture/STANDARD_API_MVP.md` / `docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md` / `docs/protocols/INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md` の方針と整合する形で、identity / provenance の実装接続を進めた

---

## フェーズ 16: identity key / claim / third-party verification

### 目的

canonical event を transport に投影する側と、raw event を ingest して API を作る側が別でも、同じ canonical identity を第三者が検証できるようにする。

そのために、canonical id そのものとは別に、誰でも再計算・照合できる identity key と、その正当性を示す identity claim を導入する。

### 作業

- canonical identity と identity key の役割を分離する
- identity key の canonicalization ルールと versioning を定義する
- identity key の計算関数を実装する
- identity key から canonical id を引く resolver / registry の契約を定義して実装する
- identity claim の schema を定義する
- identity claim の発行と検証を実装する
- claim の署名や検証可能性を third-party 視点で整理する
- replay / migration で identity key を再計算し、同じ canonical id に戻せることを確認する
- provenance と identity claim の責務分離を明文化する
- Nostr / ATProto の adapter と replay 経路に接続する
- contract test を追加して、第三者検証と再現性を固定する

### 完了条件

- canonical event から再計算可能な identity key が定義されている
- 送信者でなくても、同じルールと入力から identity key を再現できる
- identity claim を third-party が検証できる
- identity key を使って canonical id を再解決できる
- identity key / claim の実装が adapter / replay / API に接続されている
- replay / migration で canonical id の再現性が説明できる
- provenance と identity claim の役割が混ざらない

### 完了メモ

- identity key は semantic identity に関わる安定した内容だけから計算する
- identity claim は JSON で固定し、署名・検証方式は pluggable にする
- `packages/protocol/identity_verification.js` で identity key / claim / verify / registry を実装した
- `schemas/identity-claim.schema.json` と `schemas/canonical-event.schema.json` で claim を保持できるようにした
- `packages/nostr/adapter/nostr_adapter.js` と `packages/atproto/adapter/atproto_adapter.js` で claim 発行を canonicalize に接続した
- `packages/nostr/adapter/ingest_jsonl.js`、`infra/transports/nostr/relay_ingest_worker.js`、`infra/transports/atproto/atproto_ingest_worker.js` で運用 signer 設定を ingest 経路へ接続した
- `packages/nostr/storage/persistence.js` と Standard API の view で embedded claim を保持・要約できるようにした
- `packages/protocol/multi_transport.js` で transport merge 時に `identityClaims` を落とさないようにした
- third-party verification と signer 設定の回帰テストを追加した

---

## フェーズ 17: 追加 protocol 実データ ingest

### 目的

Phase 14 で整えた multi-transport の枠組みと、Phase 15/16 で固めた canonical identity / provenance / identity key 実装を使って、追加 protocol を 1 つ実データ ingest まで通し、skeleton ではない運用可能な状態にする。

### 作業

- 追加する protocol を 1 つ選ぶ
- raw event / record の fixture と sample archive を用意する
- adapter / converter / storage を実データで通す
- replay から API までの一連を確認する
- 運用文書と test を揃える

### 完了条件

- 追加 protocol が実データで ingest できる
- replay で derived index を再構築できる
- Standard API から canonical view として参照できる
- 既存 protocol の挙動を壊さない
- 運用ガイドが protocol ごとに読める

### 完了メモ

- まだ着手前
- 対象 protocol の選定後に詳細を追記する

---

## フェーズ 18: registry 駆動の起動と選択整理

### 目的

protocol registry を起点に、起動時の protocol 選択、storage 選択、API/introspection の見え方をさらに整理して、将来の追加 protocol に対して入口を単純化する。

### 作業

- 起動引数と環境変数の優先順位を整理する
- registry から選択可能な protocol を一貫して表示する
- selected protocol と storage runtime の関係を明確にする
- 未対応 protocol の扱いを起動時にわかりやすくする
- API / README / ops doc の記述を揃える

### 完了条件

- registry 駆動で protocol 選択を説明できる
- 起動時の protocol / storage の選択基準が一貫している
- 未対応 protocol のエラーが明確である
- API の introspection と README の説明が一致している

### 完了メモ

- まだ着手前
- Phase 17 の追加 protocol を踏まえて詳細を詰める

---

## 当面の優先順位

Phase 14 を完了として扱ったうえで、次の順序で進めます。

1. canonical identity / provenance / identity key の実装を固める
2. 追加 protocol 1 つを実データ ingest まで通す
3. registry 駆動の起動と選択をさらに整理する
4. Standard API の multi-protocol 対応を確認する
5. 運用・移行・拡張の標準化を固める

この順序により、単なる skeleton の追加で止めずに、実装・起動・公開・運用までを一連でつなげられます。Phase 13/14 で扱った multi-transport fan-out / fan-in と identity resolution は、ここで完了した前提として扱います。

---

## 後回しにするもの

以下は重要ですが、初手では固定しません。

- embeddings の本格導入
- graph inference の高度化
- ActivityPub 対応
- 特定の DB 最適化
- 特定の検索エンジン最適化
- protocol 横断の高度な federation ルール

なお、Phase 13/14 で扱う multi-transport の実装が安定するまでは、追加 protocol の細かな federation ルールや transport 横断の高度な自動統合は、ここでいう「後回し」に残します。

これらは MVP の ingest, canonicalize, replay, API が安定した後に進めます。

---

## 最終判断基準

各作業項目は、次の基準で採否を判断します。

- semantic interoperability を前進させるか
- protocol 依存を増やしすぎないか
- transport を跨いだ同一性と重複抑止を壊さないか
- replayability を損なわないか
- AI / UI から見たアクセス面を単純にできるか
- 将来の multi-protocol 対応を難しくしないか

Toitoi の価値は transport の採用そのものではなく、異なる知識ネットワークを意味論的に横断できることにあります。
