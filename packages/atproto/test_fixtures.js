'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function makeAtProtoRecord(overrides = {}) {
  return {
    uri: 'at://did:plc:toitoi123/app.toitoi.inquiry/3jv4f4g2h6k7l8m9n0p1q2r3s4',
    cid: 'bafyreib2c4h5j6k7l8m9n0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9',
    did: 'did:plc:toitoi123',
    collection: 'app.toitoi.inquiry',
    rkey: '3jv4f4g2h6k7l8m9n0p1q2r3s4',
    createdAt: '2026-05-28T00:00:00.000Z',
    indexedAt: '2026-05-28T00:00:01.000Z',
    record: {
      type: 'inquiry',
      text: '雑草の生え方が場所によって違うのはなぜ？',
      language: 'ja',
      contexts: {
        climate_zone: 'warm-temperate',
      },
      relationships: [
        { source: 'microclimate', target: 'weed_flora' },
      ],
      phase: 'intermediate',
      labels: ['agroecology'],
      meta: {
        origin: 'bsky.social',
      },
    },
    ...overrides,
  };
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toitoi-atproto-'));
}

module.exports = {
  makeAtProtoRecord,
  makeTempDir,
};
