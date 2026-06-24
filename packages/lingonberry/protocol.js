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
const { listObjects } = require('./live/http_client');

function extractCarrierObjects(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('Lingonberry carrier response must be an array or object');
  }

  for (const key of ['objects', 'items', 'records']) {
    if (Array.isArray(payload[key])) {
      return payload[key].map(item => {
        if (item && typeof item === 'object' && item.request) {
          return item.request;
        }
        if (item && typeof item === 'object' && item.requestJson) {
          return JSON.parse(item.requestJson);
        }
        if (item && typeof item === 'object' && item.object && item.publisher) {
          return item;
        }
        if (item && typeof item === 'object' && item.object) {
          return item.object;
        }
        return item;
      });
    }
  }

  throw new Error('Lingonberry carrier response missing objects array');
}

async function ingestFromCarrierUrl(carrierUrl, filter = {}, options = {}) {
  const payload = await listObjects({
    carrierUrl,
    cursor: filter?.cursor || options.cursor || '',
    since: filter?.since || options.since || '',
    limit: Number.isInteger(filter?.limit) ? filter.limit : options.limit,
  });
  return ingestLingonberryEvents(extractCarrierObjects(payload), options);
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
      ingestFromRelayUrl: ingestFromCarrierUrl,
      describe: () => ({
        protocol: 'lingonberry',
        sourceKind: 'knowledge object / HTTP publish request / carrier / archive',
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
      'Carrier ingest uses GET /v1/objects as a timer-friendly direct acquisition path; archive and batch ingest remain supported.',
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
  ingestFromCarrierUrl,
};
