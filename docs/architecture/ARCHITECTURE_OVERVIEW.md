# Toitoi Architecture Overview

**Status: v1.0.0 release candidate**
**Language status:** English and Japanese sections are maintained as equivalent.
**Last synchronized:** 2026-10-20

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

**状態: v1.0.0 リリース候補**
**言語状態:** 英語版と日本語版は同等の内容として管理します。
**最終同期日:** 2026-10-20

## 目的

この文書は、Toitoi v1.0.0の全体構成を英語と日本語で説明します。アダプター、パッケージ、スキーマ、配備、実装の詳細文書は、文書言語ポリシーで別に分類されない限り、英語で管理します。

## システムの位置づけ

Toitoiは、地域固有の観察から生まれる問いを保存し、確認・関連付け・検索・共有できるシステムです。特定の通信プロトコルに依存しません。

意味を表す中心的な記録にはCanonical Eventを使います。Nostr、Lingonberry、ATProtoなどの配信経路では、その記録を各方式に合わせた表現へ変換して配送します。配信先の表現を、Canonical Eventの同一性を判断する正本にはしません。

## 主要な流れ

```text
スマートフォン向け SPA / PWA
  → 観察記録の端末内保存と同期状態
  → Standard APIによるワークフロー操作
  → HTTP運用機能と操作主体の権限確認
  → 元データとCanonical Eventの追記型保存
  → 非同期AIジョブと注釈
  → 人間によるAI注釈の確認
  → Inquiry Draft（公開前の問いの下書き）
  → 人間が確定した問いの派生
  → 独立した公開承認
  → Canonical Eventの公開
  → 外向き配信アダプター
  → Nostr / Lingonberry / ATProto の配信状態
  → 保存データの再処理とCanonical Eventの参照用索引
  → 再構築可能なFTS5検索索引
  → 検索・文脈・語彙・関連する問いのAPI
  → 適合性と復旧の検証
```

## アーキテクチャ層

### 1. 観察の記録と端末内の状態

フロントエンドは、スマートフォンやオフライン環境での観察記録を支援します。端末内に保存されていることや同期キューに入っていることは、同期・公開・配信の完了を意味しません。

### 2. Standard APIと権限の分離

Standard APIは、配信方式に依存しないワークフロー操作を提供します。認証時の識別情報、操作主体の識別情報、配信先固有の識別情報、Canonical Eventの同一性は、それぞれ分けて扱います。

AI注釈の確認、問い同士の関係の確定、公開承認、モデレーション、運用者の権限行使は、別々の判断として監査可能な形で記録します。

### 3. 元データとCanonical Eventの永続保存

受信したプロトコル固有のデータとCanonical Eventは、分けて保存します。意味を表す記録の正本はCanonical storageです。公開済みイベントは追記型とし、訂正や再解釈は既存の履歴を書き換えず、新しいイベントと派生関係で表します。

### 4. AI支援

AI処理は、データの永続保存後に非同期で実行します。AIは要約、タグ、問い、関係を提案できますが、自律的な承認・公開・モデレーションや、Canonical Eventの同一性の統合は行えません。

### 5. 問いのワークフローと派生関係

確認済みのAI注釈から、Inquiry Draftを作成できます。派生した問いには、次の規範的な関係語彙を使って派生元を記録します。

- `derived_from`
- `translated_from`
- `observed_alongside`
- `contrasts_with`
- `synthesizes`
- `reframes`
- `annotates`
- `revises`

類似性、語彙の対応付け、意味上の関係だけで、Canonical Eventの同一性は確定しません。

### 6. 配信方式の抽象化

アダプターと変換器は、Canonical Eventの意味を各プロトコル固有の表現へ変換し、取り込み時にはその意味を再構成します。配信の失敗は配信状態を変えますが、Canonical Eventの永続保存を無効にはしません。

### 7. 検索と保存データの再処理

FTS5索引、文脈による絞り込み項目、関連する問いの候補、運用指標、稼働状態の表示は、元データから作る派生状態です。同じ入力から同じ結果を得られる再処理によって、Canonical storageから再構築できる必要があります。

### 8. 適合性検証と復旧

Conformance Suite（適合性検証ツール）は、アプリケーション内部の非公開モジュールに依存せず、外部から確認できる仕様を検証します。復旧ツールは、バックアップ一覧、SHA-256による検証、復元、破損検知、移行計画、試行実行（dry-run）、適用、派生状態の再構築を対象とします。

## 永続保存する状態と再構築できる状態

永続保存する状態:

- 受信した元データ
- Canonical storage
- 永続キューの状態
- 監査記録
- リポジトリの固定テストデータとは別に管理する配備設定と機密情報

再構築できる状態:

- FTS5検索索引
- 文脈による絞り込み項目
- 関連する問いの派生データ
- 運用指標と稼働状態の派生データ

## 維持すべき設計原則

1. Canonical storageを正本とします。
2. 元データとCanonical Eventは分けて管理します。
3. 各種の識別情報を分けて扱います。
4. AIの提案には人間による確認が必要です。
5. 公開には独立した承認が必要です。
6. 類似性や対応付けだけで同一性を自動統合しません。
7. 配信に失敗しても、永続保存したCanonical Eventは失われません。
8. 派生状態は再構築できるようにします。
9. リポジトリのリリース `v1.0.0`でも、Canonical Eventの通信形式上のバージョン識別子は`schemaVersion: "0.1.0"`です。
10. 固定テストデータによる検証は、実際の配信先・AIモデル・ホスト環境・参加者による結果の証拠にはなりません。

## 規範文書・詳細文書

- `docs/protocols/CANONICAL_EVENT.md`
- `docs/reference/V1_CONTRACT_INDEX.md`
- `apps/api/README.md`
- `apps/frontend/README.md`
- `docs/architecture/PROTOCOL_ABSTRACTION.md`
- `docs/architecture/TRANSPORT_POSITIONING.md`
- `docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md`
- `docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`
