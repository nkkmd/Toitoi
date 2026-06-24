'use strict';

const { convertCanonicalToLingonberryObject } = require('../converter/canonical_to_lingonberry_converter');
const { publishObject } = require('./http_client');

async function publishCanonicalEventToLingonberry(canonicalEvent, options = {}) {
  const object = convertCanonicalToLingonberryObject(canonicalEvent, options.converterOptions || {});
  const request = options.request || null;
  const published = await publishObject({
    carrierUrl: options.carrierUrl,
    object,
    request,
    publisher: options.publisher,
    publicKey: options.publicKey,
    privateKey: options.privateKey,
    signature: options.signature,
  });

  return {
    protocol: 'lingonberry',
    object,
    request,
    published,
  };
}

module.exports = {
  publishCanonicalEventToLingonberry,
};
