'use strict';

const {
  createProtocolDescriptor,
  createCapability,
  renderCapabilityRows,
} = require('@toitoi/protocol');

function notImplemented(label) {
  return () => {
    throw new Error(`${label} is not implemented yet`);
  };
}

function createLocalFsProtocolDescriptor() {
  return createProtocolDescriptor({
    protocol: 'localfs',
    name: 'LocalFS',
    adapter: {
      validateRawEvent: notImplemented('LocalFS validateRawEvent'),
      verifyRawEvent: notImplemented('LocalFS verifyRawEvent'),
      normalizeRawEvent: notImplemented('LocalFS normalizeRawEvent'),
      canonicalizeRawEvent: notImplemented('LocalFS canonicalizeRawEvent'),
      classifyRawEvent: notImplemented('LocalFS classifyRawEvent'),
      ingestRawEvents: notImplemented('LocalFS ingestRawEvents'),
      ingestFromRelayUrl: notImplemented('LocalFS ingestFromRelayUrl'),
      describe: () => ({
        protocol: 'localfs',
        sourceKind: 'jsonl/json',
        dedupeKeyStrategy: 'file path + stable record id',
        orderingStrategy: 'mtime + file order',
      }),
    },
    converter: {
      toTransport: notImplemented('LocalFS toTransport'),
      fromTransport: notImplemented('LocalFS fromTransport'),
      describe: () => ({
        protocol: 'localfs',
        projection: 'canonical -> file record',
      }),
    },
    capabilities: {
      rawAcquisition: createCapability('yes', 'files and archives are directly readable'),
      identityVerification: createCapability('no', 'local files do not imply transport identity'),
      ordering: createCapability('partial', 'file and mtime ordering need normalization'),
      deleteSemantics: createCapability('partial', 'delete semantics depend on archive policy'),
      replaceSemantics: createCapability('partial', 'replace semantics depend on snapshot policy'),
      replayability: createCapability('yes', 'append-only or archived files can be replayed'),
      provenanceFidelity: createCapability('partial', 'path and file metadata can be preserved'),
      storageSnapshot: createCapability('yes', 'filesystem snapshots are straightforward'),
      sourceTrust: createCapability('partial', 'trust depends on filesystem ownership and policy'),
    },
    provenance: {
      rawRef: true,
      replayable: true,
      semanticSource: 'canonical',
    },
    notes: [
      'LocalFS is a target protocol for the multi-protocol expansion, represented here as a skeleton descriptor.',
    ],
  });
}

const localFsProtocolDescriptor = createLocalFsProtocolDescriptor();
const localFsCapabilityRows = renderCapabilityRows([localFsProtocolDescriptor]);

module.exports = {
  createLocalFsProtocolDescriptor,
  localFsProtocolDescriptor,
  localFsCapabilityRows,
};
