# Toitoi v1 Contract Index

**Status: reviewed candidate freeze** | **Release: v1.0.0** | **Last updated: 2026-07-22**

## Purpose

This index identifies the observable contracts that the Toitoi v1.0.0 reference implementation intends to stabilize. It does not freeze private module layout, internal helper names, storage-engine choices, or deployment-specific authentication providers.

A contract is considered frozen only after its normative document, machine-verifiable assets, compatibility behavior, and release validation are complete.

## Contract set

| Contract | Normative source | Machine-verifiable assets | Compatibility boundary | Authority boundary |
|---|---|---|---|---|
| Canonical Event v1 | `schemas/canonical-event.schema.json`, `docs/protocols/CANONICAL_EVENT.md` | `packages/protocol/test_canonical_event_schema.js`, `packages/protocol/test_v1_reference_fixture.js`, Conformance fixtures | Canonical IDs and meaning survive transport projection and replay; unknown top-level fields remain forward-compatible unless explicitly prohibited | Transport payloads and external identity claims do not replace Canonical identity |
| Standard API v1 | `apps/api/README.md`, observable `/api/v1/*` behavior | API HTTP, authority, pagination, idempotency, search, workflow, and health tests | Stable JSON error codes, request IDs, cursor-compatible pagination, and idempotent mutation behavior | Authentication, actor capability, review, publication, moderation, and operator authority remain distinct |
| Inquiry Draft and publication workflow v1 | workflow documentation in `apps/api/README.md` and release plans | workflow service, HTTP mutation, publication-guard, offline Golden Path, and v1 reference tests | Draft state transitions and publication results remain observable; migration must not imply approval | AI annotation acceptance is not publication approval; publication requires independent human review |
| Lineage and semantic relation vocabulary v1 | `packages/protocol/derived_inquiry.js` and this index | derivation validation, genealogy, transport re-ingest, schema guidance, and v1 fixture tests | Relation names retain meaning; similarity and mappings cannot merge Canonical identity | AI may suggest a relation, but a human confirms the relation used for publication |
| Provenance contract v1 | Canonical Event schema and provenance documentation | schema tests, storage/replay tests, Conformance provenance/rawRef checks | Source references, raw references, model/prompt metadata, human decisions, and replay lineage remain traceable | Provenance records involvement and evidence; it does not make AI output or a transport authoritative |
| Transport adapter contract v1 | protocol adapter modules and transport documentation | Nostr, Lingonberry, and ATProto round-trip fixtures; Conformance Suite | Semantic meaning and Canonical ID survive projection/re-ingest; transport-only fields remain transport scoped | Delivery failure changes delivery status but does not invalidate Canonical persistence |
| AI annotation contract v1 | `packages/ai/annotation.js` and AI adoption/release documentation | AI foundation, recovery, inquiry-generation, review, promotion, and reference fixture tests | Provider-neutral normalized output, raw output, model version, prompt version, timestamps, and failure state remain auditable | AI runs after persistence and cannot publish, approve, moderate, or merge identity autonomously |
| Conformance Suite v1 | Conformance CLI and governance compatibility policy | externally runnable CLI, shared fixtures, JSON report, process exit code | Tests observable contracts without importing private application modules | Passing conformance establishes interoperability only; it does not grant governance authority or agronomic correctness |

## Canonical Event wire version decision

The repository release is `v1.0.0`, while the Canonical Event wire-schema identifier remains `schemaVersion: "0.1.0"`.

This is an intentional compatibility decision:

- `v1.0.0` identifies the repository release and integrated reference implementation;
- `0.1.0` identifies the existing Canonical Event wire shape;
- no field-level wire migration is justified solely to make the two numbers match;
- readers and writers must not infer repository release compatibility from the embedded schema value alone;
- any future wire-schema change requires migration fixtures, reader/writer behavior, compatibility documentation, and Conformance coverage.

The schema `$id` remains under `/schemas/v1/` because it is the Canonical Event contract exposed by the repository v1 release. The embedded value remains `0.1.0` to avoid silently relabeling existing append-only records.

