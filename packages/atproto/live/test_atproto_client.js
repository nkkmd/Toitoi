'use strict';

const assert = require('assert');
const {
  extractRecordRkey,
  getRecord,
} = require('./atproto_client');

const tests = [
  {
    name: 'extractRecordRkey parses the final ATProto path segment',
    run() {
      assert.strictEqual(
        extractRecordRkey('at://did:plc:toitoi123/app.toitoi.inquiry/3jv4f4g2h6k7l8m9n0p1q2r3s4'),
        '3jv4f4g2h6k7l8m9n0p1q2r3s4',
      );
    },
  },
  {
    name: 'getRecord calls the PDS record lookup endpoint',
    async run() {
      const originalFetch = global.fetch;
      const calls = [];

      global.fetch = async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({
            uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/abc123',
            cid: 'bafyrecordcid',
            value: {
              text: 'hello',
              type: 'inquiry',
              language: 'en',
              createdAt: '2026-06-02T00:00:00.000Z',
            },
          }),
        };
      };

      try {
        const payload = await getRecord({
          pdsHost: 'https://pds.example',
          repo: 'did:plc:toitoi123',
          collection: 'app.toitoi.inquiry',
          uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/abc123',
        });

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(
          calls[0].url,
          'https://pds.example/xrpc/com.atproto.repo.getRecord?repo=did%3Aplc%3Atoitoi123&collection=app.toitoi.inquiry&rkey=abc123',
        );
        assert.strictEqual(calls[0].init.method, 'GET');
        assert.strictEqual(calls[0].init.headers['content-type'], 'application/json');
        assert.strictEqual(calls[0].init.headers.authorization, undefined);
        assert.strictEqual(payload.value.text, 'hello');
        assert.strictEqual(payload.uri, 'at://did:plc:toitoi123/app.toitoi.inquiry/abc123');
      } finally {
        global.fetch = originalFetch;
      }
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

run();
