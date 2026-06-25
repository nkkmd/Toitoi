'use strict';

const assert = require('assert');
const {
  publishCanonicalEventToAtProto,
  resolveRepo,
  resolveAccessJwt,
} = require('./outbound');

const tests = [
  {
    name: 'publishCanonicalEventToAtProto uses injected session and writer helpers',
    async run() {
      const canonicalEvent = {
        id: 'tt:evt:01JVVATPROTOUT0000000000000000000',
        schemaVersion: '0.1.0',
        type: 'inquiry',
        createdAt: '2026-05-28T00:00:00.000Z',
        body: {
          text: 'ATProto outbound を確認する。',
          language: 'ja',
        },
      };

      let createRecordInput = null;
      const result = await publishCanonicalEventToAtProto(canonicalEvent, {
        session: {
          did: 'did:plc:toitoi123',
          accessJwt: 'session-token',
        },
        createRecord(input) {
          createRecordInput = input;
          return {
            uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/abc123',
            cid: 'bafy...',
          };
        },
      });

      assert.ok(result.draft);
      assert.ok(result.created);
      assert.strictEqual(result.protocol, 'atproto');
      assert.strictEqual(createRecordInput.repo, 'did:plc:toitoi123');
      assert.strictEqual(createRecordInput.accessJwt, 'session-token');
      assert.strictEqual(createRecordInput.collection, 'app.toitoi.inquiry');
      assert.strictEqual(createRecordInput.record.text, canonicalEvent.body.text);
    },
  },
  {
    name: 'resolveRepo and resolveAccessJwt prefer explicit values',
    run() {
      assert.strictEqual(resolveRepo({ repo: 'did:plc:abc' }), 'did:plc:abc');
      assert.strictEqual(resolveAccessJwt({ accessJwt: 'token' }), 'token');
    },
  },
];

async function run() {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
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

run().catch(error => {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.stack || error.message : String(error));
});