## Normative lineage vocabulary

The v1 derivation vocabulary is:

1. `derived_from`
2. `translated_from`
3. `observed_alongside`
4. `contrasts_with`
5. `synthesizes`
6. `reframes`
7. `annotates`
8. `revises`

`synthesis` is an event `type`, not the normative lineage relation spelling. A synthesis event uses `synthesizes` lineage edges when it combines source inquiries.

New relation names require the documented vocabulary-change process. Similarity, search classification, or vocabulary mapping does not create a lineage relation automatically.

## Cross-contract invariants

1. Canonical storage is the source of truth.
2. Raw observation data and externally published Canonical Events remain separately controlled.
3. Authentication identity, actor identity, transport identity, and Canonical Event identity remain distinct.
4. Annotation acceptance, relation confirmation, publication approval, moderation, and operator authority remain separate auditable decisions.
5. Search indexes, queue indexes, facets, metrics, and health views are rebuildable derived state.
6. Similarity, vocabulary mappings, and semantic relations do not automatically merge Canonical identity.
7. Offline capture does not imply synchronization, publication, or transport delivery.
8. Transport failure does not invalidate Canonical persistence.
9. Unknown-field handling, deprecation, and migration follow the governance compatibility policy.
10. Model output is a reviewable proposal, not a claim of agronomic correctness.

## Required and optional Canonical Event fields

Required by the v1 schema:

- `id`
- `schemaVersion`
- `type`
- `createdAt`
- `body`
- `provenance`

Optional contract fields include:

- `contexts`
- `relationships`
- `phase`
- `trigger`
- `dsl`
- `lineage`
- `identityClaims`
- `rawRef`
- `labels`
- `meta`

Top-level extension fields are tolerated for forward compatibility. Closed nested objects such as `body`, `provenance`, and `rawRef` reject unknown properties. `contexts` and `meta` remain explicitly extensible.

## Unknown fields and extensions

- Unknown Canonical Event top-level fields are tolerated according to the JSON Schema and migration policy.
- Closed nested objects reject unknown fields where the schema declares `additionalProperties: false`.
- `contexts` and `meta` allow extension fields by design.
- Transport-specific extensions stay outside the Canonical semantic contract unless promoted through the Canonical Event change process.
- Private implementation metadata must not become required for external conformance.

## Deprecation and migration

A v1 field or behavior may be deprecated only through the documented governance process. Deprecation must identify:

- the replacement or removal rationale;
- compatibility duration;
- reader and writer behavior;
- migration plan and fixtures;
- Conformance impact;
- treatment of historical append-only records.

The explicit `v0.9.0` Conformance compatibility profile is a migration boundary. Passing that profile does not mean the input is a native v1 Canonical Event.

## Freeze checklist

- [x] every normative source is current and linked from the root README
- [x] required and optional fields are explicit
- [x] unknown-field and closed-object behavior are machine-checked
- [x] authority and human-review boundaries are tested
- [x] all three transport round trips preserve meaning in deterministic fixtures
- [x] replay equivalence is tested
- [x] migration plan, dry-run, apply, and recorded version behavior are verified
- [x] external Conformance execution produces a machine-readable report
- [x] the v1 reference scenario exercises each contract
- [x] known limitations are published
- [x] repository release version and wire-schema version are explicitly distinguished
- [x] lineage relation spelling is synchronized with the implementation vocabulary

Repository-controlled contract-review items are complete. Release administration, real-participant evidence, live local-model evidence, hosted-environment synchronization, and release-owner decisions are tracked separately.

## Non-contractual implementation details

The following are deliberately not frozen by v1.0.0:

- internal package or file layout;
- choice of SQLite, JSONL, or replacement adapters behind the same observable contract;
- development authentication headers;
- process-local rate limiter or idempotency-store implementation;
- deterministic CI provider internals;
- UI styling that does not change required state visibility or decision boundaries.
