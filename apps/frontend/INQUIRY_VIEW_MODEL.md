# Inquiry View Model

**Status: current** | **Target: v0.3.0** | **Last updated: 2026-07-15**

`inquiry_view_model.js` is the framework-independent boundary between the Standard API and the frontend rendering layer.

It does not fetch data, own transport details, or prescribe a UI framework. It converts stable Standard API response shapes into render-oriented models that React, Vue, plain DOM code, or a native wrapper can consume.

## Inputs

- `GET /api/v1/inquiries/:id/detail`
- `GET /api/v1/inquiries/:id/tree`
- `GET /api/v1/inquiries/query?climate_zone=...`
- `GET /api/v1/inquiries/query?soil_type=...`
- `GET /api/v1/inquiries/query?farming_context=...`
- `GET /api/v1/inquiries/query?crop_family=...`

## Detail model

`createInquiryDetailModel()` exposes inquiry text and language, canonical ID, contexts, relationships, trigger, phase, provenance, parent/child references, and canonical identity summary.

The model deliberately uses the Standard API canonical view. It does not expose Nostr tags, Lingonberry carrier fields, or any other transport-specific projection.

## Lineage model

`createLineageTreeModel(treeResponse, options)` recursively converts the Standard API lineage tree into a render-oriented tree and a flat node index.

Each node contains `id`, `parentId`, text, type, timestamp, depth, role, relation to parent, provenance, selection state, availability status, and children. Roles are `root`, `branch`, `leaf`, `cycle`, or `missing`.

The returned model also exposes flattened nodes, the selected canonical ID, and cycle/missing-reference warnings. Cycle detection is path-local and invalid child references are contained instead of breaking the entire tree.

## Lineage browser renderer

`lineage_tree_renderer.js` converts a lineage model into escaped, browser-ready HTML with semantic `tree` / `treeitem` roles, keyboard-reachable detail links, relation/provenance labels, and explicit loading, empty, ready, and error states.

## Context exploration model

`context_exploration_model.js` converts a Standard API query response into a comparison-oriented model.

Supported first-class context criteria are:

- `climate_zone`
- `soil_type`
- `farming_context`
- `crop_family`

The model exposes:

- the criteria currently selected by the user
- result count and canonical inquiry results
- matched criteria per inquiry
- context values that differ between results
- relationship and provenance summaries
- comparison columns shared by the result set
- explicit loading, empty, ready, and error states

At least one context criterion is required. Related inquiries are never treated as the same canonical event merely because contexts overlap. The model declares `identityMerge: false` and `interpretation: related-by-context` to keep discovery separate from identity resolution.

## Context exploration renderer

`context_exploration_renderer.js` produces escaped, browser-ready HTML containing:

- selected context filters
- an accessible, keyboard-scrollable comparison table
- links from each result to its inquiry detail
- provenance protocol summaries
- an explicit notice that context similarity does not imply canonical identity
- loading, empty, ready, and invalid/error output

## UI states

The frontend contracts use four explicit states:

- `loading`
- `empty`
- `ready`
- `error`

## Validation

`test_inquiry_view_model.js` verifies detail, provenance, references, lineage depth, node roles, selection, relation types, and malformed-reference containment.

`test_lineage_tree_renderer.js` verifies accessible tree markup, selected-node navigation, relation/provenance display, UI states, and HTML escaping.

`test_context_exploration.js` builds the Golden Path through ingest, persistence, replay, and Standard API query handling, then verifies:

- one or more context filters return canonical inquiry results
- selected filters remain visible in the render model
- differing context values can be compared
- no-result and invalid-condition states are explicit
- inquiry detail navigation is present
- related results are not automatically identity-merged
- user-controlled text is HTML-escaped

All tests run through the `@toitoi/frontend` workspace `test` script and participate in the root workspace test command.
