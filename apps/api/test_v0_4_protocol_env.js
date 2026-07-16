'use strict';

const assert = require('assert');
const http = require('http');
const {
  createToitoiApiServer,
  resolveProtocolName,
} = require('./server_v0_4');

function requestJson(server, pathname) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const request = http.get({
      hostname: '127.0.0.1',
      port: address.port,
      path: pathname,
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          resolve({ statusCode: response.statusCode, body: JSON.parse(body) });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
  });
}

async function run() {
  const previousProtocol = process.env.TOITOI_PROTOCOL;
  process.env.TOITOI_PROTOCOL = 'atproto';

  let server;
  try {
    assert.strictEqual(resolveProtocolName({}), 'atproto');
    assert.strictEqual(resolveProtocolName({ protocol: 'lingonberry' }), 'lingonberry');

    server = createToitoiApiServer();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });

    const protocols = await requestJson(server, '/api/v1/protocols');
    assert.strictEqual(protocols.statusCode, 200);
    assert.strictEqual(protocols.body.selectedProtocol, 'atproto');

    console.log('PASS v0.4 API entrypoint honors TOITOI_PROTOCOL');
  } finally {
    if (server && server.listening) {
      await new Promise(resolve => server.close(resolve));
    }
    if (previousProtocol === undefined) delete process.env.TOITOI_PROTOCOL;
    else process.env.TOITOI_PROTOCOL = previousProtocol;
  }
}

run().catch(error => {
  console.error('FAIL v0.4 API protocol environment contract');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});