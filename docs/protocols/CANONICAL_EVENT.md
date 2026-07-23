# Canonical Event

**Status: stable**  
**Language status:** English and Japanese sections are maintained as equivalent.  
**Last synchronized:** 2026-07-23

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

**状態: stable**  
**言語状態:** 英語版と日本語版は同等の内容として管理します。  
**最終同期日:** 2026-07-23

## 目的

Canonical Eventは、Toitoiにおけるprotocol-independentなsemantic recordです。storage、index、Standard API、AI workflow、review、derivation、transport projectionで使用する、replay可能な内部基準です。

Nostr EventやATProto Recordなどのtransport固有recordはCanonical Eventのprojectionであり、Canonical identityを定義しません。

## システム上の位置

```text
Raw protocol record
  -> adapter / normalizer
  -> Canonical Event
  -> storage / API / AI / search / replay

Canonical Event
  -> converter / transport adapter
  -> protocol-specific representation
```

Canonical storageが正本です。search index、facet、metrics、health view、related-inquiry candidateは再構築可能なderived stateです。

## 基本原則

1. Canonical Eventはtransport schemaの写しではありません。
2. Canonical identityはtransport projectionとreplayを通して維持されます。
3. raw protocol dataとCanonical dataは分離して保存します。
4. 公開eventはappend-onlyであり、訂正や再解釈はlineageで接続した新しいeventとして表現します。
5. ingestとreplayは同じcanonicalization ruleを使います。
6. similarity、Vocabulary mapping、transport delivery、semantic relationはCanonical identityを自動統合しません。
7. AI outputはpublication approvalでも農業上の正しさでもありません。

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

機械可読な契約は`schemas/canonical-event.schema.json`です。公開識別子は`https://toitoi.cultivationdata.net/schemas/v1/canonical-event.schema.json`です。

repository releaseは`v1.0.0`ですが、stableなCanonical Event wire identifierは`schemaVersion: "0.1.0"`のままです。両者の責務は異なり、混同してはいけません。

## 必須field

- `id`: `tt:evt:<opaque-id>`形式のopaqueでtransport-independentなidentifier
- `schemaVersion`: Canonical Event wire schemaの版
- `type`: semantic event type
- `createdAt`: ISO 8601 timestamp
- `body`: `text`と`language`を持つ自然言語表現
- `provenance.sources`: 1件以上のsource reference

## 任意field

- `contexts`: 抽象化したlocalityとcontext metadata
- `relationships`: semantic relationship
- `phase`: 任意の学習・成熟段階
- `trigger`: event生成契機
- `dsl`: 任意の説明projection
- `lineage`: derivationとrevisionのedge
- `identityClaims`: 任意のverifiable identity claim
- `rawRef`: 分離保存されたraw protocol dataへの参照
- `labels`: transport projection用label
- `meta`: 非semanticなimplementation metadata

forward compatibilityのため未知のtop-level fieldを許容します。`body`、`provenance`、`rawRef`などのclosed nested objectではschema宣言fieldのみを許容します。`contexts`と`meta`は意図的にextensibleです。

## Event type

現行schemaは次を認識します。

- `inquiry`
- `observation`
- `annotation`
- `response`
- `synthesis`

## Lineage

lineageは異なるCanonical Eventを接続します。同一eventのtransport copyを表すものではありません。

v1の正式なlineage relationは次です。

- `derived_from`
- `translated_from`
- `observed_alongside`
- `contrasts_with`
- `synthesizes`
- `reframes`
- `annotates`
- `revises`

`synthesis`はevent `type`であり、`synthesizes`はlineage relationです。

## Provenanceとraw data

`provenance.sources[]`はeventの由来を記録する必須fieldです。各sourceは少なくとも次を持ちます。

- `protocol`
- `sourceId`

`rawRef`はCanonical Eventの外部に分離保存したraw protocol dataを参照します。raw payloadを`event.raw`や`provenance.raw`へ埋め込んではいけません。

## Authorityとidentityの境界

- authentication identity、actor identity、transport identity、Canonical Event identityを分離します。
- AI annotation acceptance、relation confirmation、publication approval、moderation、operator actionは別の判断です。
- transport failureはdelivery stateを変えますがCanonical persistenceを無効化しません。
- Vocabulary mappingは明示的claimであり、local languageを暗黙にnormalizeしません。
- generated、derived、related、mapped contentの農業上の正しさは保証されません。

## Compatibility

native v1 validationはstrict Canonical Event contractを使います。legacy v0.9 shapeは明示的な`v0.9.0` Conformance compatibility profileでのみ受理します。compatibility handlingによってstrict v1 validationを弱めてはいけません。

## 関連文書

- `schemas/canonical-event.schema.json`
- `docs/reference/V1_CONTRACT_INDEX.md`
- `docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md`
- `docs/architecture/ARCHITECTURE_OVERVIEW.md`
- `docs/protocols/NOSTR_INQUIRY_SCHEMA.md`
- `docs/protocols/ATPROTO_INQUIRY_SCHEMA.md`
