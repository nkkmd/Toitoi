# Toitoi Governance and Compatibility Process

## Scope

This document defines how Toitoi changes shared contracts while protecting interoperability, provenance, local vocabulary, and community knowledge.

## Decision principles

- preserve the Golden Path and human review boundaries
- prefer reversible, fixture-backed changes
- keep Canonical identity separate from similarity and vocabulary mapping
- preserve local terms and provenance instead of silently normalizing them
- document operational and social consequences, not only code changes
- require explicit migration and compatibility behavior

## Toitoi Improvement Proposal (TIP)

A change requires a TIP when it affects any of the following:

- Canonical Event fields or semantics
- stable Standard API contracts
- semantic relation vocabulary
- provenance, lineage, review, publication, or moderation contracts
- transport adapter semantics
- Conformance Suite requirements
- shared Core or Domain Vocabulary

A TIP contains:

1. title, author, status, and discussion link
2. problem and affected users or communities
3. proposed observable contract
4. alternatives considered
5. privacy, safety, and knowledge-rights impact
6. compatibility and migration plan
7. fixtures and conformance changes
8. rollout, rollback, and deprecation plan

TIP states are `draft`, `discussion`, `accepted`, `rejected`, `withdrawn`, and `implemented`.

## Adoption

A TIP may be accepted when:

- the proposal has a complete compatibility analysis
- maintainers have reviewed implementation and governance impact
- affected local or domain vocabulary maintainers have an opportunity to respond
- required fixtures and Conformance Suite changes exist
- unresolved risks are documented

Urgent security fixes may use an expedited path, but must receive a retrospective TIP before the next release.

## Schema versioning

- additive optional fields are backward-compatible when unknown fields remain safely preserved or ignored
- changing field meaning is breaking even when JSON shape is unchanged
- removing or making an optional field required is breaking
- breaking changes require a new major contract version
- migrations must be deterministic, auditable, and fixture-backed
- unknown fields must not be silently discarded during transport round trips where preservation is part of the adapter contract

## Deprecation

A deprecated field remains readable for at least one documented compatibility window. Deprecation documentation must identify the replacement, migration behavior, loss risks, and earliest removal version.

## Vocabulary governance

- Core Vocabulary changes require a TIP
- Domain Vocabulary changes require review from relevant domain maintainers or documented consultation
- Local Vocabulary remains controlled by its originating community or steward
- mappings are explicit claims with provenance and review state
- a mapping never erases the local label or automatically merges identity
- contested mappings may coexist when their provenance and status remain visible

## Moderation governance

Moderation decisions must identify actor, authority, target, reason category, timestamp, outcome, and appeal or correction path. Moderation must not be represented as a scientific truth determination.

## Corrections, withdrawal, and deletion requests

Append-only storage preserves historical integrity, but public presentation and delivery may change through auditable events:

- correction: a new event revises or annotates the earlier record
- withdrawal: the record remains traceable but is excluded from ordinary discovery and reuse
- restricted access: sensitive payload presentation is limited while provenance and action history remain auditable
- deletion request: operators apply the documented legal and safety procedure, recording what was removed, retained, or cryptographically tombstoned where permitted

No interface may imply that a withdrawn or restricted record never existed when audit and lineage contracts require its history.

## Release responsibility

Each minor or major release records:

- accepted TIPs
- schema and API compatibility status
- migrations
- new or deprecated fields
- Conformance Suite version
- governance and privacy changes
- known limitations and unresolved risks
