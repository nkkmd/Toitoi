# Toitoi Release Notes

**Status: current** | **Last updated: 2026-07-22**

この文書は、Toitoiの公開基準点をrelease単位で記録します。

---

## v0.9.0

**Status: implementation merged / release administration in progress**

v0.9.0は、Toitoiを単独開発向けreference environmentから、小規模な共同利用、障害復旧、外部互換性検証、共同運営手続きへ拡張するreleaseです。

### Implementation record

- implementation PR: [#37](https://github.com/nkkmd/Toitoi/pull/37)
- implementation head: `c064f8966bb96e8904798d670b6ec0e0dc662f31`
- final pre-merge CI: run #719 succeeded
- squash merge commit: `6a8db9022fd1db34bc81b3946c72ae714f4454ae`
- release-record PR: [#38](https://github.com/nkkmd/Toitoi/pull/38)
- tag: pending release administration
- GitHub Release: pending release administration

### Highlights

#### API and authority

- `reader`、`contributor`、`reviewer`、`publisher`、`moderator`、`operator`のrole／capability model
- authentication identity、actor identity、transport identity、Canonical Event identityの分離
- `TOITOI_AUTH_REQUIRED=true`による認証強制server mode
- stable JSON error envelopeとrequest ID
- fixed-window rate limiting
- mutation idempotencyと`idempotency_conflict`
- hash-chained append-only audit records
- `GET /health/live`
- `GET /health/ready`
- operator-only `GET /api/v1/audit`

#### Durable single-node operation

- JSONL durable queue
- restart recovery
- bounded retry
- dead-letter handling
- graceful shutdown
- relative path、size、SHA-256を持つbackup manifest
- restore verificationとcorruption detection
- migration plan、dry-run、target version、apply
- single-node recovery runbook

#### Conformance Suite

- externally runnable `toitoi-conformance` CLI
- Canonical Event required-field validation
- Canonical ID preservation
- provenance／rawRef responsibility separation
- semantic transport round-trip validation
- live-ingest／replay equivalence
- machine-readable JSON reportとexit code
- Nostr／Lingonberry／ATProto fixed fixture

#### Governance

- TIP proposal／discussion／adoption process
- schema versioning、compatibility、deprecation policy
- Vocabulary change process
- moderation principles
- local／traditional／community knowledge protection
- location、personal、confidential information handling
- correction、withdrawal、deletion-requestとappend-only storageの関係

### Architectural boundaries

- Canonical storageが正本
- search index、queue index、metrics、health viewはrebuildable derived state
- actor identityとCanonical Event identityを統合しない
- annotation acceptance、relation confirmation、publication approval、moderation、operator authorityを別判断として扱う
- transport failureはCanonical persistenceを無効化しない
- Conformance Suiteはprivate implementationではなくobservable contractを検証する
- automatic identity merge、autonomous AI publication、distributed consensusは導入しない

### Validation

- authority separation
- stable errors and request IDs
- idempotency replay and conflict
- deterministic rate limiting
- audit integrity
- health endpoints
- durable queue recovery and dead-letter handling
- backup verification and corruption detection
- migration planning and application
- Conformance CLI behavior
- three-transport semantic fixture
- replay equivalence
- complete v0.8.0 and earlier workspace regression
- GitHub Actions run #719 succeeded

### Known limitations

- reference authentication is header-based and not OAuth／OIDC certified
- durable queue is single-node JSONL rather than distributed
- idempotency store and rate limiter are reference-process components unless replaced by deployment-specific durable adapters
- live external transport and model availability are outside default deterministic CI
- FTS5 remains a lexical／structured baseline rather than embedding／vector search
- production RAG、graph inference、automatic identity mergeは非対象
- generated、derived、related、mapped inquiriesの農業上の正しさは保証しない

詳細は[`V0.9.0_RELEASE_PLAN.md`](./V0.9.0_RELEASE_PLAN.md)、[`V0.9.0_RELEASE_RUNBOOK.md`](./V0.9.0_RELEASE_RUNBOOK.md)、[`V0.9.0_GITHUB_RELEASE.md`](./V0.9.0_GITHUB_RELEASE.md)、[`V0.9.0_RELEASE_RECORD.md`](./V0.9.0_RELEASE_RECORD.md)を参照してください。

---

## v0.8.0

**Status: released**

v0.8.0は、蓄積されたCanonical Eventを語句、文脈、relation、transport、provenance、review state、地域語彙から探索し、問いの再利用へ接続するreleaseです。

### Release record

- released: 2026-07-22
- tag: `v0.8.0`
- tag target: `d04e4354325ebd68f270f844cd7130a47ae4e660`
- GitHub Release title: `Toitoi v0.8.0 — Search, Vocabulary, and Reuse`
- implementation PR: [#36](https://github.com/nkkmd/Toitoi/pull/36)
- final pre-merge CI: run #654 succeeded

### Highlights

- rebuildable SQLite FTS5 projection
- lexical search、structured filter、facet
- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- Core／Domain／Local Vocabulary contract
- explicit mapping claim and no automatic identity merge
- fixed reference ranking／filter dataset and replay equivalence

詳細は[`V0.8.0_RELEASE_PLAN.md`](./V0.8.0_RELEASE_PLAN.md)、[`V0.8.0_RELEASE_RUNBOOK.md`](./V0.8.0_RELEASE_RUNBOOK.md)、[`V0.8.0_GITHUB_RELEASE.md`](./V0.8.0_GITHUB_RELEASE.md)を参照してください。

---

## v0.7.0

**Status: released**

v0.7.0は、semantic relationを明示して問いを育てるfirst-class authoring workflowを追加したreleaseです。

- released: 2026-07-21
- tag: `v0.7.0`
- tag target: `79013aad304c0778f49dab67678cbf0ef6ee9fd0`
- implementation merged to `main` as `b1ba070c1bf9cfc4c21be74a4cd9d4e479640959`
- final CI: run #525 succeeded

詳細は[`V0.7.0_RELEASE_PLAN.md`](./V0.7.0_RELEASE_PLAN.md)、[`V0.7.0_RELEASE_RUNBOOK.md`](./V0.7.0_RELEASE_RUNBOOK.md)、[`V0.7.0_GITHUB_RELEASE.md`](./V0.7.0_GITHUB_RELEASE.md)を参照してください。
