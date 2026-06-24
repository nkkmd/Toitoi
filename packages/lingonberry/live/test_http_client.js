'use strict';

const assert = require('assert');
const fixture = require('../fixtures/minimal-publish-request.json');
const {
  buildPublishRequest,
  getCapabilities,
  listObjects,
  getObject,
  getReady,
  publishObject,
  resolveCarrierUrl,
} = require('./http_client');

const tests = [
  {
    name: 'resolveCarrierUrl trims trailing slashes',
    run() {
      assert.strictEqual(resolveCarrierUrl({ carrierUrl: 'https://relay.example///' }), 'https://relay.example');
    },
  },
  {
    name: 'buildPublishRequest accepts an explicit signature',
    run() {
      const request = buildPublishRequest(fixture.object, {
        publicKey: fixture.publisher.publicKey,
        signature: fixture.publisher.signature,
      });

      assert.strictEqual(request.object.id, fixture.object.id);
      assert.strictEqual(request.publisher.publicKey, fixture.publisher.publicKey);
      assert.strictEqual(request.publisher.signature, fixture.publisher.signature);
    },
  },
  {
    name: 'publishObject posts to the Lingonberry object endpoint',
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
            status: 'ok',
            id: fixture.object.id,
            canonical: fixture.object,
          }),
        };
      };

      try {
        const payload = await publishObject({
          carrierUrl: 'https://relay.example',
          request: fixture,
        });

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].url, 'https://relay.example/v1/objects');
        assert.strictEqual(calls[0].init.method, 'POST');
        assert.strictEqual(calls[0].init.headers['content-type'], 'application/json');
        assert.strictEqual(JSON.parse(calls[0].init.body).object.id, fixture.object.id);
        assert.strictEqual(payload.id, fixture.object.id);
      } finally {
        global.fetch = originalFetch;
      }
    },
  },
  {
    name: 'listObjects calls the Lingonberry object collection endpoint',
    async run() {
      const originalFetch = global.fetch;
      const calls = [];
      global.fetch = async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ objects: [fixture] }),
        };
      };

      try {
        const payload = await listObjects({
          carrierUrl: 'https://relay.example',
          cursor: 'abc',
          since: '2026-06-24T00:00:00Z',
          limit: 10,
        });

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(
          calls[0].url,
          'https://relay.example/v1/objects?cursor=abc&since=2026-06-24T00%3A00%3A00Z&limit=10',
        );
        assert.strictEqual(calls[0].init.method, 'GET');
        assert.strictEqual(payload.objects[0].object.id, fixture.object.id);
      } finally {
        global.fetch = originalFetch;
      }
    },
  },
  {
    name: 'getObject, getCapabilities, and getReady call carrier endpoints',
    async run() {
      const originalFetch = global.fetch;
      const calls = [];
      global.fetch = async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => JSON.stringify({ status: 'ok' }),
        };
      };

      try {
        await getObject({ carrierUrl: 'https://relay.example', id: 'lb:obj:one' });
        await getCapabilities({ carrierUrl: 'https://relay.example' });
        await getReady({ carrierUrl: 'https://relay.example' });

        assert.deepStrictEqual(calls.map(call => call.url), [
          'https://relay.example/v1/objects/lb%3Aobj%3Aone',
          'https://relay.example/v1/capabilities',
          'https://relay.example/v1/ready',
        ]);
        assert.deepStrictEqual(calls.map(call => call.init.method), ['GET', 'GET', 'GET']);
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
