'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ingestLingonberryEvents } = require('../../../packages/lingonberry/adapter/ingest_pipeline');
const { listObjects } = require('../../../packages/lingonberry/live/http_client');
const { persistIngestResult } = require('../../../packages/lingonberry/storage/persistence');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeIdentityClaimSigner(input = {}) {
  const method = isNonEmptyString(input.method) ? input.method.trim() : '';
  if (!method || method === 'none') {
    return null;
  }

  const signer = { method };
  if (isNonEmptyString(input.ruleVersion)) {
    signer.ruleVersion = input.ruleVersion.trim();
  }
  if (isNonEmptyString(input.keyId)) {
    signer.keyId = input.keyId.trim();
  }
  if (isNonEmptyString(input.publicKey)) {
    signer.publicKey = input.publicKey.trim();
  }
  if (isNonEmptyString(input.privateKey)) {
    signer.privateKey = input.privateKey.trim();
  }

  if (method === 'ed25519' && (!signer.privateKey || !signer.publicKey)) {
    throw new Error('ed25519 identity claim signing requires public and private keys');
  }

  return signer;
}

function readIdentityClaimSignerFromEnv() {
  return normalizeIdentityClaimSigner({
    method: process.env.TOITOI_IDENTITY_CLAIM_METHOD || '',
    keyId: process.env.TOITOI_IDENTITY_CLAIM_KEY_ID || '',
    publicKey: process.env.TOITOI_IDENTITY_CLAIM_PUBLIC_KEY || '',
    privateKey: process.env.TOITOI_IDENTITY_CLAIM_PRIVATE_KEY || '',
    ruleVersion: process.env.TOITOI_IDENTITY_CLAIM_RULE_VERSION || '',
  });
}

