# Inquiry View Model

**Status: current** | **Target: v0.3.0** | **Last updated: 2026-07-15**

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

`createLineageTreeModel(treeResponse, options)` recursively converts the Standard API lineage tree into a render-oriented tree and a flat node index.

Each node contains:

- `id` and `parentId`
- `text`, `type`, and `createdAt`
- `depth`
- `role`: `root`, `branch`, `leaf`, `cycle`, or `missing`
- `relationToParent`
- provenance summary
- `selected`
- `status`: `available`, `cycle`, or `missing`
- `children`

The returned model also exposes:

- `nodes`: flattened nodes for navigation and detail-panel lookup
- `selectedId`: the canonical ID selected by the user
- `warnings`: cycle and missing-reference diagnostics

Selection is controlled with `{ selectedId }`. If the requested ID is absent, the root becomes selected.

Cycle detection is path-local. A repeated event in a different legitimate branch can still be rendered, while a recursive reference within the same path is terminated as a `cycle` node. Invalid child references become `missing` nodes instead of breaking the entire tree.

## Browser renderer

`lineage_tree_renderer.js` converts a lineage model into escaped, browser-ready HTML.

The renderer provides:

- semantic `tree` / `treeitem` roles
- `aria-level` and `aria-selected`
- `aria-current` on the selected inquiry
- keyboard-reachable inquiry detail links
- relation type, role, provenance, and warning labels
- explicit loading, empty, ready, and error output
- HTML escaping for inquiry text and errors

The renderer remains framework-independent. A later React, Vue, SVG, or canvas implementation may consume the same model without changing the Standard API boundary.

## UI states

The module defines four explicit states:

- `loading`
- `empty`
- `ready`
- `error`

Network code should create a loading model before a request, use the detail/tree adapters for successful responses, and use `createErrorModel()` for failures.

## Validation

`test_inquiry_view_model.js` builds the Golden Path through Nostr ingest, persistence, replay, and the Standard API, then verifies:

- detail data becomes a ready render model
- provenance includes the Nostr source protocol and source event ID
- parent and child references survive the frontend boundary
- the three-level lineage tree preserves depth and node roles
- one selected canonical inquiry is maintained
- relation type is exposed when present
- cycle and missing references are contained and reported

`test_lineage_tree_renderer.js` verifies:

- accessible tree markup
- selected-node navigation
- relation and provenance display
- loading, empty, ready, and error output
- escaping of inquiry text and error messages

Both tests run through the `@toitoi/frontend` workspace `test` script and therefore participate in the root workspace test command.