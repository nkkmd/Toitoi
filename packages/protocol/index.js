'use strict';

const protocolDescriptor = require('./protocol_descriptor');
const protocolRegistry = require('./protocol_registry');
const protocolRuntime = require('./protocol_runtime');
const protocolStorageRuntime = require('./protocol_storage_runtime');

module.exports = {
  ...protocolDescriptor,
  ...protocolRegistry,
  ...protocolRuntime,
  ...protocolStorageRuntime,
};
