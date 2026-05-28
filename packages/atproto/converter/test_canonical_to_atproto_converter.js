'use strict';

const assert = require('assert');
const {
  convertCanonicalToAtProtoDraft,
  convertCanonicalToBskyFeedPostDraft,
  fromTransportToCanonicalAtProto,
} = require('./canonical_to_atproto_converter');
const { makeAtProtoRecord } = require('../test_fixtures');
const { canonicalizeAtProtoRecord } = require('../adapter/atproto_adapter');

const tests = [
  {
    name: 'convert canonical events into ATProto write drafts',
    run() {
      const canonicalEvent = canonicalizeAtProtoRecord(makeAtProtoRecord()).canonicalEvent;
      const draft = convertCanonicalToAtProtoDraft(canonicalEvent);

      assert.strictEqual(draft.collection, 'app.toitoi.inquiry');
      assert.strictEqual(draft.record.text, canonicalEvent.body.text);
      assert.strictEqual(draft.record.createdAt, canonicalEvent.createdAt);
    },
  },
  {
    name: 'convert ATProto transport records back into canonical events',
    run() {
      const canonicalEvent = fromTransportToCanonicalAtProto(makeAtProtoRecord());

      assert.ok(canonicalEvent);
      assert.strictEqual(canonicalEvent.provenance.sources[0].did, 'did:plc:toitoi123');
    },
  },
  {
    name: 'convert canonical events into app.bsky.feed.post drafts',
    run() {
      const canonicalEvent = {
        ...makeAtProtoRecord().record,
      };
      const draft = convertCanonicalToBskyFeedPostDraft({
        body: {
          text: canonicalEvent.text,
          language: canonicalEvent.language,
        },
        createdAt: '2026-05-28T00:00:00.000Z',
      });

      assert.strictEqual(draft.collection, 'app.bsky.feed.post');
      assert.strictEqual(draft.record.text, canonicalEvent.text);
      assert.deepStrictEqual(draft.record.langs, ['ja']);
      assert.strictEqual(draft.record.createdAt, '2026-05-28T00:00:00.000Z');
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
