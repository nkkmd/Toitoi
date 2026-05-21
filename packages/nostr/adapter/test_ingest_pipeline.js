'use strict';

const assert = require('assert');
const { ingestNostrEvents } = require('./ingest_pipeline');

function makeEvent(overrides = {}) {
  return {
    kind: 1042,
    id: 'b00d9066bde5ea98b035866f0a5e11dea3afd72bd21e2f837246e26be9a40177',
    pubkey: 'c8170cf2e55db4bdfe4d34b3b453ab2352e81c47801f7d9ae08e7997d27f3d68',
    created_at: 1778244850,
    content: '雑草の生え方が場所によって違うのはなぜ？',
    tags: [
      ['t', 'agroecology'],
      ['context', 'climate_zone', 'warm-temperate'],
      ['relationship', 'microclimate', 'weed_flora'],
      ['phase', 'intermediate'],
      ['dsl:model', 'm1', 'microclimate_model'],
      ['dsl:var', 'm1', 'microclimate', 'independent'],
    ],
    sig: 'b8a8a2f56cb3b697b1fbe8dabc858d0226153a36500b87bc091ed229127b5bb457535387a4630bf55cffee9752af34df18c02f8a6f0ab14dba53cee2936a33cb',
    ...overrides,
  };
}

const tests = [
  {
    name: 'ingestNostrEvents separates accepted, invalid, and duplicates',
    run() {
      const result = ingestNostrEvents([
        makeEvent({ created_at: 3, id: 'c' }),
        makeEvent({ created_at: 1, id: 'a' }),
        makeEvent({ created_at: 1, id: 'a' }),
        makeEvent({ created_at: 2, id: 'b', content: '' }),
      ], {
        skipVerify: true,
      });

      assert.deepStrictEqual(result.orderedEvents.map(event => event.id), ['a', 'a', 'b', 'c']);
      assert.strictEqual(result.accepted.length, 2);
      assert.strictEqual(result.duplicates.length, 1);
      assert.strictEqual(result.invalid.length, 1);
      assert.strictEqual(result.unverified.length, 2);
    },
  },
  {
    name: 'ingestNostrEvents keeps canonicalEvent for accepted items',
    run() {
      const result = ingestNostrEvents([makeEvent()], {
        skipVerify: true,
      });

      assert.strictEqual(result.accepted.length, 1);
      assert.ok(result.accepted[0].canonicalEvent);
      assert.strictEqual(result.accepted[0].canonicalEvent.type, 'inquiry');
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
