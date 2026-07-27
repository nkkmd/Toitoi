# Toitoi Release Notes

**Status: current**  
**Language policy:** New public release entries are maintained in English followed by equivalent Japanese. Historical entries retain their existing language.  
**Last synchronized:** 2026-07-23

## v1.0.0 candidate

**Status: implementation candidate in Draft PR #39; not yet publicly released**

### Summary

Toitoi v1.0.0 connects the existing protocol, API, AI, review, offline, transport, search, replay, recovery, and governance foundations into one minimum reference implementation.

The fixed reference scenario begins with an offline observation that weed species differ on the eastern side of a field and follows it through AI inquiry candidates, human annotation review, an Inquiry Draft, independent publication approval, Canonical Event publication, transport delivery state, cross-region discovery, vocabulary mapping, human-confirmed synthesis, replay, backup, restore, and migration verification.

### Highlights

- protocol-independent Canonical Event storage remains authoritative;
- stable Canonical IDs are preserved across publication, transport projection, replay, backup, and restore;
- AI annotation review and publication approval remain separate and independently attributable;
- the mobile/offline Golden Path covers local persistence, sensitive-field acknowledgment, queueing, failed synchronization, explicit retry, and publication;
- FTS5 search, structured filters, context facets, related-inquiry candidates, and replay equivalence are connected to the reference fixture;
- Conformance Suite 1.0.0 validates native v1 input and keeps legacy v0.9 acceptance behind an explicit compatibility profile;
- backup manifest verification, corruption detection, migration plan, dry-run, apply, and derived-state rebuild are covered;
- public entry documents and minimum operational procedures follow the repository documentation language policy;
- automatic identity merge and autonomous AI publication remain prohibited.

### Stable contract notes

- repository release version: `v1.0.0`;
- Canonical Event wire identifier: `schemaVersion: "0.1.0"`;
- Canonical ID form: `tt:evt:<opaque-id>`;
- normative synthesis lineage relation: `synthesizes`;
- Canonical storage is durable and authoritative;
- search indexes, facets, metrics, and health projections are rebuildable derived state.

### Known limitations before publication

- the reference authentication provider is header-based and is not OAuth/OIDC certification;
- the durable queue is a single-node JSONL reference implementation;
- live local-model reproducibility is not established by deterministic fixtures alone;
- the real-participant pilot is recorded as `not yet conducted`;
- hosted environment synchronization and external transport availability require separate verification;
- FTS5 is a lexical and structured baseline, not production vector search or RAG;
- generated, derived, related, or mapped inquiries are not guaranteed to be agriculturally correct.

Publication still requires human review, merge, post-merge validation, hosted-environment verification, release-owner disposition of the pilot limitation, an annotated `v1.0.0` tag, and GitHub Release publication.

Related documents:

- [`V1.0.0_RELEASE_PLAN.md`](./V1.0.0_RELEASE_PLAN.md)
- [`V1.0.0_RELEASE_RUNBOOK.md`](./V1.0.0_RELEASE_RUNBOOK.md)
- [`V1.0.0_GITHUB_RELEASE.md`](./V1.0.0_GITHUB_RELEASE.md)
- [`V1.0.0_RELEASE_RECORD.md`](./V1.0.0_RELEASE_RECORD.md)
- [`V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md`](./V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md)

---

## v1.0.0候補

**状態: Draft PR #39で実装中。まだ公開リリースではありません。**

### 概要

Toitoi v1.0.0は、これまで構築してきたprotocol、API、AI、review、offline、transport、search、replay、recovery、governanceの基盤を、一つの最小reference implementationとして接続します。

固定reference scenarioは、「畑の東側だけ雑草の種類が違う」というoffline observationから始まり、AIによるInquiry候補、人間によるannotation review、Inquiry Draft、独立したpublication approval、Canonical Event公開、transport delivery state、別地域の問いの発見、Vocabulary mapping、人間確認済みsynthesis、replay、backup、restore、migration検証までを一続きに扱います。

### 主な内容

- protocol-independentなCanonical Event storageを正本として維持します。
- publication、transport projection、replay、backup、restoreを通してstable Canonical IDを保持します。
- AI annotation reviewとpublication approvalを分離し、個別に帰属可能にします。
- mobile/offline Golden Pathでlocal persistence、sensitive field確認、queue、同期失敗、明示的retry、publicationを検証します。
- FTS5 search、structured filter、context facet、related-inquiry candidate、replay equivalenceをreference fixtureへ接続します。
- Conformance Suite 1.0.0でnative v1 inputを検証し、legacy v0.9 acceptanceは明示的compatibility profileに限定します。
- backup manifest検証、corruption detection、migration plan、dry-run、apply、derived-state rebuildを検証します。
- 公開入口文書と最小運用手順をrepositoryの文書言語ポリシーに従って管理します。
- automatic identity mergeとautonomous AI publicationは引き続き禁止します。

