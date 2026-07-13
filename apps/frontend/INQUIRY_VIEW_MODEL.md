# Inquiry View Model

**Status: current** | **Target: v0.2.0**

`inquiry_view_model.js` is the framework-independent boundary between the Standard API and the frontend rendering layer.

It does not fetch data, own transport details, or prescribe a UI framework. It converts stable Standard API response shapes into render-oriented models that React, Vue, plain DOM code, or a native wrapper can consume.

## Inputs

- `GET /api/v1/inquiries/:id/detail`
- `GET /api/v1/inquiries/:id/tree`

## Detail model

`createInquiryDetailModel()` exposes:

- inquiry text and language
- canonical ID and semantic type
- contexts as ordered key/value items
- relationships as source/target items
- trigger and phase
- provenance protocol names and source IDs
- parent and child inquiry references
- canonical identity summary

The model deliberately uses the Standard API canonical view. It does not expose Nostr tags, Lingonberry carrier fields, or any other transport-specific projection.

## Lineage model

`createLineageTreeModel()` recursively converts the Standard API lineage tree into nodes containing:

- `id`
- `text`
- `type`
- `depth`
- `children`

This is the minimal contract needed for a list, nested tree, SVG graph, or canvas visualization.

## UI states

The module defines four explicit states:

- `loading`
- `empty`
- `ready`
- `error`

Network code should create a loading model before a request, use the detail/tree adapters for successful responses, and use `createErrorModel()` for failures.

## Validation

`test_inquiry_view_model.js` builds the v0.2.0 Golden Path through Nostr ingest, persistence, replay, and the Standard API, then verifies that:

- detail data becomes a ready render model
- provenance includes the Nostr source protocol and source event ID
- parent and child references survive the frontend boundary
- the three-level lineage tree preserves depth
- loading, empty, and error states are explicit
