'use strict';

const SUPPORT_LEVELS = new Set(['yes', 'partial', 'no', 'unknown']);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeSupportLevel(value) {
  if (!isNonEmptyString(value)) {
    return 'unknown';
  }

  const normalized = value.trim().toLowerCase();
  return SUPPORT_LEVELS.has(normalized) ? normalized : 'unknown';
}

function createCapability(support, notes = '') {
  return {
    support: normalizeSupportLevel(support),
    notes: isNonEmptyString(notes) ? notes.trim() : '',
  };
}

function normalizeCapability(value) {
  if (isPlainObject(value)) {
    return createCapability(value.support, value.notes);
  }

  if (typeof value === 'boolean') {
    return createCapability(value ? 'yes' : 'no', '');
  }

  return createCapability('unknown', '');
}

function createAdapterInterface(handlers = {}) {
  return {
    validateRawEvent: handlers.validateRawEvent ?? null,
    verifyRawEvent: handlers.verifyRawEvent ?? null,
    normalizeRawEvent: handlers.normalizeRawEvent ?? null,
    canonicalizeRawEvent: handlers.canonicalizeRawEvent ?? null,
    classifyRawEvent: handlers.classifyRawEvent ?? null,
    ingestRawEvents: handlers.ingestRawEvents ?? null,
    ingestFromRelayUrl: handlers.ingestFromRelayUrl ?? null,
    describe: handlers.describe ?? null,
  };
}

function createConverterInterface(handlers = {}) {
  return {
    toTransport: handlers.toTransport ?? null,
    fromTransport: handlers.fromTransport ?? null,
    describe: handlers.describe ?? null,
  };
}

function validateCallable(value, label) {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'function') {
    return `${label} must be a function or null`;
  }

  return null;
}

function validateProtocolDescriptor(descriptor) {
  const errors = [];

  if (!isPlainObject(descriptor)) {
    return ['descriptor must be an object'];
  }

  if (!isNonEmptyString(descriptor.protocol)) {
    errors.push('protocol is required');
  }

  if (!isNonEmptyString(descriptor.name)) {
    errors.push('name is required');
  }

  if (!isPlainObject(descriptor.adapter)) {
    errors.push('adapter is required');
  }

  if (!isPlainObject(descriptor.converter)) {
    errors.push('converter is required');
  }

  if (!isPlainObject(descriptor.capabilities)) {
    errors.push('capabilities is required');
  }

  if (isPlainObject(descriptor.adapter)) {
    for (const [key, value] of Object.entries(descriptor.adapter)) {
      const error = validateCallable(value, `adapter.${key}`);
      if (error) {
        errors.push(error);
      }
    }
  }

  if (isPlainObject(descriptor.converter)) {
    for (const [key, value] of Object.entries(descriptor.converter)) {
      const error = validateCallable(value, `converter.${key}`);
      if (error) {
        errors.push(error);
      }
    }
  }

  return errors;
}

function createProtocolDescriptor(input = {}) {
  const descriptor = {
    protocol: isNonEmptyString(input.protocol) ? input.protocol.trim() : '',
    name: isNonEmptyString(input.name) ? input.name.trim() : '',
    adapter: createAdapterInterface(input.adapter),
    converter: createConverterInterface(input.converter),
    capabilities: {},
    provenance: isPlainObject(input.provenance) ? { ...input.provenance } : {},
    notes: Array.isArray(input.notes)
      ? input.notes.filter(note => isNonEmptyString(note)).map(note => note.trim())
      : [],
  };

  if (isPlainObject(input.capabilities)) {
    for (const [key, value] of Object.entries(input.capabilities)) {
      descriptor.capabilities[key] = normalizeCapability(value);
    }
  }

  const errors = validateProtocolDescriptor(descriptor);
  if (errors.length > 0) {
    const error = new Error(`Invalid protocol descriptor: ${errors.join('; ')}`);
    error.errors = errors;
    throw error;
  }

  return descriptor;
}

function renderCapabilityRows(descriptors) {
  const list = Array.isArray(descriptors) ? descriptors : [];
  const rows = [];

  for (const descriptor of list) {
    if (!isPlainObject(descriptor)) {
      continue;
    }

    const capabilityEntries = isPlainObject(descriptor.capabilities)
      ? Object.entries(descriptor.capabilities)
      : [];

    for (const [capabilityName, capabilityValue] of capabilityEntries) {
      const normalized = normalizeCapability(capabilityValue);
      rows.push({
        protocol: descriptor.protocol,
        name: descriptor.name,
        capability: capabilityName,
        support: normalized.support,
        notes: normalized.notes,
      });
    }
  }

  return rows;
}

module.exports = {
  SUPPORT_LEVELS,
  createAdapterInterface,
  createCapability,
  createConverterInterface,
  createProtocolDescriptor,
  normalizeCapability,
  normalizeSupportLevel,
  renderCapabilityRows,
  validateProtocolDescriptor,
};
