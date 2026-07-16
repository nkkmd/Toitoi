# AGENTS.md

This file defines the working rules for coding agents and automated contributors in the Toitoi repository.

## Repository purpose

Toitoi is an experimental, protocol-independent digital commons for circulating and evolving inquiries. Preserve the separation between semantic Canonical Events and protocol-specific transport representations.

Core principles:

- inquiries, not universal prescriptions, are the primary knowledge unit
- local context must not be erased
- contextual similarity must not be treated as canonical identity
- provenance and lineage must remain traceable
- AI may assist drafting and interpretation, but publication requires explicit human review
- transport-specific details must not leak into protocol-independent contracts without a documented reason

## Start by reading the repository

Before changing implementation, inspect the relevant current documents and code rather than relying on historical assumptions.

Recommended entry points:

- `README.md`
- `docs/roadmap/IMPLEMENTATION_PLAN.md`
- the current version release plan under `docs/roadmap/`
- `docs/protocols/CANONICAL_EVENT.md`
- `docs/protocols/INQUIRY_DRAFT.md`
- `docs/concepts/CANONICAL_IDENTITY_AND_PROVENANCE.md`
- the README in the application or package being changed

When documentation and implementation disagree, verify the executable behavior and update the authoritative documentation in the same work item.

## Work from an issue-sized scope

Prefer one focused issue or clearly bounded outcome per pull request.

For each task:

1. identify the user-visible or contract-level acceptance criteria
2. locate the existing boundary where the behavior belongs
3. implement the smallest coherent change across that boundary
4. add or update deterministic tests
5. update affected documentation
6. verify the complete workflow, not only isolated helpers

Avoid opportunistic refactors unless they are required to preserve the contract being changed.

## Preserve architectural boundaries

Use the existing layers consistently:

```text
Edge / local observation
  → Inquiry Draft
  → human review
  → Canonical Event
  → protocol converter
  → transport
  → raw and canonical storage
  → replay / derived index
  → Standard API
  → frontend view models
```

General placement rules:

- semantic contracts belong in `packages/protocol/`
- protocol conversion and ingest logic belong in `packages/<protocol>/`
- operational transport code belongs in `infra/transports/<protocol>/`
- canonical API projection belongs in `apps/api/`
- presentation mapping and renderers belong in `apps/frontend/`
- cross-layer behavior must be validated by an explicit end-to-end or Golden Path test

Do not implement the same semantic rule separately in multiple transports when it can be expressed once in the protocol layer.

## Identity, provenance, and lineage rules

Treat these concepts separately:

- canonical identity answers whether two records represent the same canonical event
- provenance records where a representation came from and how it was processed
- lineage records semantic derivation between inquiries
- context similarity is an exploration signal, not an identity rule

When matching lineage after transport re-ingest, consider both canonical event IDs and transport source IDs available through provenance. Do not silently infer identity from similar text, labels, timestamps, or contexts.

## Human-reviewed publication

Derived inquiries must use the Inquiry Draft workflow.

Expected workflow:

```text
draft
  → in_review
  → approved / rejected
```

Only explicitly approved drafts may be published as Canonical Events. Preserve semantic derivation in `Canonical Event.lineage` and workflow audit information in `meta.publication`.

Do not introduce unattended AI publication.

## Testing expectations

Run the most focused tests during implementation, then run the workspace suite before merge.

```bash
corepack pnpm install
corepack pnpm test
```

A feature is not complete when only unit helpers pass. Add a deterministic cross-feature test when behavior crosses protocol, transport, storage, replay, API, or frontend boundaries.

Golden Path tests should verify observable state transitions and guard conditions, including rejection paths. Avoid assumptions based on incidental identifier formatting; assert against canonical IDs, provenance source IDs, or documented contracts as appropriate.

External relay or carrier availability must not be required for default CI. Live checks must be opt-in and environment-configured.

## Pull request workflow

Unless the user explicitly requests a direct main-branch documentation update:

1. create a focused branch
2. commit only related files
3. open a pull request with scope, rationale, and validation
4. wait for CI to complete successfully
5. inspect failures as potential contract defects, not merely test defects
6. fix the underlying implementation when a test exposes a real boundary mismatch
7. squash-merge after CI succeeds

Do not merge while required CI is pending or failing.

For release work, keep the tracking issue and release documentation synchronized with merged implementation work.

## Documentation maintenance

Documentation is part of the release artifact.

Whenever behavior changes, review at minimum:

- root `README.md`
- the affected app or package README
- current release plan
- `docs/roadmap/RELEASE_NOTES.md`
- release runbook and GitHub Release content when preparing a release

Separate implemented behavior from future design ideas. Do not describe a planned production GUI, authentication system, semantic search, graph inference, offline synchronization, or unattended AI publication as complete unless executable code and tests support the claim.

Use consistent terms:

- `inquiry` for protocol and implementation concepts
- Canonical Event for protocol-independent semantic records
- Inquiry Draft for pre-publication workflow records
- transport for Nostr, Lingonberry, ATProto, and future carriers

## Release readiness

Before tagging a release:

1. confirm all mandatory release issues are complete
2. run the default workspace CI on the final release commit
3. verify the cross-feature Golden Path
4. audit root, API, frontend, protocol, roadmap, runbook, and release-note documents
5. confirm known limitations are stated explicitly
6. prepare the GitHub Release body from repository-maintained release content
7. create the tag only from the verified main-branch commit

A release candidate is not a final release until the tag and GitHub Release are created.

## Change quality

Prefer precise, conservative changes over speculative expansion.

Before finishing, check:

- no unrelated files were changed
- links and paths are valid
- terminology matches current contracts
- tests cover success and rejection paths
- transport projection can be re-ingested and replayed where applicable
- documentation describes the implementation that actually exists
- known limitations remain visible
