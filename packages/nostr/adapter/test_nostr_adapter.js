'use strict';

const crypto = require('crypto');
const assert = require('assert');
const {
  classifyEvent,
  canonicalizeNostrEvent,
  dedupeKey,
  normalizeNostrEvent,
  sortByTransportOrder,
  validateNostrInquiryEvent,
  verifyNostrEvent,
} = require('./nostr_adapter');
const { verifyIdentityClaim } = require('@toitoi/protocol');

function makeBaseEvent(overrides = {}) {
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
      ['dsl:var', 'm1', 'weed_flora', 'dependent'],
      ['dsl:rel', 'm1', 'microclimate', 'weed_flora'],
      ['dsl:meta', 'm1', 'note', 'draft'],
    ],
    sig: 'b8a8a2f56cb3b697b1fbe8dabc858d0226153a36500b87bc091ed229127b5bb457535387a4630bf55cffee9752af34df18c02f8a6f0ab14dba53cee2936a33cb',
    ...overrides,
  };
}

const tests = [
  {
    name: 'validate accepts a well-formed Nostr inquiry event',
    run() {
      const result = validateNostrInquiryEvent(makeBaseEvent());
      assert.strictEqual(result.ok, true);
      assert.deepStrictEqual(result.errors, []);
    },
  },
  {
    name: 'validate rejects invalid phase and missing content',
    run() {
      const result = validateNostrInquiryEvent(makeBaseEvent({
        content: '',
        tags: [['phase', 'novice']],
      }));
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.includes('content is required'));
      assert.ok(result.errors.includes('tags[0] has invalid phase'));
    },
  },
  {
    name: 'verify uses an injected verifier function',
    run() {
      const result = verifyNostrEvent(makeBaseEvent(), {
        verifyFn: () => true,
      });
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.verified, true);
      assert.strictEqual(result.skipped, false);
    },
  },
  {
    name: 'verify reports failures from an injected verifier function',
    run() {
      const result = verifyNostrEvent(makeBaseEvent(), {
        verifyFn: () => false,
      });
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.verified, false);
      assert.strictEqual(result.skipped, false);
    },
  },
  {
    name: 'normalize trims strings and preserves tags',
    run() {
      const result = normalizeNostrEvent(makeBaseEvent({
        content: '  雑草の生え方が場所によって違うのはなぜ？  ',
      }));
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.normalizedEvent.content, '雑草の生え方が場所によって違うのはなぜ？');
      assert.deepStrictEqual(result.normalizedEvent.tags[0], ['t', 'agroecology']);
    },
  },
  {
    name: 'canonicalize maps Nostr event fields into Canonical Event shape',
    run() {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
      const result = canonicalizeNostrEvent(makeBaseEvent(), {
        skipVerify: true,
        identityClaimSigner: {
          method: 'ed25519',
          privateKey,
          publicKey,
          keyId: 'nostr-test-key',
        },
      });
      assert.strictEqual(result.ok, true);
      assert.ok(result.canonicalEvent);
      assert.match(result.canonicalEvent.id, /^tt:evt:/);
      assert.strictEqual(result.canonicalEvent.schemaVersion, '0.1.0');
      assert.strictEqual(result.canonicalEvent.type, 'inquiry');
      assert.strictEqual(result.canonicalEvent.body.text, '雑草の生え方が場所によって違うのはなぜ？');
      assert.strictEqual(result.canonicalEvent.body.language, 'und');
      assert.deepStrictEqual(result.canonicalEvent.labels, ['agroecology']);
      assert.deepStrictEqual(result.canonicalEvent.contexts, { climate_zone: 'warm-temperate' });
      assert.deepStrictEqual(result.canonicalEvent.relationships, [{ source: 'microclimate', target: 'weed_flora' }]);
      assert.strictEqual(result.canonicalEvent.phase, 'intermediate');
      assert.strictEqual(result.canonicalEvent.lineage, undefined);
      assert.deepStrictEqual(result.canonicalEvent.dsl.models[0].id, 'm1');
      assert.ok(Array.isArray(result.canonicalEvent.identityClaims));
      assert.strictEqual(result.canonicalEvent.identityClaims[0].verification.method, 'ed25519');
      assert.strictEqual(
        verifyIdentityClaim(result.canonicalEvent.identityClaims[0]).valid,
        true,
      );
    },
  },
  {
    name: 'canonicalize respects an explicit canonical id override',
    run() {
      const result = canonicalizeNostrEvent(makeBaseEvent(), {
        skipVerify: true,
        id: 'tt:evt:01JVVNOSTROVERRIDE000000000000000',
      });

      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.canonicalEvent.id, 'tt:evt:01JVVNOSTROVERRIDE000000000000000');
    },
  },
  {
    name: 'classifyEvent marks invalid payloads as invalid',
    run() {
      const result = classifyEvent(makeBaseEvent({
        content: '',
        tags: [['phase', 'novice']],
      }), { skipVerify: true });
      assert.strictEqual(result.status, 'invalid');
      assert.ok(result.errors.length > 0);
      assert.strictEqual(result.canonicalEvent, null);
    },
  },
  {
    name: 'classifyEvent marks verification failures as invalid_signature',
    run() {
      const result = classifyEvent(makeBaseEvent(), {
        verifyFn: () => false,
      });
      assert.strictEqual(result.status, 'invalid_signature');
      assert.strictEqual(result.canonicalEvent, null);
    },
  },
  {
    name: 'dedupeKey uses the transport id',
    run() {
      assert.strictEqual(dedupeKey(makeBaseEvent()), makeBaseEvent().id);
    },
  },
  {
    name: 'sortByTransportOrder sorts by created_at then id',
    run() {
      const events = [
        makeBaseEvent({ id: 'c', created_at: 3 }),
        makeBaseEvent({ id: 'a', created_at: 1 }),
        makeBaseEvent({ id: 'b', created_at: 1 }),
      ];
      const sorted = sortByTransportOrder(events);
      assert.deepStrictEqual(sorted.map(event => event.id), ['a', 'b', 'c']);
    },
  },
];

function run() {
  const failures = [];

  for (const test of tests) {
    try {
      test.run();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failures.push({ name: test.name, error });
      console.error(`FAIL ${test.name}`);
      console.error(error instanceof Error ? error.stack || error.message : String(error));
    }
  }

  if (failures.length > 0) {
    process.exitCode = 1;
    console.error(`\n${failures.length} test(s) failed`);
    return;
  }

  console.log(`\n${tests.length} test(s) passed`);
}

run();
