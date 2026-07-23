# Toitoi Architecture Overview

**Status: v1.0.0 release candidate**  
**Language status:** English and Japanese sections are maintained as equivalent.  
**Last synchronized:** 2026-07-23

## Purpose

This document is the bilingual public architecture entry point for Toitoi v1.0.0. Detailed adapter, package, schema, deployment, and implementation documents remain English unless separately classified by the documentation language policy.

## System position

Toitoi is a protocol-independent system for preserving, reviewing, relating, searching, and circulating inquiries grounded in local observations.

The system uses Canonical Events as its semantic center. Nostr, Lingonberry, ATProto, and future transports are projections and delivery mechanisms, not the source of Canonical identity.

## Primary flow

```text
Mobile-first SPA / PWA
  → local observation and synchronization state
  → Standard API workflow mutations
  → operational HTTP boundary and actor authority
  → append-only raw and Canonical persistence
  → asynchronous AI job and annotation layer
  → human annotation review
  → Inquiry Draft
  → human-confirmed semantic derivation
  → independent publication approval
  → Canonical Event publication
  → outbound transport adapters
  → Nostr / Lingonberry / ATProto delivery state
  → replay and Canonical read index
  → rebuildable FTS5 search projection
  → search / context / vocabulary / related-inquiry API
  → Conformance and recovery validation
```

## Architectural layers

### 1. Capture and local state

The frontend supports mobile-first and offline-first observation capture. Local persistence and queue state do not imply synchronization, publication, or transport delivery.

### 2. Standard API and authority boundary

The Standard API exposes transport-independent workflow operations. Authentication identity, actor identity, transport identity, and Canonical Event identity remain separate.

Annotation review, relation confirmation, publication approval, moderation, and operator authority are independent auditable decisions.

### 3. Raw and Canonical persistence

Raw protocol payloads and Canonical Events are stored separately. Canonical storage is authoritative for semantic state. Published events are append-only; corrections and reinterpretations create new events and lineage rather than silently rewriting history.

### 4. AI assistance

AI processing runs asynchronously after persistence. AI may propose summaries, tags, inquiries, or relations, but it cannot approve, publish, moderate, or merge Canonical identity autonomously.

### 5. Inquiry workflow and lineage

Reviewed annotation output may be promoted to an Inquiry Draft. Derived inquiries preserve source lineage through the normative relation vocabulary:

- `derived_from`
- `translated_from`
- `observed_alongside`
- `contrasts_with`
- `synthesizes`
- `reframes`
- `annotates`
- `revises`

Similarity, vocabulary mapping, and semantic relations do not establish Canonical identity.

### 6. Transport abstraction

Adapters and converters project Canonical meaning to protocol-specific representations and reconstruct Canonical meaning during ingest. Delivery failure changes delivery state but does not invalidate Canonical persistence.

### 7. Search and replay

FTS5 indexes, context facets, related-inquiry candidates, metrics, and health views are derived state. They must be rebuildable from Canonical storage through deterministic replay.

### 8. Conformance and recovery

The Conformance Suite validates observable contracts without requiring private application modules. Recovery tooling covers backup manifests, SHA-256 verification, restore, corruption detection, migration plan, dry-run, apply, and derived-state rebuild.

## Durable and rebuildable state

Durable state:

- raw storage;
- Canonical storage;
- durable queue state;
- audit records;
- deployment configuration and secrets managed outside repository fixtures.

Rebuildable state:

- FTS5 search index;
- context facets;
- related-inquiry projections;
- metrics and health projections.

## Stable architectural invariants

1. Canonical storage is authoritative.
2. Raw and Canonical data remain separately controlled.
3. Identity domains remain distinct.
4. AI proposals remain subject to human review.
5. Publication requires independent approval.
6. Similarity and mappings never merge identity automatically.
7. Transport failure does not erase Canonical persistence.
8. Derived state remains rebuildable.
9. `schemaVersion: "0.1.0"` is the stable Canonical Event wire identifier for repository release `v1.0.0`.
10. Deterministic fixtures are not evidence of live transport, live model, hosted deployment, or real participant outcomes.

## Normative and detailed references

- `docs/protocols/CANONICAL_EVENT.md`
- `docs/reference/V1_CONTRACT_INDEX.md`
- `apps/api/README.md`
- `apps/frontend/README.md`
- `docs/architecture/PROTOCOL_ABSTRACTION.md`
- `docs/architecture/TRANSPORT_POSITIONING.md`
- `docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md`
- `docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`

---

# Toitoi アーキテクチャ概要

**状態: v1.0.0 release candidate**  
**言語状態:** 英語版と日本語版は同等の内容として管理します。  
**最終同期日:** 2026-07-23

