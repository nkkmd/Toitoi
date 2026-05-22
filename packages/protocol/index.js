'use strict';

const protocolDescriptor = require('./protocol_descriptor');
const protocolRegistry = require('./protocol_registry');

module.exports = {
  ...protocolDescriptor,
  ...protocolRegistry,
};
