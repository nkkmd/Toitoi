'use strict';

const fs = require('fs');
const path = require('path');
const { ingestRelayUrl } = require('../../../packages/nostr/adapter/relay_ingest');
const { persistIngestResult } = require('../../../packages/nostr/storage/persistence');

function parseJson(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON value: ${value}`);
  }
}

function parseArgs(argv) {
  const args = {
    relayUrl: process.env.RELAY_URL || '',
    filter: parseJson(process.env.RELAY_FILTER, { kinds: [1042] }),
    output: process.env.RELAY_INGEST_OUTPUT || '',
    format: process.env.RELAY_INGEST_FORMAT || 'report',
    verify: process.env.RELAY_VERIFY === '1',
    storageDir: process.env.RELAY_STORAGE_DIR || '',
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }

    if (arg === '--verify') {
      args.verify = true;
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

    if (arg.startsWith('--relay-url=')) {
      args.relayUrl = arg.slice('--relay-url='.length);
      continue;
    }
    if (arg === '--relay-url') {
      args.relayUrl = argv[++i];
      continue;
    }

    if (arg.startsWith('--filter=')) {
      args.filter = parseJson(arg.slice('--filter='.length), args.filter);
      continue;
    }
    if (arg === '--filter') {
      args.filter = parseJson(argv[++i], args.filter);
      continue;
    }

    if (arg.startsWith('--output=')) {
      args.output = arg.slice('--output='.length);
      continue;
    }
    if (arg === '--output') {
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
    if (!args.relayUrl) {
      throw new Error('--relay-url is required');
    }
    if (!['report', 'accepted', 'canonical'].includes(args.format)) {
      throw new Error('--format must be one of: report, accepted, canonical');
    }
  }

  return args;
}

function printHelp() {
  console.log([
    'Toitoi Nostr relay ingest worker',
    '',
    'Usage:',
    '  node infra/transports/nostr/relay_ingest_worker.js --relay-url <wss://...> [options]',
    '',
    'Options:',
    '  --filter <json>      Nostr subscription filter JSON (default: {"kinds":[1042]})',
    '  --format report|accepted|canonical',
    '  --output <path>      optional output file path',
    '  --verify             run signature verification when available',
    '  --storage-dir <dir>  persist raw/canonical/replay logs',
    '  -h, --help           show this help',
    '',
    'Environment variables:',
    '  RELAY_URL',
    '  RELAY_FILTER',
    '  RELAY_INGEST_OUTPUT',
    '  RELAY_INGEST_FORMAT',
    '  RELAY_VERIFY=1',
  ].join('\n'));
}

function writeResult(outputPath, format, result) {
  if (!outputPath) {
    return;
  }

  const outPath = path.resolve(outputPath);
  if (format === 'report') {
    const report = {
      accepted: result.accepted.length,
      invalid: result.invalid.length,
      duplicates: result.duplicates.length,
      unverified: result.unverified.length,
      ordered: result.orderedEvents.length,
    };
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return;
  }

  const lines = [];
  for (const item of result.accepted) {
    lines.push(JSON.stringify(format === 'accepted' ? item.normalizedEvent : item.canonicalEvent));
  }
  fs.writeFileSync(outPath, `${lines.join('\n')}${lines.length > 0 ? '\n' : ''}`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const result = await ingestRelayUrl(args.relayUrl, args.filter, {
    skipVerify: !args.verify,
  });

  if (args.storageDir) {
    persistIngestResult(args.storageDir, result, {
      source: 'relay',
      sourceLabel: args.relayUrl,
    });
  }

  writeResult(args.output, args.format, result);

  process.stderr.write(
    `[DONE] relay=${args.relayUrl} accepted=${result.accepted.length} invalid=${result.invalid.length} duplicates=${result.duplicates.length} unverified=${result.unverified.length}\n`
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
  writeResult,
  main,
};
