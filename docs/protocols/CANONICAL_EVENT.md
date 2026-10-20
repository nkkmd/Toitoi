# Canonical Event

**Status: stable**
**Language status:** English and Japanese sections are maintained as equivalent.
**Last synchronized:** 2026-10-20

## Purpose

Canonical Event is Toitoi's protocol-independent semantic record. It is the replayable internal reference used by storage, indexing, the Standard API, AI workflows, review, derivation, and transport projection.

Transport-specific records such as Nostr events and ATProto records are projections of a Canonical Event. They do not define Canonical identity.

## Position in the system

```text
Raw protocol record
  -> adapter / normalizer
  -> Canonical Event
  -> storage / API / AI / search / replay

Canonical Event
  -> converter / transport adapter
  -> protocol-specific representation
```

Canonical storage is authoritative. Search indexes, facets, metrics, health views, and related-inquiry candidates are rebuildable derived state.

## Core principles

1. A Canonical Event is not a copy of a transport schema.
2. Canonical identity is stable across transport projection and replay.
3. Raw protocol data and Canonical data are stored separately.
4. Published events are append-only; corrections and reinterpretations create new events connected by lineage.
5. Ingest and replay use the same canonicalization rules.
6. Similarity, vocabulary mapping, transport delivery, and semantic relations do not merge Canonical identity automatically.
7. AI output is not publication approval or agronomic correctness.

## Minimal shape

```json
{
  "id": "tt:evt:550e8400e29b41d4a716446655440000",
  "schemaVersion": "0.1.0",
  "type": "inquiry",
  "createdAt": "2026-05-19T00:00:00Z",
  "body": {
    "text": "Why do weed communities differ across parts of the field?",
    "language": "en"
  },
  "provenance": {
    "sources": [
      {
        "protocol": "lingonberry",
        "sourceId": "draft:toitoi-example-0001"
      }
    ]
  }
}
```

The machine-verifiable contract is `schemas/canonical-event.schema.json`, published as `https://toitoi.cultivationdata.net/schemas/v1/canonical-event.schema.json`.

The repository release is `v1.0.0`, while the stable Canonical Event wire identifier remains `schemaVersion: "0.1.0"`. These versions have different responsibilities and must not be conflated.

## Required fields

- `id`: opaque transport-independent identifier in the form `tt:evt:<opaque-id>`
- `schemaVersion`: Canonical Event wire-schema version
- `type`: semantic event type
- `createdAt`: ISO 8601 timestamp
- `body`: natural-language representation with `text` and `language`
- `provenance.sources`: at least one source reference

## Optional fields

- `contexts`: abstracted locality and contextual metadata
- `relationships`: semantic relationships
- `phase`: optional learning or maturity phase
- `trigger`: event-generation trigger
- `dsl`: optional explanatory projection
- `lineage`: derivation and revision edges
- `identityClaims`: optional verifiable identity claims
- `rawRef`: reference to separately stored raw protocol data
- `labels`: transport-projection labels
- `meta`: non-semantic implementation metadata

Unknown top-level fields are permitted for forward compatibility. Closed nested objects such as `body`, `provenance`, and `rawRef` accept only fields declared by the schema. `contexts` and `meta` remain intentionally extensible.

## Event types

The current schema recognizes:

- `inquiry`
- `observation`
- `annotation`
- `response`
- `synthesis`

## Lineage

Lineage connects distinct Canonical Events. It does not represent transport copies of the same event.

Normative v1 lineage relation values are:

- `derived_from`
- `translated_from`
- `observed_alongside`
- `contrasts_with`
- `synthesizes`
- `reframes`
- `annotates`
- `revises`

`synthesis` is an event `type`; `synthesizes` is the lineage relation.

## Provenance and raw data

`provenance.sources[]` records where an event came from and is required. Each source contains at least:

- `protocol`
- `sourceId`

`rawRef` points to raw protocol data stored outside the Canonical Event. Raw payloads must not be embedded in `event.raw` or `provenance.raw`.

## Authority and identity boundaries

- authentication identity, actor identity, transport identity, and Canonical Event identity remain distinct;
- AI annotation acceptance, relation confirmation, publication approval, moderation, and operator actions remain separate decisions;
- transport failure changes delivery state but does not invalidate Canonical persistence;
- vocabulary mappings are explicit claims and do not silently normalize local language;
- generated, derived, related, or mapped content is not guaranteed to be agriculturally correct.

## Compatibility

Native v1 validation uses the strict Canonical Event contract. Legacy v0.9 shapes are accepted only through the explicit `v0.9.0` Conformance compatibility profile. Compatibility handling must not weaken strict v1 validation.

## Related documents

- `schemas/canonical-event.schema.json`
- `docs/reference/V1_CONTRACT_INDEX.md`
- `docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md`
- `docs/architecture/ARCHITECTURE_OVERVIEW.md`
- `docs/protocols/NOSTR_INQUIRY_SCHEMA.md`
- `docs/protocols/ATPROTO_INQUIRY_SCHEMA.md`

---

# Canonical Event

**状態: 安定版**
**言語状態:** 英語版と日本語版は同等の内容として管理します。
**最終同期日:** 2026-10-20

## 目的

Canonical Eventは、Toitoiで意味を表す、通信プロトコルに依存しない記録です。保存、索引作成、Standard API、AI処理、人間による確認、問いの派生、配信方式ごとの表現への変換で、再処理可能な共通の基準として使います。

Nostr EventやATProto Recordなどの記録は、Canonical Eventを各配信方式に合わせて表したものです。それ自体でCanonical Eventの同一性は決まりません。

