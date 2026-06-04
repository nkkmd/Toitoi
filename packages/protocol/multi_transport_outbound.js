'use strict';

const { createProtocolRuntime } = require('./protocol_runtime');
const { normalizeProtocolName } = require('./protocol_runtime');

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function resolveProtocolRuntime(input) {
  if (input && typeof input.listProtocols === 'function' && typeof input.getProtocol === 'function') {
    return input;
  }

  if (isPlainObject(input) && input.registry) {
    return createProtocolRuntime({
      registry: input.registry,
      protocol: input.protocol,
      defaultProtocol: input.defaultProtocol,
    });
  }

  return createProtocolRuntime();
}

function buildOutboundFanOutPlan(canonicalEvent, options = {}) {
  if (!canonicalEvent || typeof canonicalEvent !== 'object') {
    throw new TypeError('canonicalEvent must be an object');
  }

  const protocolRuntime = resolveProtocolRuntime(options.protocolRuntime || options.registry || null);
  const selectedProtocols = Array.isArray(options.protocols) && options.protocols.length > 0
    ? options.protocols.map(normalizeProtocolName).filter(Boolean)
    : protocolRuntime.listProtocols().map(descriptor => descriptor.protocol);
  const protocolOptions = isPlainObject(options.protocolOptions) ? options.protocolOptions : {};
  const entries = [];

  for (const protocolName of selectedProtocols) {
    const descriptor = protocolRuntime.getProtocol(protocolName);
    if (!descriptor) {
      entries.push({
        protocol: protocolName,
        status: 'skipped',
        reason: 'protocol descriptor not found',
      });
      continue;
    }

    const toTransport = descriptor.converter && typeof descriptor.converter.toTransport === 'function'
      ? descriptor.converter.toTransport
      : null;
    if (!toTransport) {
      entries.push({
        protocol: descriptor.protocol,
        status: 'skipped',
        reason: 'converter.toTransport is unavailable',
      });
      continue;
    }

    try {
      const resolvedOptions = {
        ...(protocolOptions[descriptor.protocol] || {}),
      };
      if (descriptor.protocol === 'nostr' && resolvedOptions.kind == null && typeof descriptor.adapter?.describe === 'function') {
        const adapterDescription = descriptor.adapter.describe();
        if (typeof adapterDescription?.sourceKind === 'number') {
          resolvedOptions.kind = adapterDescription.sourceKind;
        }
      }

      const converted = toTransport(canonicalEvent, resolvedOptions);
      const transport = converted && typeof converted === 'object' && !Array.isArray(converted) && Object.prototype.hasOwnProperty.call(converted, 'output')
        ? converted.output
        : converted && typeof converted === 'object' && !Array.isArray(converted) && Object.prototype.hasOwnProperty.call(converted, 'draft')
          ? converted.draft
          : converted;
      const warnings = converted && typeof converted === 'object' && !Array.isArray(converted) && Array.isArray(converted.warnings)
        ? converted.warnings.slice()
        : [];
      entries.push({
        protocol: descriptor.protocol,
        status: 'ready',
        transport,
        warnings,
        adapter: typeof descriptor.adapter?.describe === 'function' ? descriptor.adapter.describe() : null,
        converter: typeof descriptor.converter?.describe === 'function' ? descriptor.converter.describe() : null,
      });
    } catch (error) {
      entries.push({
        protocol: descriptor.protocol,
        status: 'quarantined',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    sourceEventId: isNonEmptyString(canonicalEvent.id) ? canonicalEvent.id.trim() : null,
    entries,
    ready: entries.filter(entry => entry.status === 'ready'),
    skipped: entries.filter(entry => entry.status === 'skipped'),
    quarantined: entries.filter(entry => entry.status === 'quarantined'),
  };
}

module.exports = {
  buildOutboundFanOutPlan,
};
