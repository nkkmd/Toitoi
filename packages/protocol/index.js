'use strict';

const protocolDescriptor = require('./protocol_descriptor');
const protocolRegistry = require('./protocol_registry');
const multiTransport = require('./multi_transport');
const multiTransportReplay = require('./multi_transport_replay');
const multiTransportOutbound = require('./multi_transport_outbound');
const multiTransportDelivery = require('./multi_transport_delivery');
const protocolRuntime = require('./protocol_runtime');
const protocolStorageRuntime = require('./protocol_storage_runtime');
const canonicalIdentity = require('./canonical_identity');
const identityVerification = require('./identity_verification');

module.exports = {
  ...protocolDescriptor,
  ...protocolRegistry,
  ...multiTransport,
  ...multiTransportReplay,
  ...multiTransportOutbound,
  ...multiTransportDelivery,
  ...protocolRuntime,
  ...protocolStorageRuntime,
  ...canonicalIdentity,
  ...identityVerification,
};