function parseArgs(argv) {
  const args = {
    input: process.env.LINGONBERRY_INGEST_INPUT || '',
    archiveDir: process.env.LINGONBERRY_ARCHIVE_DIR || '',
    carrierUrl: process.env.LINGONBERRY_CARRIER_URL || '',
    carrierCursor: process.env.LINGONBERRY_CARRIER_CURSOR || '',
    carrierSince: process.env.LINGONBERRY_CARRIER_SINCE || '',
    carrierLimit: Number.parseInt(process.env.LINGONBERRY_CARRIER_LIMIT || '0', 10),
    output: process.env.LINGONBERRY_INGEST_OUTPUT || '',
    format: process.env.LINGONBERRY_INGEST_FORMAT || 'report',
    verify: process.env.LINGONBERRY_VERIFY === '1',
    storageDir: process.env.LINGONBERRY_STORAGE_DIR || '',
    sourceLabel: process.env.LINGONBERRY_INGEST_SOURCE_LABEL || '',
    batchId: process.env.LINGONBERRY_INGEST_BATCH_ID || '',
    protocol: process.env.LINGONBERRY_PROTOCOL || process.env.TOITOI_PROTOCOL || 'lingonberry',
    identityClaimSigner: readIdentityClaimSignerFromEnv(),
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') {
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    if (arg === '--verify') {
      args.verify = true;
      continue;
    }
    if (arg.startsWith('--protocol=')) {
      args.protocol = arg.slice('--protocol='.length);
      continue;
    }
    if (arg === '--protocol') {
      args.protocol = argv[++i];
      continue;
    }
    if (arg.startsWith('--storage-dir=')) {
      args.storageDir = arg.slice('--storage-dir='.length);
      continue;
    }
    if (arg === '--storage-dir') {
      args.storageDir = argv[++i];
      continue;
    }
    if (arg.startsWith('--source-label=')) {
      args.sourceLabel = arg.slice('--source-label='.length);
      continue;
    }
    if (arg === '--source-label') {
      args.sourceLabel = argv[++i];
      continue;
    }
    if (arg.startsWith('--batch-id=')) {
      args.batchId = arg.slice('--batch-id='.length);
      continue;
    }
    if (arg === '--batch-id') {
      args.batchId = argv[++i];
      continue;
    }
    if (arg.startsWith('--archive-dir=')) {
      args.archiveDir = arg.slice('--archive-dir='.length);
      continue;
    }
    if (arg === '--archive-dir') {
      args.archiveDir = argv[++i];
      continue;
    }
    if (arg.startsWith('--carrier-url=')) {
      args.carrierUrl = arg.slice('--carrier-url='.length);
      continue;
    }
    if (arg === '--carrier-url') {
      args.carrierUrl = argv[++i];
      continue;
    }
    if (arg.startsWith('--carrier-cursor=')) {
      args.carrierCursor = arg.slice('--carrier-cursor='.length);
      continue;
    }
    if (arg === '--carrier-cursor') {
      args.carrierCursor = argv[++i];
      continue;
    }
    if (arg.startsWith('--carrier-since=')) {
      args.carrierSince = arg.slice('--carrier-since='.length);
      continue;
    }
    if (arg === '--carrier-since') {
      args.carrierSince = argv[++i];
      continue;
    }
    if (arg.startsWith('--carrier-limit=')) {
      args.carrierLimit = Number.parseInt(arg.slice('--carrier-limit='.length), 10);
      continue;
    }
    if (arg === '--carrier-limit') {
      args.carrierLimit = Number.parseInt(argv[++i], 10);
      continue;
    }
    if (arg.startsWith('--in=')) {
      args.input = arg.slice('--in='.length);
      continue;
    }
    if (arg === '--in') {
      args.input = argv[++i];
      continue;
    }
    if (arg.startsWith('--out=')) {
      args.output = arg.slice('--out='.length);
      continue;
    }
    if (arg === '--out') {
      args.output = argv[++i];
      continue;
    }
    if (arg.startsWith('--format=')) {
      args.format = arg.slice('--format='.length);
      continue;
    }
    if (arg === '--format') {
      args.format = argv[++i];
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.help) {
    const inputModes = [args.input, args.archiveDir, args.carrierUrl].filter(Boolean).length;
    if (inputModes === 0) {
      throw new Error('one of --in, --archive-dir, or --carrier-url is required');
    }
    if (inputModes > 1) {
      throw new Error('--in, --archive-dir, and --carrier-url are mutually exclusive');
    }
    if (!['report', 'accepted', 'canonical'].includes(args.format)) {
      throw new Error('--format must be one of: report, accepted, canonical');
    }
    if (args.protocol !== 'lingonberry') {
      throw new Error('--protocol must be lingonberry');
    }
    if (!Number.isInteger(args.carrierLimit) || args.carrierLimit < 0) {
      throw new Error('--carrier-limit must be a non-negative integer');
    }
  }

  return args;
}

function printHelp() {
  console.log([
    'Lingonberry ingest runner',
    '',
    'Usage:',
    '  node infra/transports/lingonberry/lingonberry_ingest_worker.js --in <raw.jsonl> [options]',
    '  node infra/transports/lingonberry/lingonberry_ingest_worker.js --archive-dir <archive-dir> [options]',
    '  node infra/transports/lingonberry/lingonberry_ingest_worker.js --carrier-url <https://...> [options]',
    '',
    'Options:',
    '  --format report|accepted|canonical  output shape (default: report)',
    '  --out <path>                        optional output file path',
    '  --verify                            verify HTTP publish signatures',
    '  --storage-dir <dir>                 persist raw/canonical/replay logs',
    '  --source-label <label>              label persisted ingest batch',
    '  --batch-id <id>                     stable batch id for persistence',
    '  --carrier-cursor <cursor>           cursor passed to GET /v1/objects',
    '  --carrier-since <value>             since value passed to GET /v1/objects',
    '  --carrier-limit <n>                 limit passed to GET /v1/objects',
    '  -h, --help                          show this help',
    '',
    'Archive mode:',
    '  Reads <archive-dir>/wire-log.jsonl and parses each record.requestJson as a Lingonberry HTTP publish request.',
    '',
    'Carrier mode:',
    '  Calls GET /v1/objects and ingests the returned objects or publish requests.',
  ].join('\n'));
}

async function readJsonl(filePath) {
  const input = fs.createReadStream(path.resolve(filePath), { encoding: 'utf8' });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  const events = [];

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed === '') {
      continue;
    }
    events.push(JSON.parse(trimmed));
  }

  return events;
}

