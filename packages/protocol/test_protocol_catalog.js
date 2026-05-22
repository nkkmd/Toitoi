'use strict';

const assert = require('assert');
const {
  createDefaultCapabilityMatrixMarkdown,
  createDefaultProtocolRegistry,
  loadDefaultProtocolDescriptors,
} = require('./protocol_catalog');

const tests = [
  {
    name: 'default protocol registry includes Nostr, ATProto, and LocalFS',
    run() {
      const registry = createDefaultProtocolRegistry();

      assert.strictEqual(registry.has('nostr'), true);
      assert.strictEqual(registry.has('atproto'), true);
      assert.strictEqual(registry.has('localfs'), true);
      assert.strictEqual(registry.list().length, 3);
      assert.strictEqual(loadDefaultProtocolDescriptors().length, 3);
    },
  },
  {
    name: 'default capability matrix includes the three protocols',
    run() {
      const markdown = createDefaultCapabilityMatrixMarkdown();

      assert.ok(markdown.includes('| Capability | atproto | localfs | nostr |'));
      assert.ok(markdown.includes('rawAcquisition'));
      assert.ok(markdown.includes('storageSnapshot'));
    },
  },
];

function run() {
  let failed = 0;

  for (const test of tests) {
    try {
      test.run();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${test.name}`);
      console.error(error instanceof Error ? error.stack || error.message : String(error));
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    console.error(`\n${failed} test(s) failed`);
    return;
  }

  console.log(`\n${tests.length} test(s) passed`);
}

run();
