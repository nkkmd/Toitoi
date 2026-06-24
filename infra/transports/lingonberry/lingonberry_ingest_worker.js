'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ingestLingonberryEvents } = require('../../../packages/lingonberry/adapter/ingest_pipeline');
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
    if (!args.input && !args.archiveDir) {
      throw new Error('either --in or --archive-dir is required');
    }
    if (args.input && args.archiveDir) {
      throw new Error('--in and --archive-dir are mutually exclusive');
    }
    if (!['report', 'accepted', 'canonical'].includes(args.format)) {
      throw new Error('--format must be one of: report, accepted, canonical');
    }
    if (args.protocol !== 'lingonberry') {
      throw new Error('--protocol must be lingonberry');
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
    '',
    'Options:',
    '  --format report|accepted|canonical  output shape (default: report)',
    '  --out <path>                        optional output file path',
    '  --verify                            verify HTTP publish signatures',
    '  --storage-dir <dir>                 persist raw/canonical/replay logs',
    '  --source-label <label>              label persisted ingest batch',
    '  --batch-id <id>                     stable batch id for persistence',
    '  -h, --help                          show this help',
    '',
    'Archive mode:',
    '  Reads <archive-dir>/wire-log.jsonl and parses each record.requestJson as a Lingonberry HTTP publish request.',
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

  const rawEvents = args.archiveDir
    ? await readArchive(args.archiveDir)
    : await readJsonl(args.input);
  const ingestResult = ingestLingonberryEvents(rawEvents, {
    skipVerify: !args.verify,
    identityClaimSigner: args.identityClaimSigner || null,
  });

  if (args.storageDir) {
    persistIngestResult(args.storageDir, ingestResult, {
      source: args.archiveDir ? 'archive' : 'jsonl',
      sourceLabel: args.sourceLabel || path.resolve(args.archiveDir || args.input),
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
  main,
  normalizeIdentityClaimSigner,
  parseArgs,
  printHelp,
  readArchive,
  readIdentityClaimSignerFromEnv,
  readJsonl,
  writeResult,
};