## システム上の位置

```text
受信したプロトコル固有の記録
  -> アダプター / 正規化器
  -> Canonical Event
  -> 保存 / API / AI / 検索 / 保存データの再処理

Canonical Event
  -> 変換器 / 配信アダプター
  -> 各プロトコル固有の表現
```

Canonical storage（Canonical Eventの保存領域）を正本とします。検索索引、絞り込み項目、運用指標、稼働状態の表示、関連する問いの候補は、元データから再構築できる派生状態です。

## 基本原則

1. Canonical Eventは、配信先のスキーマをそのまま写したものではありません。
2. 配信方式ごとの変換や保存データの再処理を経ても、Canonical Eventの同一性を維持します。
3. 受信した元データとCanonical Eventは、分けて保存します。
4. 公開済みイベントは追記型とします。訂正や再解釈は、派生関係でつないだ新しいイベントとして表します。
5. 取り込みと再処理には、同じCanonical Eventへの変換規則を使います。
6. 類似性、語彙の対応付け、配信結果、意味上の関係だけで、Canonical Eventの同一性を自動統合しません。
7. AI出力は、公開承認や農業上の正しさを意味しません。

## 最小構造

```json
{
  "id": "tt:evt:550e8400e29b41d4a716446655440000",
  "schemaVersion": "0.1.0",
  "type": "inquiry",
  "createdAt": "2026-05-19T00:00:00Z",
  "body": {
    "text": "畑の場所によって雑草群落が違うのはなぜ？",
    "language": "ja"
  },
  "provenance": {
    "sources": [
      {
        "protocol": "lingonberry",
        "sourceId": "draft:toitoi-example-0001"
      }
    ]
  }
}
```

機械処理可能な仕様は`schemas/canonical-event.schema.json`です。公開識別子は`https://toitoi.cultivationdata.net/schemas/v1/canonical-event.schema.json`です。

リポジトリのリリース版は`v1.0.0`ですが、Canonical Eventの通信形式上のバージョン識別子は`schemaVersion: "0.1.0"`のままです。両者は役割が異なるため、混同してはいけません。

## 必須項目

- `id`: `tt:evt:<opaque-id>`形式の、配信方式や内部構造に依存しない識別子
- `schemaVersion`: Canonical Eventの通信形式の版
- `type`: 意味上のイベント種別
- `createdAt`: ISO 8601形式の日時
- `body`: `text`と`language`を持つ自然言語表現
- `provenance.sources`: 1件以上の出典参照

## 任意項目

- `contexts`: 抽象化した地域情報と文脈のメタデータ
- `relationships`: 意味上の関係
- `phase`: 学習・成熟の段階
- `trigger`: イベントが生成されたきっかけ
- `dsl`: 説明のための表現
- `lineage`: 派生・改訂の関係
- `identityClaims`: 検証可能な同一性の申告
- `rawRef`: 分離して保存されたプロトコル固有の元データへの参照
- `labels`: 配信方式ごとの表現に使うラベル
- `meta`: 意味内容に関わらない実装上のメタデータ

将来の拡張との互換性のため、最上位では未知の項目を許容します。`body`、`provenance`、`rawRef`など、追加項目を認めない入れ子のオブジェクトでは、スキーマで宣言した項目だけを許容します。`contexts`と`meta`は、拡張可能な構造としています。

## イベント種別

現行スキーマは、次の種別を認識します。

- `inquiry`
- `observation`
- `annotation`
- `response`
- `synthesis`

## 派生関係（lineage）

lineageは、異なるCanonical Event同士をつなぐ情報です。同じイベントを各配信先に複製した記録を表すものではありません。

v1の正式な派生関係は、次のとおりです。

- `derived_from`
- `translated_from`
- `observed_alongside`
- `contrasts_with`
- `synthesizes`
- `reframes`
- `annotates`
- `revises`

`synthesis`はイベントの`type`であり、`synthesizes`は派生関係の種別です。

## 来歴情報と元データ

`provenance.sources[]`は、イベントの由来を記録する必須項目です。各出典は、少なくとも次を持ちます。

- `protocol`
- `sourceId`

`rawRef`は、Canonical Eventとは別に保存したプロトコル固有の元データを参照します。元データ本体を`event.raw`や`provenance.raw`に埋め込んではいけません。

## 権限と識別情報の分離

- 認証時の識別情報、操作主体の識別情報、配信先固有の識別情報、Canonical Eventの同一性を分けて扱います。
- AI注釈の採用、関係の確定、公開承認、モデレーション、運用者の操作は、別々の判断です。
- 配信失敗は配信状態を変えますが、Canonical Eventの永続保存を無効にはしません。
- 語彙の対応付けは明示的な申告です。地域固有の言葉を暗黙に正規化しません。
- 生成・派生・関連付け・対応付けされた内容の、農業上の正しさは保証されません。

## 互換性

v1本来の形式の検証には、厳密なCanonical Eventの仕様を使います。旧v0.9形式は、明示的な`v0.9.0`のConformance互換プロファイルでのみ受理します。互換性のための処理によって、v1の厳密な検証を弱めてはいけません。

## 関連文書

- `schemas/canonical-event.schema.json`
- `docs/reference/V1_CONTRACT_INDEX.md`
- `docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md`
- `docs/architecture/ARCHITECTURE_OVERVIEW.md`
- `docs/protocols/NOSTR_INQUIRY_SCHEMA.md`
- `docs/protocols/ATPROTO_INQUIRY_SCHEMA.md`
