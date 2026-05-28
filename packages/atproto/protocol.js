'use strict';

const {
  createProtocolDescriptor,
  createCapability,
  createProtocolRegistry,
  renderCapabilityRows,
} = require('@toitoi/protocol');
const {
  canonicalizeAtProtoRecord,
  classifyEvent,
  dedupeKey,
  normalizeAtProtoRecord,
  sortByTransportOrder,
  validateAtProtoRecord,
  verifyAtProtoRecord,
} = require('./adapter/atproto_adapter');
const { ingestAtProtoEvents } = require('./adapter/ingest_pipeline');
const {
  convertCanonicalToAtProtoDraft,
  convertCanonicalToBskyFeedPostDraft,
  fromTransportToCanonicalAtProto,
} = require('./converter/canonical_to_atproto_converter');

function notImplemented(label) {
  return () => {
    throw new Error(`${label} is not implemented yet`);
  };
}

function createAtProtoProtocolDescriptor() {
  return createProtocolDescriptor({
    protocol: 'atproto',
    name: 'ATProto',
    adapter: {
      validateRawEvent: validateAtProtoRecord,
      verifyRawEvent: verifyAtProtoRecord,
      normalizeRawEvent: normalizeAtProtoRecord,
      canonicalizeRawEvent: canonicalizeAtProtoRecord,
      classifyRawEvent: classifyEvent,
      ingestRawEvents: ingestAtProtoEvents,
      ingestFromRelayUrl: notImplemented('ATProto ingestFromRelayUrl'),
      describe: () => ({
        protocol: 'atproto',
        sourceKind: 'custom record',
        dedupeKeyStrategy: 'uri',
        orderingStrategy: 'indexedAt + uri',
      }),
    },
    converter: {
      toTransport: convertCanonicalToAtProtoDraft,
      fromTransport: fromTransportToCanonicalAtProto,
      describe: () => ({
        protocol: 'atproto',
        projection: 'canonical -> atproto custom record draft (+ app.bsky.feed.post compatibility)',
      }),
    },
    capabilities: {
      rawAcquisition: createCapability('partial', 'mock raw ingest and replay are implemented; live write is gated'),
      identityVerification: createCapability('partial', 'DID and repository metadata are preserved, but no live auth flow is wired'),
      ordering: createCapability('partial', 'indexedAt and URI are normalized into observational order only'),
      deleteSemantics: createCapability('no', 'Phase 9 intentionally excludes delete/update/replace semantics'),
      replaceSemantics: createCapability('no', 'Phase 9 intentionally excludes delete/update/replace semantics'),
      replayability: createCapability('yes', 'raw and canonical append-only logs can be replayed'),
      provenanceFidelity: createCapability('yes', 'uri, cid, did, collection, rkey, and source timestamp are preserved in provenance'),
      storageSnapshot: createCapability('yes', 'append-only storage and derived index snapshots are persisted'),
      sourceTrust: createCapability('partial', 'trust is limited to repository metadata in this MVP'),
    },
    provenance: {
      rawRef: true,
      replayable: true,
      semanticSource: 'canonical',
    },
    notes: [
      'Phase 9 starts with a custom record shape for bsky.social and keeps app.bsky.feed.post as a follow-up compatibility check.',
      'Live smoke write is gated and only runs when explicitly enabled.',
    ],
  });
}

const atprotoProtocolDescriptor = createAtProtoProtocolDescriptor();
const atprotoCapabilityRows = renderCapabilityRows([atprotoProtocolDescriptor]);
const atprotoProtocolRegistry = createProtocolRegistry([atprotoProtocolDescriptor]);

module.exports = {
  createAtProtoProtocolDescriptor,
  atprotoProtocolDescriptor,
  atprotoCapabilityRows,
  atprotoProtocolRegistry,
  convertCanonicalToAtProtoDraft,
  convertCanonicalToBskyFeedPostDraft,
  fromTransportToCanonicalAtProto,
};
