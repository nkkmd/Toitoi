'use strict';

const fs = require('fs');
const path = require('path');
const { persistIngestResult } = require('@toitoi/nostr/storage/persistence');
const {
  createProtocolRuntime,
  renderProtocolHelp,
} = require('@toitoi/protocol');

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
    protocol: process.env.RELAY_PROTOCOL || process.env.TOITOI_PROTOCOL || 'nostr',
    retry: {
      retries: Number.parseInt(process.env.RELAY_RETRY_ATTEMPTS || '3', 10),
      initialDelayMs: Number.parseInt(process.env.RELAY_RETRY_INITIAL_DELAY_MS || '1000', 10),
      maxDelayMs: Number.parseInt(process.env.RELAY_RETRY_MAX_DELAY_MS || '10000', 10),
      factor: Number.parseFloat(process.env.RELAY_RETRY_FACTOR || '2'),
    },
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

    if (arg.startsWith('--protocol=')) {
      args.protocol = arg.slice('--protocol='.length);
      continue;
    }
    if (arg === '--protocol') {
      args.protocol = argv[++i];
      continue;
    }

    if (arg.startsWith('--retry-attempts=')) {
      args.retry.retries = Number.parseInt(arg.slice('--retry-attempts='.length), 10);
      continue;
    }
    if (arg === '--retry-attempts') {
      args.retry.retries = Number.parseInt(argv[++i], 10);
      continue;
    }

    if (arg.startsWith('--retry-initial-delay-ms=')) {
      args.retry.initialDelayMs = Number.parseInt(arg.slice('--retry-initial-delay-ms='.length), 10);
      continue;
    }
    if (arg === '--retry-initial-delay-ms') {
      args.retry.initialDelayMs = Number.parseInt(argv[++i], 10);
      continue;
    }

    if (arg.startsWith('--retry-max-delay-ms=')) {
      args.retry.maxDelayMs = Number.parseInt(arg.slice('--retry-max-delay-ms='.length), 10);
      continue;
    }
    if (arg === '--retry-max-delay-ms') {
      args.retry.maxDelayMs = Number.parseInt(argv[++i], 10);
      continue;
    }

    if (arg.startsWith('--retry-factor=')) {
      args.retry.factor = Number.parseFloat(arg.slice('--retry-factor='.length));
      continue;
    }
    if (arg === '--retry-factor') {
      args.retry.factor = Number.parseFloat(argv[++i]);
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

  if (!Number.isInteger(args.retry.retries) || args.retry.retries < 0) {
    throw new Error('--retry-attempts must be a non-negative integer');
  }
  if (!Number.isInteger(args.retry.initialDelayMs) || args.retry.initialDelayMs < 0) {
    throw new Error('--retry-initial-delay-ms must be a non-negative integer');
  }
  if (!Number.isInteger(args.retry.maxDelayMs) || args.retry.maxDelayMs < args.retry.initialDelayMs) {
    throw new Error('--retry-max-delay-ms must be an integer greater than or equal to initial delay');
  }
  if (!(typeof args.retry.factor === 'number' && args.retry.factor > 1)) {
    throw new Error('--retry-factor must be greater than 1');
  }

  return args;
}

function printHelp(runtime = createProtocolRuntime()) {
  console.log([
    'Toitoi protocol-aware relay ingest worker',
    '',
    'Usage:',
    '  pnpm --filter @toitoi/nostr-transport start -- --relay-url <wss://...> [options]',
    '',
    'Options:',
    '  --protocol <name>    protocol to use for relay ingest (default: nostr)',
    '  --filter <json>      Nostr subscription filter JSON (default: {"kinds":[1042]})',
    '  --format report|accepted|canonical',
    '  --output <path>      optional output file path',
    '  --verify             run signature verification when available',
    '  --storage-dir <dir>  persist raw/canonical/replay logs',
    '  --retry-attempts <n>          retry count for transient relay errors (default: 3)',
    '  --retry-initial-delay-ms <n>  initial retry delay in ms (default: 1000)',
    '  --retry-max-delay-ms <n>      maximum retry delay in ms (default: 10000)',
    '  --retry-factor <n>            backoff multiplier (default: 2)',
    '  -h, --help           show this help',
    '',
    'Environment variables:',
    '  RELAY_URL',
    '  RELAY_PROTOCOL',
    '  RELAY_FILTER',
    '  RELAY_INGEST_OUTPUT',
    '  RELAY_INGEST_FORMAT',
    '  RELAY_VERIFY=1',
    '  RELAY_RETRY_ATTEMPTS',
    '  RELAY_RETRY_INITIAL_DELAY_MS',
    '  RELAY_RETRY_MAX_DELAY_MS',
    '  RELAY_RETRY_FACTOR',
    '',
    renderProtocolHelp(runtime),
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
    printHelp(createProtocolRuntime({ protocol: args.protocol }));
    return;
  }

  const protocolRuntime = createProtocolRuntime({ protocol: args.protocol });
  const protocolDescriptor = protocolRuntime.selectedDescriptor
    || protocolRuntime.resolveProtocol(args.protocol);
  const ingestRelayUrl = protocolDescriptor?.adapter?.ingestFromRelayUrl;

  if (typeof ingestRelayUrl !== 'function') {
    throw new Error(`Protocol ${protocolDescriptor.protocol} does not support relay ingest`);
  }

  process.stderr.write(
    `[START] protocol=${protocolDescriptor.protocol} name=${protocolDescriptor.name} available=${protocolRuntime.availableProtocols.join(',')}\n`
  );

  const result = await ingestRelayUrl(args.relayUrl, args.filter, {
    skipVerify: !args.verify,
    retry: args.retry,
    onRetry({ attempt, retries, delayMs, error }) {
      process.stderr.write(
        `[RETRY] relay=${args.relayUrl} attempt=${attempt}/${retries} delayMs=${delayMs} reason=${error instanceof Error ? error.message : String(error)}\n`
      );
    },
  });

  if (args.storageDir) {
    persistIngestResult(args.storageDir, result, {
      source: protocolDescriptor.protocol,
      sourceLabel: args.relayUrl,
    });
  }

  writeResult(args.output, args.format, result);

  process.stderr.write(
    `[DONE] protocol=${protocolDescriptor.protocol} relay=${args.relayUrl} accepted=${result.accepted.length} invalid=${result.invalid.length} duplicates=${result.duplicates.length} unverified=${result.unverified.length}\n`
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
