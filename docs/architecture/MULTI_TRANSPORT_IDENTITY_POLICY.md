# Multi-Transport Identity Policy

**Status: evolving** | **Last updated: 2026-06-04**

## 目的

Phase 13 で定義した fan-out / fan-in の判断基準を、Phase 14 の実装と運用に接続するための方針として固定します。

この文書は、Nostr と ATProto を現在の対象 transport としながら、将来の transport 追加でも再利用できる保守的な identity policy を定義します。

---

## 基本方針

1. canonical identity は明示的に同一といえる場合にだけ merge する
2. raw duplicate と semantic duplicate を分けて扱う
3. transport 固有の送信先差分は transport 層に閉じる
4. 検出不能または曖昧な case は無理に merge しない
5. 将来の protocol 追加時も、この方針を壊さない

---

## 現在の対象

現時点でこの policy が直接対象とする transport は次の 2 つです。

- Nostr
- ATProto

将来 protocol を追加する場合も、次を満たす限り同じ policy を流用できます。

- transport ごとの ingest と projection が分離されている
- canonical event が共通の内部基準になっている
- provenance と rawRef を replay 可能な形で保持している

---

## Outbound Fan-out

fan-out は、1 つの canonical event を複数 transport 向け representation に投影することです。

### 方針

- 送信先解決は transport 層の責務とする
- canonical event の意味内容は transport ごとに変えない
- transport ごとに配送可否や宛先差分があっても、semantic layer は分岐しない
- 送信失敗は transport 単位で扱い、他 transport に不必要に波及させない

### 禁止事項

- transport 固有の宛先差分を canonical event に書き戻すこと
- 出力先の違いを identity の違いとして扱うこと
- 配送可能性だけを理由に semantic merge を変えること

---

## Inbound Fan-in

fan-in は、複数 relay / PDS から raw event を取り込み、canonicalized event にすることです。

### 判定の順序

1. raw duplicate を判定する
2. transport source 内の重複を抑制する
3. canonical identity の明示的な根拠がある場合だけ merge する
4. 根拠がない場合は別 event として保持する

### 明示的な同一性の根拠

次のような根拠がある場合だけ merge を許可します。

- 同一 canonical event id を共有している
- adapter / converter が同一性を明示的に確定している
- replay / migration 時に対応表で同一性を明示している

### 明示的でないもの

次の情報だけでは merge しません。

- body の類似
- label の一致
- timestamp の近さ
- relationship の構造類似
- DSL の類似

---

## Provenance 集約

merge が許可された event についてのみ provenance を集約します。

### 集約ルール

- `provenance.sources[]` に source reference を残す
- `rawRef` は replay / re-canonicalize のための参照として保持する
- source ごとの差分は provenance に閉じ、semantic layer に持ち込まない

### 曖昧な case

同一性が曖昧な場合は、次のいずれかで保持します。

- 別 event として並列に保持する
- relation で結ぶ
- lineage で履歴を表現する

---

## Contract Test の整理

Phase 13 では実装 skeleton を増やさず、次の contract test 観点を固定します。

- 同一 transport source 内の raw duplicate が別 event として露出しないこと
- cross-source の event が、明示的同一性なしに merge されないこと
- provenance が merge 可能な場合にのみ集約されること
- API の canonical view が transport ごとの重複を過剰に露出しないこと
- 曖昧な event が relation / lineage に逃がせること

### 参照先の候補

- `packages/nostr/adapter/test_ingest_pipeline.js`
- `packages/atproto/adapter/test_ingest_pipeline.js`
- `packages/nostr/storage/test_standard_api_views.js`
- `packages/atproto/storage/test_indexer.js`
- `apps/api/test_standard_api_service.js`

Phase 14 では、ここで定義した観点を実装に接続し、必要な contract test を追加しました。

### Phase 14 向けの具体案

#### 1. source 内 duplicate suppression

- Nostr: 同一 `id` の raw event を 2 回 ingest しても、accepted は 1 件、duplicate は 1 件になること
- ATProto: 同一 `uri` または同一の transport key を持つ raw event を 2 回 ingest しても、accepted は 1 件、duplicate は 1 件になること
- 期待: transport source 内の重複が canonical view に二重表示されないこと

#### 2. cross-source non-merge

- Nostr と ATProto に、内容が似ているだけの event を 1 つずつ ingest する
- 期待: canonical identity が明示されていない限り、2 件の distinct canonical event として保持されること
- 期待: provenance は各 source ごとに追跡できること

#### 3. explicit identity mapping

- replay / migration 時に、明示的な対応表で同一 canonical identity を与えた event を用意する
- 期待: その場合に限り provenance が集約され、API では 1 件として返ること
- 期待: 収束の根拠が identity mapping にあること

#### 4. ambiguous event retention

- 同一性が曖昧な event を relation または lineage でつなぐ fixture を用意する
- 期待: merge されずに複数 event として残ること
- 期待: 関連は canonical view から追跡できること

#### 5. API canonical view regression

- `/api/v1/inquiries` と `/api/v1/inquiries/:id/detail` で重複が見えすぎないことを確認する
- `lookup` / `list` / `query` / `relation` / `tree` が、source ごとの差分を canonical view に閉じ込めることを確認する
- 期待: highlight や raw transport event が contract に混入しないこと

---

## 参照

- [../roadmap/IMPLEMENTATION_PLAN.md](../roadmap/IMPLEMENTATION_PLAN.md)
- [../protocols/CANONICAL_EVENT.md](../protocols/CANONICAL_EVENT.md)
- [../concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md](../concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md)
