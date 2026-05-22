'use strict';

const {
  createProtocolRegistry,
  renderCapabilityMatrixMarkdown,
} = require('./protocol_registry');

function loadDefaultProtocolDescriptors() {
  const { nostrProtocolDescriptor } = require('../nostr/protocol');
  const { atprotoProtocolDescriptor } = require('../atproto/protocol');
  const { localFsProtocolDescriptor } = require('../localfs/protocol');

  return [
    nostrProtocolDescriptor,
    atprotoProtocolDescriptor,
    localFsProtocolDescriptor,
  ];
}

function createDefaultProtocolRegistry() {
  return createProtocolRegistry(loadDefaultProtocolDescriptors());
}

function createDefaultCapabilityMatrixMarkdown() {
  return renderCapabilityMatrixMarkdown(loadDefaultProtocolDescriptors());
}

module.exports = {
  createDefaultCapabilityMatrixMarkdown,
  createDefaultProtocolRegistry,
  loadDefaultProtocolDescriptors,
};
