'use strict';

const path = require('path');
const { replayStorage } = require('./replay');
const {
  createProtocolRuntime,
  createProtocolStorageRuntime,
  renderProtocolHelp,
} = require('@toitoi/protocol');

function parseArgs(argv) {
  const args = {
    storageDir: '',
    skipVerify: true,
    noPersistIndex: false,
    protocol: process.env.REPLAY_PROTOCOL || process.env.TOITOI_PROTOCOL || 'nostr',
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

    if (arg === '--no-persist-index') {
      args.noPersistIndex = true;
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

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.help && !args.storageDir) {
    throw new Error('--storage-dir is required');
  }

  return args;
}

function printHelp() {
  const helpProtocol = process.env.REPLAY_PROTOCOL || process.env.TOITOI_PROTOCOL || 'nostr';
  console.log([
    'Toitoi protocol-aware replay CLI',
    '',
    'Usage:',
    '  node packages/nostr/storage/replay_cli.js --storage-dir <dir> [options]',
    '',
    'Options:',
    '  --protocol <name>    protocol to replay (default: nostr)',
    '  --verify              re-run verification when replaying raw events',
    '  --no-persist-index     do not rewrite index-snapshot.json',
    '  -h, --help            show this help',
    '',
    'Input layout:',
    '  raw-events.jsonl',
    '  canonical-events.jsonl',
    '  ingest-log.jsonl',
    '',
    'Output:',
    '  index-snapshot.json',
    '',
    renderProtocolHelp(createProtocolRuntime({ protocol: helpProtocol })),
  ].join('\n'));
}

function summarizeReplayResult(result) {
  return {
    storageDir: result.storageDir,
    rawRecords: result.rawRecords.length,
    canonicalRecords: result.canonicalRecords.length,
    accepted: result.ingestResult.accepted.length,
    invalid: result.ingestResult.invalid.length,
    duplicates: result.ingestResult.duplicates.length,
    unverified: result.ingestResult.unverified.length,
    indexTotal: result.indexSnapshot.total,
    indexSnapshotPath: result.indexSnapshotPath,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const protocolRuntime = createProtocolRuntime({ protocol: args.protocol });
  const protocolStorageRuntime = createProtocolStorageRuntime({
    protocol: args.protocol,
    loadReplayModule(protocol) {
      if (protocol === 'nostr') {
        return { replayStorage };
      }
      if (protocol === 'atproto') {
        return require('@toitoi/atproto/storage/replay');
      }
      return null;
    },
  });
  const replayFn = protocolStorageRuntime.resolveReplayStorage();
  process.stderr.write(
    `[START] protocol=${protocolRuntime.selectedProtocol} storageReplay=${protocolStorageRuntime.describe().supported ? 'available' : 'missing'}\n`
  );

  const result = replayFn(path.resolve(args.storageDir), {
    skipVerify: args.skipVerify,
    persistIndex: !args.noPersistIndex,
  });

  process.stdout.write(`${JSON.stringify(summarizeReplayResult(result), null, 2)}\n`);
  process.stderr.write(
    `[DONE] protocol=${protocolRuntime.selectedProtocol} accepted=${result.ingestResult.accepted.length} invalid=${result.ingestResult.invalid.length} duplicates=${result.ingestResult.duplicates.length} unverified=${result.ingestResult.unverified.length}\n`
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
  parseArgs,
  printHelp,
  summarizeReplayResult,
};
