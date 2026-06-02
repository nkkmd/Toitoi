'use strict';

const assert = require('assert');
const {
  convertCanonicalToAtProtoDraft,
  convertCanonicalToBskyFeedPostDraft,
} = require('./converter/canonical_to_atproto_converter');
const { createRecord, createSession, extractRecordRkey, getRecord } = require('./live/atproto_client');

function isEnabled() {
  return process.env.ATPROTO_LIVE_SMOKE_TEST === '1';
}

function makeSmokeCanonical() {
  return {
    id: 'tt:evt:01H8JQK7YB0B4Z1K0P0W0M0N0P',
    schemaVersion: '0.3.1',
    type: 'inquiry',
    createdAt: new Date().toISOString(),
    body: {
      text: 'Toitoi ATProto live smoke test.',
      language: 'en',
    },
    provenance: {
      sources: [
        {
          protocol: 'atproto',
          sourceId: 'smoke',
        },
      ],
    },
  };
}

const tests = [
  {
    name: 'ATProto live smoke test writes one gated record to bsky.social',
    async run() {
      if (!isEnabled()) {
        console.log('[SKIP] ATProto live smoke test is gated by ATPROTO_LIVE_SMOKE_TEST=1');
        return;
      }

      const canonical = makeSmokeCanonical();
      const draft = convertCanonicalToAtProtoDraft(canonical);
      const session = await createSession();

      assert.ok(session && typeof session.accessJwt === 'string');
      assert.ok(session && typeof session.did === 'string');

      const created = await createRecord({
        accessJwt: session.accessJwt,
        repo: session.did,
        collection: draft.collection,
        record: draft.record,
      });

      assert.ok(created && typeof created.uri === 'string');
      assert.ok(created && typeof created.cid === 'string');

      const fetched = await getRecord({
        repo: session.did,
        collection: draft.collection,
        uri: created.uri,
      });

      assert.ok(fetched && typeof fetched.value === 'object');
      assert.strictEqual(fetched.uri, created.uri);
      assert.strictEqual(fetched.cid, created.cid);
      assert.strictEqual(extractRecordRkey(fetched.uri), created.uri.split('/').pop());
      assert.deepStrictEqual(Object.keys(fetched.value).sort(), Object.keys(draft.record).sort());
      assert.strictEqual(fetched.value.text, draft.record.text);
      assert.strictEqual(fetched.value.type, draft.record.type);
      assert.strictEqual(fetched.value.language, draft.record.language);
      assert.strictEqual(fetched.value.createdAt, draft.record.createdAt);
      console.log(`PASS live smoke write ${created.uri}`);
    },
  },
  {
    name: 'ATProto feed post compatibility projection is available',
    run() {
      const canonical = makeSmokeCanonical();
      const draft = convertCanonicalToBskyFeedPostDraft(canonical);

      assert.strictEqual(draft.collection, 'app.bsky.feed.post');
      assert.strictEqual(draft.record.text, canonical.body.text);
      assert.deepStrictEqual(draft.record.langs, ['en']);
      assert.strictEqual(typeof draft.record.createdAt, 'string');
    },
  },
];

async function run() {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
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