### Stable contractに関する注意

- repository release version: `v1.0.0`
- Canonical Event wire identifier: `schemaVersion: "0.1.0"`
- Canonical ID形式: `tt:evt:<opaque-id>`
- 正式なsynthesis lineage relation: `synthesizes`
- Canonical storageはdurableかつauthoritativeです。
- search index、facet、metrics、health projectionは再構築可能なderived stateです。

### 公開前に残る既知の制約

- reference authentication providerはheader-basedであり、OAuth/OIDC認定ではありません。
- durable queueはsingle-node JSONLのreference implementationです。
- deterministic fixtureだけではlive local-modelの再現性を証明できません。
- 実参加者pilotは`not yet conducted`として記録されています。
- hosted environment同期とexternal transport availabilityは別途検証が必要です。
- FTS5はlexical／structured baselineであり、production vector searchやRAGではありません。
- generated、derived、related、mapped inquiryの農業上の正しさは保証されません。

公開には、human review、merge、merge後検証、hosted environment確認、pilot limitationに関するrelease-owner判断、annotated `v1.0.0` tag、GitHub Release公開が必要です。

関連文書:

- [`V1.0.0_RELEASE_PLAN.md`](./V1.0.0_RELEASE_PLAN.md)
- [`V1.0.0_RELEASE_RUNBOOK.md`](./V1.0.0_RELEASE_RUNBOOK.md)
- [`V1.0.0_GITHUB_RELEASE.md`](./V1.0.0_GITHUB_RELEASE.md)
- [`V1.0.0_RELEASE_RECORD.md`](./V1.0.0_RELEASE_RECORD.md)
- [`V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md`](./V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md)

---

## Historical release entries

Historical entries retain their existing language and are not rewritten solely for language normalization.

## v0.9.0

**Status: implementation merged / release administration in progress**

v0.9.0は、Toitoiを単独開発向けreference environmentから、小規模な共同利用、障害復旧、外部互換性検証、共同運営手続きへ拡張するreleaseです。

### Implementation record

- implementation PR: [#37](https://github.com/nkkmd/Toitoi/pull/37)
- implementation head: `c064f8966bb96e8904798d670b6ec0e0dc662f31`
- final pre-merge CI: run #719 succeeded
- squash merge commit: `6a8db9022fd1db34bc81b3946c72ae714f4454ae`
- release-record PR: [#38](https://github.com/nkkmd/Toitoi/pull/38)

### Highlights

- role／capability model and separated authority boundaries
- authenticated server mode, stable errors, request IDs, rate limiting, idempotency, and audit records
- durable JSONL queue, restart recovery, dead-letter handling, backup, restore, and migration tooling
- externally runnable `toitoi-conformance` CLI and three-transport semantic fixtures
- governance, compatibility, Vocabulary, moderation, correction, withdrawal, deletion-request, and sensitive-information policies

詳細は[`V0.9.0_RELEASE_PLAN.md`](./V0.9.0_RELEASE_PLAN.md)、[`V0.9.0_RELEASE_RUNBOOK.md`](./V0.9.0_RELEASE_RUNBOOK.md)、[`V0.9.0_GITHUB_RELEASE.md`](./V0.9.0_GITHUB_RELEASE.md)、[`V0.9.0_RELEASE_RECORD.md`](./V0.9.0_RELEASE_RECORD.md)を参照してください。

## v0.8.0

**Status: released**

- released: 2026-07-22
- tag: `v0.8.0`
- tag target: `d04e4354325ebd68f270f844cd7130a47ae4e660`
- implementation PR: [#36](https://github.com/nkkmd/Toitoi/pull/36)
- rebuildable SQLite FTS5 projection, lexical search, structured filters, facets, related inquiry API, Vocabulary contracts, explicit mapping claims, and replay equivalence

詳細は[`V0.8.0_RELEASE_PLAN.md`](./V0.8.0_RELEASE_PLAN.md)、[`V0.8.0_RELEASE_RUNBOOK.md`](./V0.8.0_RELEASE_RUNBOOK.md)、[`V0.8.0_GITHUB_RELEASE.md`](./V0.8.0_GITHUB_RELEASE.md)を参照してください。

## v0.7.0

**Status: released**

- released: 2026-07-21
- tag: `v0.7.0`
- tag target: `79013aad304c0778f49dab67678cbf0ef6ee9fd0`
- implementation merged to `main` as `b1ba070c1bf9cfc4c21be74a4cd9d4e479640959`
- semantic relationを明示して問いを育てるfirst-class authoring workflowを追加

詳細は[`V0.7.0_RELEASE_PLAN.md`](./V0.7.0_RELEASE_PLAN.md)、[`V0.7.0_RELEASE_RUNBOOK.md`](./V0.7.0_RELEASE_RUNBOOK.md)、[`V0.7.0_GITHUB_RELEASE.md`](./V0.7.0_GITHUB_RELEASE.md)を参照してください。
