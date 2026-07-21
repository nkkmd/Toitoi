# Toitoi Release Notes

**Status: current** | **Last updated: 2026-07-22**

この文書は、Toitoiの公開基準点をリリース単位で記録します。

---

## v0.8.0

**Status: released**

v0.8.0は、蓄積されたCanonical Eventを語句、文脈、relation、transport、provenance、review state、地域語彙から探索し、問いの再利用へ接続するリリースです。

### Release record

- released: 2026-07-22
- tag: `v0.8.0`
- tag target: `d04e4354325ebd68f270f844cd7130a47ae4e660`
- GitHub Release title: `Toitoi v0.8.0 — Search, Vocabulary, and Reuse`
- implementation PR: [#36](https://github.com/nkkmd/Toitoi/pull/36)
- implementation merged to `main` as `d04e4354325ebd68f270f844cd7130a47ae4e660`
- final pre-merge CI: run #654 succeeded

### Highlights

- Canonical Eventから再構築可能なSQLite FTS5 projection
- inquiry、observation、accepted summary、tag、label、context、relation、provenance、review state、transport metadataの検索
- region、climate、soil、crop、season、transport、provenance、review state等のstructured filter
- context／transport／review facet
- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- `exact_identity`、`explicit_relation`、`related_candidate`の明示分類
- outgoing relationとincoming lineage childを含むexplicit relation優先の関連問い取得
- Core／Domain／Local Vocabulary contract
- locality、provenance、review state、人間確認境界を保持するmapping claim
- `GET /api/v1/vocabulary/terms`
- `GET /api/v1/vocabulary/mappings`
- search／context exploration frontend ViewModelとHTML renderer
- fixed reference dataset、ranking／filter regression、replay-equivalence validation
- canonical `provenance.sources[]`とpublication human review decisionの検索projection対応

### Reuse path

```text
Canonical storage
  → rebuildable FTS5 projection
  → lexical search / structured filter / facet
  → exact identity / explicit relation / related candidate
  → canonical detail / context / provenance / lineage
  → optional human-reviewed derivation workflow
```

### Architectural boundary

- Canonical storageが正本
- FTS5は削除・再構築可能なderived projection
- search failureはingest、persistence、review、publicationを停止しない
- lexical similarity、context overlap、semantic relation、Vocabulary mappingからidentityを自動統合しない
- local termはshared termへsilent normalizationしない
- mapping claimはsource／target、relation、locality、provenance、review stateを保持する
- 既存の`draft → in_review → approved → published`境界を変更しない

### Validation

- protocol Vocabulary contract
- FTS5 projection mapping、primary／summary search、filter、facet、upsert
- canonical `provenance.sources[]` transport／source indexing
- publication human review-state indexing
- search HTTP APIとclassification
- fixed reference ranking／filter dataset
- Vocabulary HTTP API
- outgoing relationとincoming lineage childを含むrelated inquiry API
- replay前後のsearch result／facet同値性
- frontend ViewModel／renderer
- complete workspace regression
- GitHub Actions run #654 succeeded

### Known limitations

- production authentication、authorization、rate limiting、multi-user tenancyは未実装
- FTS5はlexical／structured baselineであり、embedding／vector searchではない
- production RAG、graph inference、大規模graph visualizationは非対象
- automatic identity mergeは行わない
- live external transport availabilityはdefault CIの保証範囲外
- 生成・派生・関連付け・mappingされた問いの農業上の正しさは保証しない

詳細は[`V0.8.0_RELEASE_PLAN.md`](./V0.8.0_RELEASE_PLAN.md)、[`V0.8.0_RELEASE_RUNBOOK.md`](./V0.8.0_RELEASE_RUNBOOK.md)、[`V0.8.0_GITHUB_RELEASE.md`](./V0.8.0_GITHUB_RELEASE.md)を参照してください。

---

## v0.7.0

**Status: released**

v0.7.0は、既存のlineage inspectionを、semantic relationを明示して問いを育てる第一級のauthoring workflowへ拡張するリリースです。

### Release record

- released: 2026-07-21
- tag: `v0.7.0`
- tag target: `79013aad304c0778f49dab67678cbf0ef6ee9fd0`
- GitHub Release title: `Toitoi v0.7.0 — Inquiry Derivation and Genealogy`
- implementation merged to `main` as `b1ba070c1bf9cfc4c21be74a4cd9d4e479640959`

### Highlights

- `derived_from`、`translated_from`、`observed_alongside`、`contrasts_with`、`synthesizes`、`reframes`、`annotates`、`revises`の8 relation
- relation別の入力補助とdeterministic validation
- `POST /api/v1/inquiries/:id/derive`
- 既存inquiryから派生Inquiry Draftを作成するmobile-first UI
- AI relation suggestionとhuman-confirmed relationの分離
- identity、semantic relation、context similarityの視覚的・意味的分離
- transport projection、re-ingest、canonical storage replay後のlineage復元fixture

### Validation

- PR #35 final CI run #525 succeeded
- implementation merged to `main` as `b1ba070c1bf9cfc4c21be74a4cd9d4e479640959`

詳細は[`V0.7.0_RELEASE_PLAN.md`](./V0.7.0_RELEASE_PLAN.md)、[`V0.7.0_RELEASE_RUNBOOK.md`](./V0.7.0_RELEASE_RUNBOOK.md)、[`V0.7.0_GITHUB_RELEASE.md`](./V0.7.0_GITHUB_RELEASE.md)を参照してください。

---
