'use strict';

const {
  createCapability,
  createProtocolDescriptor,
  createProtocolRegistry,
  renderCapabilityRows,
} = require('../protocol');
const {
  canonicalizeLingonberryEvent,
  classifyEvent,
  normalizeLingonberryEvent,
  sortByTransportOrder,
  validateLingonberryEvent,
  verifyLingonberryEvent,
} = require('./adapter/lingonberry_adapter');
const { ingestLingonberryEvents } = require('./adapter/ingest_pipeline');
const {
  convertCanonicalToLingonberryObject,
  fromTransportToCanonicalLingonberry,
} = require('./converter/canonical_to_lingonberry_converter');

function notImplemented(label) {
  return () => {
    throw new Error(`${label} is not implemented yet`);
  };
}

function createLingonberryProtocolDescriptor() {
  return createProtocolDescriptor({
    protocol: 'lingonberry',
    name: 'Lingonberry',
    adapter: {
      validateRawEvent: validateLingonberryEvent,
      verifyRawEvent: verifyLingonberryEvent,
      normalizeRawEvent: normalizeLingonberryEvent,
      canonicalizeRawEvent: canonicalizeLingonberryEvent,
      classifyRawEvent: classifyEvent,
      ingestRawEvents: ingestLingonberryEvents,
      ingestFromRelayUrl: notImplemented('Lingonberry ingestFromRelayUrl'),
      describe: () => ({
        protocol: 'lingonberry',
        sourceKind: 'knowledge object / HTTP publish request / archive',
        dedupeKeyStrategy: 'rawRef.sourceId, falling back to object id',
        orderingStrategy: 'createdAt + source id',
      }),
    },
    converter: {
      toTransport: convertCanonicalToLingonberryObject,
      fromTransport: fromTransportToCanonicalLingonberry,
      describe: () => ({
        protocol: 'lingonberry',
        projection: 'canonical -> Lingonberry knowledge object',
      }),
    },
    capabilities: {
      rawAcquisition: createCapability('yes', 'knowledge objects can be read from HTTP publish requests, relay output, or archive wire logs'),
      identityVerification: createCapability('yes', 'HTTP publish requests use Ed25519 publisher signatures'),
      ordering: createCapability('partial', 'append order and createdAt are available, but no global ordering is implied'),
      deleteSemantics: createCapability('no', 'protocol-native delete semantics are not part of the 0.1.0 knowledge object contract'),
      replaceSemantics: createCapability('partial', 'status and lineage can express revision, but mutation-style replace is not modeled'),
      replayability: createCapability('yes', 'raw wire logs and archive exports are replayable'),
      provenanceFidelity: createCapability('yes', 'provenance.sources and rawRef are required by the knowledge object schema'),
      storageSnapshot: createCapability('yes', 'raw request log, canonical catalog, and archive export are supported upstream'),
      sourceTrust: createCapability('partial', 'publisher signature can be verified, while carrier and operator trust remain policy decisions'),
    },
    provenance: {
      rawRef: true,
      replayable: true,
      semanticSource: 'canonical',
    },
    notes: [
      'Lingonberry knowledge objects are treated as Toitoi transport projections, not as the Toitoi internal center model.',
      'Live relay ingest is intentionally left gated for a later slice; archive and batch ingest are the first target.',
    ],
  });
}

const lingonberryProtocolDescriptor = createLingonberryProtocolDescriptor();
const lingonberryCapabilityRows = renderCapabilityRows([lingonberryProtocolDescriptor]);
const lingonberryProtocolRegistry = createProtocolRegistry([lingonberryProtocolDescriptor]);

module.exports = {
  createLingonberryProtocolDescriptor,
  lingonberryCapabilityRows,
  lingonberryProtocolDescriptor,
  lingonberryProtocolRegistry,
  convertCanonicalToLingonberryObject,
  fromTransportToCanonicalLingonberry,
};
