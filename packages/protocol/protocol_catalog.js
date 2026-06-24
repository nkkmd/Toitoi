'use strict';

const {
  createProtocolRegistry,
  renderCapabilityMatrixMarkdown,
} = require('./protocol_registry');

function loadDefaultProtocolDescriptors() {
  const { nostrProtocolDescriptor } = require('../nostr/protocol');
  const { atprotoProtocolDescriptor } = require('../atproto/protocol');
  const { localFsProtocolDescriptor } = require('../localfs/protocol');
  const { lingonberryProtocolDescriptor } = require('../lingonberry/protocol');

  return [
    nostrProtocolDescriptor,
    atprotoProtocolDescriptor,
    localFsProtocolDescriptor,
    lingonberryProtocolDescriptor,
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
