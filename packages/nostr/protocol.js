'use strict';

const {
  createProtocolDescriptor,
  createCapability,
  renderCapabilityRows,
  createProtocolRegistry,
} = require('@toitoi/protocol');
const {
  classifyEvent,
  canonicalizeNostrEvent,
  dedupeKey,
  normalizeNostrEvent,
  sortByTransportOrder,
  validateNostrInquiryEvent,
  verifyNostrEvent,
} = require('./adapter/nostr_adapter');
const { ingestNostrEvents } = require('./adapter/ingest_pipeline');
const { ingestRelaySubscription, ingestRelayUrl } = require('./adapter/relay_ingest');
const { convertCanonicalToNostrDraft } = require('./converter/canonical_to_nostr_converter');

function createNostrProtocolDescriptor() {
  return createProtocolDescriptor({
    protocol: 'nostr',
    name: 'Nostr',
    adapter: {
      validateRawEvent: validateNostrInquiryEvent,
      verifyRawEvent: verifyNostrEvent,
      normalizeRawEvent: normalizeNostrEvent,
      canonicalizeRawEvent: canonicalizeNostrEvent,
      classifyRawEvent: classifyEvent,
      ingestRawEvents: ingestNostrEvents,
      ingestFromRelayUrl: ingestRelayUrl,
      describe: () => ({
        protocol: 'nostr',
        sourceKind: 1042,
        dedupeKeyStrategy: 'event.id',
        orderingStrategy: 'created_at + id',
      }),
    },
    converter: {
      toTransport: convertCanonicalToNostrDraft,
      fromTransport: null,
      describe: () => ({
        protocol: 'nostr',
        projection: 'canonical -> nostr draft',
      }),
    },
    capabilities: {
      rawAcquisition: createCapability('yes', 'relay subscription and JSONL ingest are supported'),
      identityVerification: createCapability('yes', 'signature verification is available'),
      ordering: createCapability('yes', 'created_at ordering plus stable tie-breaks are implemented'),
      deleteSemantics: createCapability('partial', 'delete and tombstone semantics remain adapter-local'),
      replaceSemantics: createCapability('partial', 'replacement is represented through lineage and replay'),
      replayability: createCapability('yes', 'append-only logs and replay are implemented'),
      provenanceFidelity: createCapability('yes', 'provenance and rawRef are preserved'),
      storageSnapshot: createCapability('yes', 'raw/canonical logs and index snapshot are persisted'),
      sourceTrust: createCapability('partial', 'trust is based on verification plus source metadata'),
    },
    provenance: {
      rawRef: true,
      replayable: true,
      semanticSource: 'canonical',
    },
    notes: [
      'Nostr is the first operational transport.',
      'Capability table is descriptive and can be re-used for later protocols.',
    ],
  });
}

const nostrProtocolDescriptor = createNostrProtocolDescriptor();
const nostrCapabilityRows = renderCapabilityRows([nostrProtocolDescriptor]);
const nostrProtocolRegistry = createProtocolRegistry([nostrProtocolDescriptor]);

module.exports = {
  createNostrProtocolDescriptor,
  nostrProtocolDescriptor,
  nostrProtocolRegistry,
  nostrCapabilityRows,
  dedupeKey,
  sortByTransportOrder,
  ingestRelaySubscription,
  ingestRelayUrl,
};
