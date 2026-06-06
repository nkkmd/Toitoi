'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ingestNostrEvents } = require('./ingest_pipeline');
const { persistIngestResult } = require('../storage/persistence');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeIdentityClaimSigner(input = {}) {
  const method = isNonEmptyString(input.method) ? input.method.trim() : '';
  if (!method || method === 'none') {
    return null;
  }

  const signer = {
    method,
  };

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
    in: null,
    out: null,
    format: 'report',
    skipVerify: true,
    storageDir: null,
    identityClaimSigner: readIdentityClaimSignerFromEnv(),
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }

    if (arg === '--verify') {
      args.skipVerify = false;
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

    if (arg.startsWith('--in=')) {
      args.in = arg.slice('--in='.length);
      continue;
    }
    if (arg === '--in') {
      args.in = argv[++i];
      continue;
    }

    if (arg.startsWith('--out=')) {
      args.out = arg.slice('--out='.length);
      continue;
    }
    if (arg === '--out') {
      args.out = argv[++i];
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
    if (!args.in) {
      throw new Error('--in is required');
    }
    if (!args.out) {
      throw new Error('--out is required');
    }
    if (!['report', 'accepted', 'canonical'].includes(args.format)) {
      throw new Error('--format must be one of: report, accepted, canonical');
    }
  }

  return args;
}

function printHelp() {
  console.log([
    'Nostr JSONL ingest runner',
    '',
    'Usage:',
    '  node packages/nostr/adapter/ingest_jsonl.js --in <raw.jsonl> --out <result.jsonl> [options]',
    '',
    'Options:',
    '  --format report|accepted|canonical  output shape (default: report)',
    '  --verify                            run signature verification when available',
    '  --storage-dir <dir>                 persist raw/canonical/replay logs',
    '  -h, --help                          show this help',
    '',
    'Formats:',
    '  report    one JSON object with accepted/invalid/duplicates/unverified summaries',
    '  accepted  one canonicalized event per line for accepted events',
    '  canonical one canonical event per line for accepted events',
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

async function writeOutput(filePath, format, ingestResult) {
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

  const rawEvents = await readJsonl(args.in);
  const ingestResult = ingestNostrEvents(rawEvents, {
    skipVerify: args.skipVerify,
    identityClaimSigner: args.identityClaimSigner || null,
  });

  if (args.storageDir) {
    persistIngestResult(args.storageDir, ingestResult, {
      source: 'jsonl',
      sourceLabel: path.resolve(args.in),
    });
  }

  await writeOutput(args.out, args.format, ingestResult);

  process.stderr.write(
    `[DONE] ingest=${rawEvents.length} accepted=${ingestResult.accepted.length} invalid=${ingestResult.invalid.length} duplicates=${ingestResult.duplicates.length} unverified=${ingestResult.unverified.length} out=${path.resolve(args.out)}\n`
  );
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  parseArgs,
  printHelp,
  readJsonl,
  readIdentityClaimSignerFromEnv,
  writeOutput,
  main,
  normalizeIdentityClaimSigner,
};
