# Inquiry Draft Contract

**Status: current** | **Schema version: 0.1.0** | **Target: v0.3.0**

## Purpose

An Inquiry Draft is a pre-publication object used to prepare and review an inquiry before it becomes a Canonical Event.

It is intentionally separate from the Canonical Event contract:

- an Inquiry Draft represents editable workflow state;
- a Canonical Event represents a published, transport-independent record;
- review status must not be embedded into the inquiry's semantic body;
- only an approved draft may cross the publication boundary.

## Identifier

Draft identifiers use `tt:draft:<opaque-id>`. The identifier is local to the draft workflow and must not be reused as the published Canonical Event ID.

## States

| State | Meaning | Allowed next states |
|---|---|---|
| `draft` | Editable and not yet submitted | `in_review` |
| `in_review` | Waiting for an explicit human decision | `approved`, `rejected` |
| `approved` | Approved for publication | publication boundary only |
| `rejected` | Returned by a human reviewer | `in_review` after revision |

## Candidate payload

`candidate` contains the semantic fields that can later contribute to a Canonical Event:

- `type`, fixed to `inquiry`
- `body`
- optional `contexts`
- optional `relationships`
- optional `phase`, `trigger`, `dsl`, `lineage`, `labels`, and `meta`

The candidate must not contain published-record fields: Canonical Event `id`, Canonical Event `createdAt`, or `provenance`. These are assigned when an approved draft is published.

## Human review record

An approval or rejection records `decision`, opaque `reviewerId`, `reviewedAt`, and an optional note. Authentication and reviewer authorization remain outside this contract, but an implementation must record the human identity presented by its trust boundary.

## Derived inquiry draft

`createDerivedInquiryDraft()` creates an Inquiry Draft connected to an existing Canonical Event. It requires:

- `sourceInquiryId` using the `tt:evt:<opaque-id>` form
- one fixed `relationType`
- the editable inquiry candidate
- optional author and AI involvement metadata

The v0.3.0 derivation types are:

- `derived_from`
- `translated_from`
- `annotates`
- `reframes`
- `revises`
- `synthesizes`

The function appends the semantic edge to `candidate.lineage` as `{ "type": relationType, "target": sourceInquiryId }`. Workflow metadata is kept separately under `draft.derivation` and does not replace the Canonical Event lineage edge.

## Publication boundary

`assertPublishableInquiryDraft()` enforces the minimum rule:

> Only an `approved` Inquiry Draft can provide a candidate payload for publication.

`publishApprovedDerivedInquiry()` additionally requires a Canonical Event ID, publisher identity, and publication timestamp. It produces a Canonical Event that contains:

- the reviewed candidate fields
- canonical `id`, `schemaVersion`, and `createdAt`
- the lineage edge to the source inquiry
- a replayable provenance source
- `meta.publication` with draft ID, publisher, source inquiry, relation type, author, AI involvement, and the human review record

Review metadata remains operational provenance, not semantic inquiry content. Approval does not itself deliver the event to a transport.

## Transport projection

After publication:

1. Nostr projection resolves the Canonical Event lineage target through a lineage map and emits an `e` tag whose marker is the relation type.
2. Lingonberry projection copies the canonical lineage and publication metadata.
3. Retrieval and re-ingest must preserve the semantic lineage edge; transport delivery outcomes are recorded separately.

## Files

| Contract | Path |
|---|---|
| JSON Schema | `schemas/inquiry-draft.schema.json` |
| Draft runtime | `packages/protocol/inquiry_draft.js` |
| Derived inquiry runtime | `packages/protocol/derived_inquiry.js` |
| Draft tests | `packages/protocol/test_inquiry_draft.js` |
| Derived inquiry tests | `packages/protocol/test_derived_inquiry.js` |
