'use strict';

const {
  createProtocolDescriptor,
  renderCapabilityRows,
} = require('./protocol_descriptor');

function createProtocolRegistry(initialDescriptors = []) {
  const descriptors = new Map();

  function add(descriptorInput) {
    const descriptor = createProtocolDescriptor(descriptorInput);
    const protocol = descriptor.protocol;

    if (descriptors.has(protocol)) {
      throw new Error(`Protocol already registered: ${protocol}`);
    }

    descriptors.set(protocol, descriptor);
    return descriptor;
  }

  for (const descriptorInput of initialDescriptors) {
    add(descriptorInput);
  }

  return {
    add,
    get(protocol) {
      return descriptors.get(protocol) ?? null;
    },
    has(protocol) {
      return descriptors.has(protocol);
    },
    list() {
      return Array.from(descriptors.values()).sort((left, right) => {
        return left.protocol.localeCompare(right.protocol);
      });
    },
    capabilityRows() {
      return renderCapabilityRows(this.list());
    },
    toJSON() {
      return this.list();
    },
  };
}

function renderCapabilityMatrixMarkdown(descriptors) {
  const rows = renderCapabilityRows(descriptors);
  const protocols = Array.from(new Set(rows.map(row => row.protocol))).sort();
  const capabilities = Array.from(new Set(rows.map(row => row.capability))).sort();

  if (protocols.length === 0 || capabilities.length === 0) {
    return '| Capability | Status |\n|---|---|\n| (none) | (none) |';
  }

  const header = ['Capability', ...protocols];
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
  ];

  for (const capability of capabilities) {
    const row = [capability];
    for (const protocol of protocols) {
      const entry = rows.find(item => item.capability === capability && item.protocol === protocol);
      row.push(entry ? `${entry.support}${entry.notes ? ` (${entry.notes})` : ''}` : 'unknown');
    }
    lines.push(`| ${row.join(' | ')} |`);
  }

  return lines.join('\n');
}

module.exports = {
  createProtocolRegistry,
  renderCapabilityMatrixMarkdown,
};
