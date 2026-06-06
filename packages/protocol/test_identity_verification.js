'use strict';

const crypto = require('crypto');
const assert = require('assert');
const {
  createIdentityClaim,
  createIdentityClaimRegistry,
  createIdentityKey,
  issueIdentityClaim,
  signIdentityClaim,
  summarizeIdentityClaim,
  verifyIdentityClaim,
} = require('./identity_verification');

const canonicalEvent = {
  id: 'tt:evt:01JVVIDENTITY000000000000000000000',
  schemaVersion: '0.3.1',
  type: 'inquiry',
  createdAt: '2026-06-06T00:00:00.000Z',
  body: {
    text: 'microclimate は雑草の分布に影響するか？',
    language: 'ja',
  },
  contexts: {
    climate_zone: 'warm-temperate',
    soil_type: 'volcanic_ash',
  },
  relationships: [
    { source: 'microclimate', target: 'weed_flora' },
    { source: 'weed_flora', target: 'microclimate' },
  ],
  phase: 'expert',
  trigger: {
    category: 'field-observation',
    value: 'patchy-growth',
  },
  lineage: [
    {
      type: 'derived_from',
      target: 'tt:evt:01JVVROOT0000000000000000000000000',
    },
  ],
  provenance: {
    sources: [
      {
        protocol: 'nostr',
        sourceId: 'd'.repeat(64),
      },
    ],
  },
  rawRef: {
    protocol: 'nostr',
    sourceId: 'd'.repeat(64),
    relay: 'wss://relay.example',
    storage: 'append-log',
    storageId: 'log-000123',
    payloadHash: 'hash-123',
  },
  labels: ['should', 'not', 'matter'],
  dsl: {
    models: [
      {
        id: 'model-1',
        name: 'microclimate_model',
      },
    ],
  },
  meta: {
    transportHint: 'nostr',
  },
};

const tests = [
  {
    name: 'createIdentityKey depends on semantic content but not provenance or rawRef',
    run() {
      const baseKey = createIdentityKey(canonicalEvent);
      const sameMeaning = createIdentityKey({
        ...canonicalEvent,
        provenance: {
          sources: [
            {
              protocol: 'atproto',
              sourceId: 'at://did:plc:toitoi123/app.toitoi.inquiry/alt',
            },
          ],
        },
        rawRef: {
          protocol: 'atproto',
          sourceId: 'at://did:plc:toitoi123/app.toitoi.inquiry/alt',
          storage: 'archive',
        },
        meta: {
          transportHint: 'atproto',
        },
        labels: ['different', 'labels'],
        dsl: {
          models: [{ id: 'model-2', name: 'different_dsl' }],
        },
      });

      assert.match(baseKey, /^tt:key:identity-key-v1:sha256:[0-9a-f]{64}$/);
      assert.strictEqual(sameMeaning, baseKey);
    },
  },
  {
    name: 'createIdentityKey is order-stable for arrays and object keys',
    run() {
      const reordered = createIdentityKey({
        ...canonicalEvent,
        relationships: [
          { target: 'weed_flora', source: 'microclimate' },
          { source: 'weed_flora', target: 'microclimate' },
        ],
        contexts: {
          soil_type: 'volcanic_ash',
          climate_zone: 'warm-temperate',
        },
      });

      assert.strictEqual(reordered, createIdentityKey(canonicalEvent));
    },
  },
  {
    name: 'createIdentityClaim builds a JSON envelope with a payload hash',
    run() {
      const identityKey = createIdentityKey(canonicalEvent);
      const claim = createIdentityClaim({
        identityKey,
        canonicalId: canonicalEvent.id,
        issuer: {
          protocol: 'nostr',
          sourceId: 'd'.repeat(64),
          signerId: 'npub1example',
        },
        verification: {
          method: 'ed25519',
        },
      });

      assert.strictEqual(claim.schemaVersion, '1');
      assert.strictEqual(claim.claimType, 'identity');
      assert.strictEqual(claim.identityKey, identityKey);
      assert.strictEqual(claim.canonicalId, canonicalEvent.id);
      assert.strictEqual(claim.verification.method, 'ed25519');
      assert.match(claim.verification.payloadHash, /^sha256:[0-9a-f]{64}$/);
    },
  },
  {
    name: 'verifyIdentityClaim accepts pluggable verification methods',
    run() {
      const identityKey = createIdentityKey(canonicalEvent);
      const claim = createIdentityClaim({
        identityKey,
        canonicalId: canonicalEvent.id,
        verification: {
          method: 'mock-signature',
        },
      });

      const result = verifyIdentityClaim(claim, {
        verifiers: {
          'mock-signature': (verifiedClaim, context) => {
            assert.strictEqual(verifiedClaim.identityKey, identityKey);
            assert.match(context.payloadHash, /^sha256:/);
            return true;
          },
        },
      });

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.method, 'mock-signature');
    },
  },
  {
    name: 'issueIdentityClaim signs and verifies ed25519 claims',
    run() {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
      const signedClaim = issueIdentityClaim(canonicalEvent, {
        signer: {
          method: 'ed25519',
          privateKey,
          publicKey,
          keyId: 'test-key',
        },
      });

      assert.strictEqual(signedClaim.verification.method, 'ed25519');
      assert.strictEqual(signedClaim.verification.keyId, 'test-key');
      assert.match(signedClaim.verification.signature, /^[A-Za-z0-9+/=]+$/);
      assert.strictEqual(
        signedClaim.verification.publicKey,
        publicKey.export({ format: 'pem', type: 'spki' }),
      );

      const result = verifyIdentityClaim(signedClaim);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.method, 'ed25519');

      const resigned = signIdentityClaim(createIdentityClaim({
        identityKey: signedClaim.identityKey,
        canonicalId: signedClaim.canonicalId,
        issuer: signedClaim.issuer,
      }), {
        method: 'ed25519',
        privateKey,
        publicKey,
        keyId: 'test-key',
      });
      assert.strictEqual(resigned.verification.method, 'ed25519');
      assert.strictEqual(verifyIdentityClaim(resigned).valid, true);
    },
  },
  {
    name: 'createIdentityClaimRegistry resolves canonical ids from identity keys',
    run() {
      const identityKey = createIdentityKey(canonicalEvent);
      const registry = createIdentityClaimRegistry([
        createIdentityClaim({
          identityKey,
          canonicalId: canonicalEvent.id,
        }),
      ]);

      assert.strictEqual(registry.resolveCanonicalId(identityKey), canonicalEvent.id);
      assert.strictEqual(registry.getCanonicalIdentityKeys(canonicalEvent.id)[0], identityKey);

      const summary = summarizeIdentityClaim(identityKey, registry);
      assert.strictEqual(summary.canonicalId, canonicalEvent.id);
      assert.strictEqual(summary.claimCount, 1);
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
