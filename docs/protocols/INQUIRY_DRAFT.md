# Inquiry Draft Contract

**Status: experimental** | **Schema version: 0.1.0** | **Target: v0.2.0**

## Purpose

An Inquiry Draft is a pre-publication object used to prepare and review an inquiry before it becomes a Canonical Event.

It is intentionally separate from the Canonical Event contract:

- an Inquiry Draft represents editable workflow state;
- a Canonical Event represents a published, transport-independent record;
- review status must not be embedded into a published event as if it were part of the inquiry's semantic content;
- only an approved draft may cross the publication boundary.

## Identifier

Draft identifiers use the following form:

```text
 tt:draft:<opaque-id>
```

The identifier is local to the draft workflow and must not be reused as the published Canonical Event ID.

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

The candidate must not contain published-record fields:

- Canonical Event `id`
- Canonical Event `createdAt`
- `provenance`

These fields are assigned or derived when the approved draft is published through a transport workflow.

## Human review record

An approval or rejection contains:

```json
{
  "decision": "approved",
  "reviewerId": "human:nkkmd",
  "reviewedAt": "2026-07-13T08:10:00.000Z",
  "note": "Observation and wording confirmed."
}
```

`reviewerId` is deliberately opaque. Authentication and reviewer authorization are outside the v0.2.0 contract, but implementations must record the human identity presented by their trust boundary.

## Publication boundary

`assertPublishableInquiryDraft()` enforces the minimum rule:

> Only an `approved` Inquiry Draft can provide a candidate payload for publication.

Approval does not itself publish an event. A later publisher is responsible for:

1. assigning the Canonical Event identity and timestamp;
2. adding provenance;
3. projecting the event into Nostr, Lingonberry, ATProto, or another transport;
4. recording delivery outcomes.

## Files

| Contract | Path |
|---|---|
| JSON Schema | `schemas/inquiry-draft.schema.json` |
| Runtime utility | `packages/protocol/inquiry_draft.js` |
| Contract tests | `packages/protocol/test_inquiry_draft.js` |
