'use strict';

const {
  renderCapabilityMatrixMarkdown,
} = require('./protocol_registry');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeProtocolName(value) {
  return isNonEmptyString(value) ? value.trim().toLowerCase() : '';
}

function loadProtocolCatalog() {
  return require('./protocol_catalog');
}

function describeProtocolDescriptor(descriptor) {
  if (!descriptor || typeof descriptor !== 'object') {
    return null;
  }

  const adapterDescription = typeof descriptor.adapter?.describe === 'function'
    ? descriptor.adapter.describe()
    : null;
  const converterDescription = typeof descriptor.converter?.describe === 'function'
    ? descriptor.converter.describe()
    : null;

  return {
    protocol: descriptor.protocol,
    name: descriptor.name,
    capabilities: descriptor.capabilities,
    provenance: descriptor.provenance,
    notes: Array.isArray(descriptor.notes) ? descriptor.notes.slice() : [],
    adapter: adapterDescription,
    converter: converterDescription,
  };
}

function resolveProtocolDescriptor(registry, protocolName, options = {}) {
  const normalized = normalizeProtocolName(protocolName);
  const registryInstance = registry || loadProtocolCatalog().createDefaultProtocolRegistry();
  const fallbackProtocol = normalizeProtocolName(options.defaultProtocol) || 'nostr';

  if (normalized) {
    const descriptor = registryInstance.get(normalized);
    if (!descriptor) {
      throw new Error(`Unknown protocol: ${protocolName}`);
    }
    return descriptor;
  }

  if (registryInstance.has(fallbackProtocol)) {
    return registryInstance.get(fallbackProtocol);
  }

  const descriptors = registryInstance.list();
  if (descriptors.length === 1) {
    return descriptors[0];
  }

  if (options.allowUnresolved === true) {
    return null;
  }

  throw new Error(
    `Unable to resolve protocol selection. Provide a protocol name from: ${descriptors.map(descriptor => descriptor.protocol).join(', ')}`
  );
}

function createProtocolRuntime(options = {}) {
  const registry = options.registry || loadProtocolCatalog().createDefaultProtocolRegistry();
  const selectedDescriptor = resolveProtocolDescriptor(registry, options.protocol, {
    defaultProtocol: options.defaultProtocol,
    allowUnresolved: true,
  });

  const selectedProtocol = selectedDescriptor ? selectedDescriptor.protocol : null;

  function getProtocol(protocolName) {
    return registry.get(normalizeProtocolName(protocolName));
  }

  function requireProtocol(protocolName) {
    const descriptor = getProtocol(protocolName);
    if (!descriptor) {
      throw new Error(`Unknown protocol: ${protocolName}`);
    }
    return descriptor;
  }

  return {
    registry,
    selectedProtocol,
    selectedDescriptor,
    availableProtocols: registry.list().map(descriptor => descriptor.protocol),
    capabilityRows: registry.capabilityRows(),
    capabilityMatrixMarkdown: renderCapabilityMatrixMarkdown(registry.list()),
    getProtocol,
    requireProtocol,
    listProtocols() {
      return registry.list();
    },
    describeProtocol(protocolName) {
      return describeProtocolDescriptor(requireProtocol(protocolName));
    },
    describeSelectedProtocol() {
      return selectedDescriptor ? describeProtocolDescriptor(selectedDescriptor) : null;
    },
    resolveProtocol(protocolName) {
      return resolveProtocolDescriptor(registry, protocolName, options);
    },
    toJSON() {
      return {
        selectedProtocol,
        availableProtocols: registry.list().map(descriptor => descriptor.protocol),
      };
    },
  };
}

function buildProtocolIntrospectionPayload(runtime) {
  const protocolRuntime = runtime || createProtocolRuntime();
  return {
    selectedProtocol: protocolRuntime.selectedProtocol,
    availableProtocols: protocolRuntime.availableProtocols,
    capabilityMatrix: protocolRuntime.capabilityMatrixMarkdown,
    protocols: protocolRuntime.listProtocols().map(describeProtocolDescriptor),
  };
}

function renderProtocolHelp(runtime) {
  const protocolRuntime = runtime || createProtocolRuntime();
  const selectedLabel = protocolRuntime.selectedProtocol || '(none)';
  const lines = [
    'Available protocols:',
    ...protocolRuntime.listProtocols().map(descriptor => `  - ${descriptor.protocol} (${descriptor.name})`),
    `Selected protocol: ${selectedLabel}`,
  ];

  if (protocolRuntime.selectedDescriptor) {
    const selected = protocolRuntime.describeSelectedProtocol();
    if (selected?.adapter?.protocol) {
      lines.push(`Selected adapter: ${selected.adapter.protocol}`);
    }
    if (selected?.converter?.protocol) {
      lines.push(`Selected converter: ${selected.converter.protocol}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  buildProtocolIntrospectionPayload,
  createProtocolRuntime,
  describeProtocolDescriptor,
  normalizeProtocolName,
  renderProtocolHelp,
  resolveProtocolDescriptor,
};