## 目的

この文書は、Toitoi v1.0.0の英日併記による公開architecture入口です。adapter、package、schema、deployment、実装の詳細文書は、文書言語ポリシーで別に分類されない限り英語で管理します。

## システムの位置づけ

Toitoiは、地域固有の観察に基づく問いを保存、review、関連付け、検索、流通するprotocol-independentなsystemです。

systemの意味的中心にはCanonical Eventを使用します。Nostr、Lingonberry、ATProto、および将来のtransportはprojectionと配送手段であり、Canonical identityの正本ではありません。

## 主要な流れ

```text
Mobile-first SPA / PWA
  → local observation and synchronization state
  → Standard API workflow mutations
  → operational HTTP boundary and actor authority
  → append-only raw and Canonical persistence
  → asynchronous AI job and annotation layer
  → human annotation review
  → Inquiry Draft
  → human-confirmed semantic derivation
  → independent publication approval
  → Canonical Event publication
  → outbound transport adapters
  → Nostr / Lingonberry / ATProto delivery state
  → replay and Canonical read index
  → rebuildable FTS5 search projection
  → search / context / vocabulary / related-inquiry API
  → Conformance and recovery validation
```

## アーキテクチャ層

### 1. Captureとlocal state

frontendはmobile-first、offline-firstのobservation captureを支援します。local persistenceとqueue stateは、synchronization、publication、transport deliveryを意味しません。

### 2. Standard APIとauthority boundary

Standard APIはtransport-independentなworkflow operationを提供します。authentication identity、actor identity、transport identity、Canonical Event identityは分離します。

annotation review、relation confirmation、publication approval、moderation、operator authorityは、それぞれ独立した監査可能な判断です。

### 3. RawとCanonical persistence

raw protocol payloadとCanonical Eventは分離して保存します。semantic stateの正本はCanonical storageです。公開済みeventはappend-onlyとし、訂正や再解釈は履歴を黙って書き換えず、新しいeventとlineageで表現します。

### 4. AI支援

AI処理はpersistence後に非同期で実行します。AIはsummary、tag、inquiry、relationを提案できますが、自律的にapprove、publish、moderate、Canonical identity mergeを行えません。

### 5. Inquiry workflowとlineage

review済みannotation outputはInquiry Draftへpromoteできます。derived inquiryは次の規範relation vocabularyでsource lineageを保持します。

- `derived_from`
- `translated_from`
- `observed_alongside`
- `contrasts_with`
- `synthesizes`
- `reframes`
- `annotates`
- `revises`

similarity、Vocabulary mapping、semantic relationはCanonical identityを確定しません。

### 6. Transport abstraction

adapterとconverterはCanonical meaningをprotocol-specific representationへprojectionし、ingest時にCanonical meaningを再構成します。delivery failureはdelivery stateを変更しますが、Canonical persistenceを無効化しません。

### 7. Searchとreplay

FTS5 index、context facet、related-inquiry candidate、metrics、health viewはderived stateです。決定的replayによりCanonical storageから再構築できなければなりません。

### 8. Conformanceとrecovery

Conformance Suiteはprivate application moduleを要求せずobservable contractを検証します。recovery toolingはbackup manifest、SHA-256 verification、restore、corruption detection、migration plan、dry-run、apply、derived-state rebuildを対象とします。

## Durable stateとrebuildable state

Durable state:

- raw storage
- Canonical storage
- durable queue state
- audit record
- repository fixture外で管理するdeployment configurationとsecret

Rebuildable state:

- FTS5 search index
- context facet
- related-inquiry projection
- metricsとhealth projection

## 安定アーキテクチャ不変条件

1. Canonical storageが正本です。
2. raw dataとCanonical dataは分離して管理します。
3. identity domainを分離します。
4. AI proposalには人間reviewが必要です。
5. publicationには独立したapprovalが必要です。
6. similarityとmappingでidentityを自動統合しません。
7. transport failureはCanonical persistenceを消去しません。
8. derived stateは再構築可能とします。
9. repository release `v1.0.0`におけるCanonical Eventのstable wire identifierは`schemaVersion: "0.1.0"`です。
10. 決定的fixtureはlive transport、live model、hosted deployment、実参加者の結果を証明しません。

## 規範文書・詳細文書

- `docs/protocols/CANONICAL_EVENT.md`
- `docs/reference/V1_CONTRACT_INDEX.md`
- `apps/api/README.md`
- `apps/frontend/README.md`
- `docs/architecture/PROTOCOL_ABSTRACTION.md`
- `docs/architecture/TRANSPORT_POSITIONING.md`
- `docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md`
- `docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`