async function readArchive(archiveDir) {
  const wireLogPath = path.join(path.resolve(archiveDir), 'wire-log.jsonl');
  const records = await readJsonl(wireLogPath);
  return records.map((record, index) => {
    if (typeof record.requestJson !== 'string' || record.requestJson.trim() === '') {
      throw new Error(`archive wire-log record ${index} missing requestJson`);
    }
    return JSON.parse(record.requestJson);
  });
}

function extractCarrierObjects(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('Lingonberry carrier response must be an array or object');
  }

  for (const key of ['objects', 'items', 'records']) {
    if (Array.isArray(payload[key])) {
      return payload[key].map(item => {
        if (item && typeof item === 'object' && item.request) {
          return item.request;
        }
        if (item && typeof item === 'object' && item.requestJson) {
          return JSON.parse(item.requestJson);
        }
        if (item && typeof item === 'object' && item.object && item.publisher) {
          return item;
        }
        if (item && typeof item === 'object' && item.object) {
          return item.object;
        }
        return item;
      });
    }
  }

  throw new Error('Lingonberry carrier response missing objects array');
}

async function readCarrier(carrierUrl, options = {}) {
  const payload = await listObjects({
    carrierUrl,
    cursor: options.cursor || '',
    since: options.since || '',
    limit: options.limit || 0,
  });
  return extractCarrierObjects(payload);
}

function writeResult(filePath, format, ingestResult) {
  if (!filePath) {
    return;
  }

  const outPath = path.resolve(filePath);
  if (format === 'report') {
    const report = {
      accepted: ingestResult.accepted.length,
      invalid: ingestResult.invalid.length,
      duplicates: ingestResult.duplicates.length,
      unverified: ingestResult.unverified.length,
      ordered: ingestResult.orderedEvents.length,
    };
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return;
  }

  const lines = [];
  for (const item of ingestResult.accepted) {
    if (format === 'accepted') {
      lines.push(JSON.stringify({
        rawEvent: item.rawEvent,
        normalizedEvent: item.normalizedEvent,
      }));
      continue;
    }
    lines.push(JSON.stringify(item.canonicalEvent));
  }

  fs.writeFileSync(outPath, `${lines.join('\n')}${lines.length > 0 ? '\n' : ''}`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const rawEvents = args.carrierUrl
    ? await readCarrier(args.carrierUrl, {
      cursor: args.carrierCursor,
      since: args.carrierSince,
      limit: args.carrierLimit,
    })
    : args.archiveDir
      ? await readArchive(args.archiveDir)
      : await readJsonl(args.input);
  const ingestResult = ingestLingonberryEvents(rawEvents, {
    skipVerify: !args.verify,
    identityClaimSigner: args.identityClaimSigner || null,
  });

  if (args.storageDir) {
    const source = args.carrierUrl ? 'carrier' : args.archiveDir ? 'archive' : 'jsonl';
    const sourceLabel = args.sourceLabel || (args.carrierUrl || path.resolve(args.archiveDir || args.input));
    persistIngestResult(args.storageDir, ingestResult, {
      source,
      sourceLabel,
      batchId: args.batchId || undefined,
    });
  }

  writeResult(args.output, args.format, ingestResult);
  process.stderr.write(
    `[DONE] ingest=${rawEvents.length} accepted=${ingestResult.accepted.length} invalid=${ingestResult.invalid.length} duplicates=${ingestResult.duplicates.length} unverified=${ingestResult.unverified.length}${args.output ? ` out=${path.resolve(args.output)}` : ''}\n`
  );
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  extractCarrierObjects,
  main,
  normalizeIdentityClaimSigner,
  parseArgs,
  printHelp,
  readArchive,
  readCarrier,
  readIdentityClaimSignerFromEnv,
  readJsonl,
  writeResult,
};
