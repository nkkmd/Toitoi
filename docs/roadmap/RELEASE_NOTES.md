# Toitoi Release Notes

**Status: current** | **Last updated: 2026-07-21**

この文書は、Toitoiの公開基準点をリリース単位で記録します。

---

## v0.7.0

**Status: release-ready**

v0.7.0は、既存のlineage inspectionを、semantic relationを明示して問いを育てる第一級のauthoring workflowへ拡張するリリースです。

### Highlights

- `derived_from`、`translated_from`、`observed_alongside`、`contrasts_with`、`synthesizes`、`reframes`、`annotates`、`revises`の8 relation
- relation別の入力補助とdeterministic validation
- `POST /api/v1/inquiries/:id/derive`
- 既存inquiryから派生Inquiry Draftを作成するmobile-first UI
- AI relation suggestionとhuman-confirmed relationの分離
- synthesisにおける複数source inquiry ID保持
- identity、semantic relation、context similarityの視覚的・意味的分離
- lineage、context、provenance、AI関与、human reviewの統合表示
- transport projection、re-ingest、canonical storage replay後のlineage復元fixture
- 既存Inquiry Draft reviewとpublication guardの継続

### Golden Path

```text
公開済みinquiry
  → semantic relationを選択
  → relation別情報を入力
  → 人間がrelationを明示確定
  → 派生Inquiry Draftを作成
  → reviewへ提出
  → 独立したhuman approval
  → 別Canonical Eventとして公開
  → lineage／context／provenanceを確認
  → transport projection／再取得／replay
  → 同じ系譜意味を復元
```

### Semantic boundary

- Canonical identity、semantic relation、context similarityを混同しない
- 類似性だけでidentity mergeしない
- AIはrelationを提案できるが、人間確定なしでは派生Draftを作成しない
- relation確定とpublication approvalを別操作として維持する
- 派生eventはsource eventと別のCanonical Event IDを持つ

### Validation

- protocol relation contractと旧derived inquiry regression
- workflow derivation HTTP mutation
- mobile derivation form model
- integrated genealogy view
- v0.7.0 transport replay round trip
- v0.6.0以前のworkspace regression
- PR #35 final CI run #525 succeeded
- implementation merged to `main` as `b1ba070c1bf9cfc4c21be74a4cd9d4e479640959`

### Known limitations

- production authentication、authorization、rate limiting、multi-user tenancyは未実装
- semantic search、embeddings、vector search、RAGは非対象
- graph inferenceと大規模graph visualizationは非対象
- automatic identity mergeは行わない
- AIによるrelation自動確定や無人公開は行わない
- live external transport checkはopt-inであり、default CIはdeterministic fixtureを使用する
- 派生した問いの農業上の正しさは保証しない

詳細は[`V0.7.0_RELEASE_PLAN.md`](./V0.7.0_RELEASE_PLAN.md)、[`V0.7.0_RELEASE_RUNBOOK.md`](./V0.7.0_RELEASE_RUNBOOK.md)、[`V0.7.0_GITHUB_RELEASE.md`](./V0.7.0_GITHUB_RELEASE.md)を参照してください。

---

## v0.6.0

**Status: released**

v0.6.0は、既存のStandard API、AI annotation review、Inquiry Draft、human review、publication guard、append-only storage、multi-transport runtimeを、mobile-first SPA／PWAとoffline Golden Pathへ統合するリリースです。

### Highlights

- mobile-first observation input and installable PWA shell
- IndexedDB-backed local observation persistence
- durable explicit synchronization queue
- visible offline、queued、syncing、failed、retry、published states
- sensitive-field confirmation for location、person names、contact、private context
- clear separation between local raw observations and public Canonical Events
- AI annotation accept／edit／reject and selected-candidate promotion
- Inquiry Draft submit／approve／reject／publish workflow
- approved Draftだけを許可するpublication guard
- existing append-only canonical storageへのpublication
- existing multi-transport runtimeによるNostr／Lingonberry／ATProto delivery
- publication provenance containing lineage、AI involvement、human review、storage IDs、transport outcomes
- deterministic offline、workflow、storage、delivery tests in default CI

### Golden Path

```text
圃場で観察
  → 圏外でIndexedDBへ保存
  → 接続回復後に明示的同期
  → AI問い候補を確認・修正・却下
  → Inquiry Draftへpromotion
  → 独立したhuman publication review
  → approved Canonical Event publication
  → append-only canonical storage
  → multi-transport delivery
  → provenance／lineage／delivery result確認
```

### Validation

- PR #33 final CI succeeded
- complete workspace tests succeeded
- v0.3.0〜v0.5.0 Golden Path regressions remained green
- v0.6.0 offline observation／retry Golden Path succeeded
- workflow HTTP mutation and publication guard tests succeeded
- canonical publisher storage and transport adapter tests succeeded
- implementation merged to `main` as `7e81fffc531adca6273df5873b51941012f6206b`

### Release criteria

- observation created offline is retained locally
- synchronization remains explicit and retryable
- AI annotation acceptance does not approve publication
- only independently approved Inquiry Drafts are publishable
- sensitive fields require explicit confirmation
- Canonical Event storage and transport delivery remain auditable
- no unattended AI or Service Worker publication occurs

### Known limitations

- production authentication、authorization、rate limiting、multi-user tenancy are not implemented
- AI queue remains local single-process rather than distributed
- browser-level E2E coverage is a reference Golden Path, not a complete browser matrix
- live model and external transport checks remain opt-in
- embeddings、vector database、RAG、graph inference、semantic identity merge are out of scope
- generated inquiries are not guaranteed to be agriculturally correct

詳細は[`V0.6.0_RELEASE_PLAN.md`](./V0.6.0_RELEASE_PLAN.md)、[`V0.6.0_RELEASE_RUNBOOK.md`](./V0.6.0_RELEASE_RUNBOOK.md)、[`V0.6.0_GITHUB_RELEASE.md`](./V0.6.0_GITHUB_RELEASE.md)を参照してください。

---

## v0.5.0

**Status: released**

v0.5.0は、v0.4.0の非同期AI annotation基盤を、監査可能な複数問い候補生成へ拡張しました。

### Highlights

- llama.cpp OpenAI-compatible production inference provider
- versioned `generate_inquiries` annotation contract
- multiple validated inquiry candidates per observation
- model、model version、prompt version、raw output、generation time provenance
- malformed output rejection before persistence
- append-only annotation accept／edit／reject mutations
- accepted／edited candidate promotion to Inquiry Draft
- source lineage and AI provenance retention
- low-resource profile for 4GB-class systems
- deterministic v0.5.0 Golden Path

AI annotation acceptance permits Draft creation only. Publication still requires independent human review.

---

## v0.4.0

**Status: released**

v0.4.0 introduced the asynchronous AI assistance layer behind Canonical Event ingest and persistence.

### Highlights

- duplicate-aware AI job queue
- bounded retry and restart recovery
- summary／tag annotation contracts
- append-only job and annotation persistence
- provider-neutral deterministic worker boundary
- Standard API AI inspection views
- accepted annotation promotion contract
- frontend distinction between AI assistance and published inquiries

---
