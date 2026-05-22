'use strict';

const {
  createProtocolDescriptor,
  createCapability,
  renderCapabilityRows,
} = require('../protocol');

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
      validateRawEvent: notImplemented('ATProto validateRawEvent'),
      verifyRawEvent: notImplemented('ATProto verifyRawEvent'),
      normalizeRawEvent: notImplemented('ATProto normalizeRawEvent'),
      canonicalizeRawEvent: notImplemented('ATProto canonicalizeRawEvent'),
      classifyRawEvent: notImplemented('ATProto classifyRawEvent'),
      ingestRawEvents: notImplemented('ATProto ingestRawEvents'),
      ingestFromRelayUrl: notImplemented('ATProto ingestFromRelayUrl'),
      describe: () => ({
        protocol: 'atproto',
        sourceKind: 'record',
        dedupeKeyStrategy: 'record.uri',
        orderingStrategy: 'collection + indexedAt',
      }),
    },
    converter: {
      toTransport: notImplemented('ATProto toTransport'),
      fromTransport: notImplemented('ATProto fromTransport'),
      describe: () => ({
        protocol: 'atproto',
        projection: 'canonical -> atproto record',
      }),
    },
    capabilities: {
      rawAcquisition: createCapability('unknown', 'protocol selection and sync shape are not fixed yet'),
      identityVerification: createCapability('partial', 'DID / auth handling will differ by deployment'),
      ordering: createCapability('partial', 'indexedAt / sync ordering must be normalized'),
      deleteSemantics: createCapability('partial', 'tombstone semantics depend on record collection'),
      replaceSemantics: createCapability('partial', 'replaceable semantics require collection rules'),
      replayability: createCapability('partial', 'replay model depends on chosen sync source'),
      provenanceFidelity: createCapability('yes', 'record URI and collection metadata are available'),
      storageSnapshot: createCapability('partial', 'snapshot shape depends on sync and export strategy'),
      sourceTrust: createCapability('partial', 'trust depends on service and auth model'),
    },
    provenance: {
      rawRef: true,
      replayable: true,
      semanticSource: 'canonical',
    },
    notes: [
      'ATProto is a target protocol for the multi-protocol expansion, represented here as a skeleton descriptor.',
    ],
  });
}

const atprotoProtocolDescriptor = createAtProtoProtocolDescriptor();
const atprotoCapabilityRows = renderCapabilityRows([atprotoProtocolDescriptor]);

module.exports = {
  createAtProtoProtocolDescriptor,
  atprotoProtocolDescriptor,
  atprotoCapabilityRows,
};
