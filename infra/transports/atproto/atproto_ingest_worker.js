'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ingestAtProtoEvents } = require('../../../packages/atproto/adapter/ingest_pipeline');
const { persistIngestResult } = require('../../../packages/atproto/storage/persistence');

const DEFAULT_WANTED_COLLECTIONS = ['app.toitoi.inquiry'];
const DEFAULT_CURSOR_BUFFER_US = 5_000_000;
const LIVE_REPORT_FORMAT = 'report';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

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

function parseList(value, fallback) {
  if (Array.isArray(value)) {
    return value.filter(isNonEmptyString).map(item => item.trim());
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return fallback.slice();
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(isNonEmptyString).map(item => item.trim());
    }
  } catch (error) {
    // Fall through to CSV parsing.
  }

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const args = {
    input: process.env.ATPROTO_INGEST_INPUT || '',
    streamUrl: process.env.ATPROTO_STREAM_URL || '',
    output: process.env.ATPROTO_INGEST_OUTPUT || '',
    format: process.env.ATPROTO_INGEST_FORMAT || 'report',
    verify: process.env.ATPROTO_VERIFY === '1',
    storageDir: process.env.ATPROTO_STORAGE_DIR || '',
    sourceLabel: process.env.ATPROTO_INGEST_SOURCE_LABEL || '',
    batchId: process.env.ATPROTO_INGEST_BATCH_ID || '',
    protocol: process.env.ATPROTO_PROTOCOL || process.env.TOITOI_PROTOCOL || 'atproto',
    wantedCollections: parseList(
      process.env.ATPROTO_WANTED_COLLECTIONS || '',
      DEFAULT_WANTED_COLLECTIONS
    ),
    cursorBufferUs: Number.parseInt(
      process.env.ATPROTO_CURSOR_BUFFER_US || String(DEFAULT_CURSOR_BUFFER_US),
      10,
    ),
    stateFile: process.env.ATPROTO_STREAM_STATE_FILE || '',
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

    if (arg.startsWith('--wanted-collections=')) {
      args.wantedCollections = parseList(arg.slice('--wanted-collections='.length), args.wantedCollections);
      continue;
    }
    if (arg === '--wanted-collections') {
      args.wantedCollections = parseList(argv[++i], args.wantedCollections);
      continue;
    }

    if (arg.startsWith('--cursor-buffer-us=')) {
      args.cursorBufferUs = Number.parseInt(arg.slice('--cursor-buffer-us='.length), 10);
      continue;
    }
    if (arg === '--cursor-buffer-us') {
      args.cursorBufferUs = Number.parseInt(argv[++i], 10);
      continue;
    }

    if (arg.startsWith('--state-file=')) {
      args.stateFile = arg.slice('--state-file='.length);
      continue;
    }
    if (arg === '--state-file') {
      args.stateFile = argv[++i];
      continue;
    }

    if (arg.startsWith('--stream-url=')) {
      args.streamUrl = arg.slice('--stream-url='.length);
      continue;
    }
    if (arg === '--stream-url') {
      args.streamUrl = argv[++i];
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
    if (!args.input && !args.streamUrl) {
      throw new Error('either --in or --stream-url is required');
    }
    if (args.input && args.streamUrl) {
      throw new Error('--in and --stream-url are mutually exclusive');
    }
    if (!['report', 'accepted', 'canonical'].includes(args.format)) {
      throw new Error('--format must be one of: report, accepted, canonical');
    }
    if (args.streamUrl && args.format !== LIVE_REPORT_FORMAT) {
      throw new Error('--format must be report when using --stream-url');
    }
    if (!args.streamUrl && !args.output) {
      throw new Error('--out is required when using batch ingest');
    }
    if (args.protocol !== 'atproto') {
      throw new Error('--protocol must be atproto');
    }
  }

  if (!Number.isInteger(args.cursorBufferUs) || args.cursorBufferUs < 0) {
    throw new Error('--cursor-buffer-us must be a non-negative integer');
  }

  args.wantedCollections = Array.from(new Set(args.wantedCollections.filter(isNonEmptyString).map(item => item.trim())));
  if (args.wantedCollections.length === 0) {
    args.wantedCollections = DEFAULT_WANTED_COLLECTIONS.slice();
  }

  return args;
}

function printHelp() {
  console.log([
    'Toitoi ATProto ingest worker',
    '',
    'Usage:',
    '  pnpm --filter @toitoi/atproto-transport start -- --in <raw.jsonl> --out <result.jsonl> [options]',
    '  pnpm --filter @toitoi/atproto-transport start -- --stream-url <wss://...> [options]',
    '',
    'Modes:',
    '  batch  ingest a JSONL archive once and exit',
    '  live   connect to ATProto Jetstream and keep ingesting until stopped',
    '',
    'Options:',
    '  --protocol <name>          protocol to use for ingest (default: atproto)',
    '  --source-label <txt>       label stored in append-only logs',
    '  --batch-id <id>            stable batch identifier for append-only logs',
    '  --wanted-collections <csv> Jetstream collection filter (default: app.toitoi.inquiry)',
    '  --cursor-buffer-us <n>     rewind buffer on reconnect (default: 5000000)',
    '  --state-file <path>        live stream cursor state file',
    '  --format report|accepted|canonical',
    '  --out <path>               output file path',
    '  --verify                   attempt verification when available',
    '  --storage-dir <dir>        persist raw/canonical/ingest logs',
    '  -h, --help                 show this help',
    '',
    'Batch formats:',
    '  report    one JSON object with accepted/invalid/duplicates/unverified summaries',
    '  accepted  one normalized ATProto event per line for accepted events',
    '  canonical one canonical event per line for accepted events',
    '',
    'Live mode:',
    '  report is the only supported format; the worker writes a rolling status snapshot',
  ].join('\n'));
}

async function readJsonl(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('input path is required');
  }

  if (filePath === '-') {
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    });
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

function resolveStateFile(args) {
  if (isNonEmptyString(args.stateFile)) {
    return path.resolve(args.stateFile);
  }

  if (isNonEmptyString(args.storageDir)) {
    return path.join(path.resolve(args.storageDir), 'atproto-stream-state.json');
  }

  return '';
}

function loadStreamState(stateFile) {
  if (!isNonEmptyString(stateFile) || !fs.existsSync(stateFile)) {
    return {
      lastCursorUs: null,
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return {
      lastCursorUs: Number.isInteger(parsed.lastCursorUs) ? parsed.lastCursorUs : null,
    };
  } catch (error) {
    return {
      lastCursorUs: null,
    };
  }
}

function saveStreamState(stateFile, state) {
  if (!isNonEmptyString(stateFile)) {
    return;
  }

  const payload = {
    lastCursorUs: Number.isInteger(state.lastCursorUs) ? state.lastCursorUs : null,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(stateFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function buildJetstreamUrl(streamUrl, wantedCollections, cursorUs) {
  const url = new URL(streamUrl);

  for (const collection of wantedCollections) {
    url.searchParams.append('wantedCollections', collection);
  }

  if (Number.isInteger(cursorUs) && cursorUs >= 0) {
    url.searchParams.set('cursor', String(cursorUs));
  }

  return url.toString();
}

function toAtProtoRecordFromJetstreamMessage(message, options = {}) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const kind = isNonEmptyString(message.kind) ? message.kind.trim() : '';
  if (kind !== 'commit') {
    return null;
  }

  const commit = message.commit && typeof message.commit === 'object' ? message.commit : {};
  const operation = isNonEmptyString(commit.operation) ? commit.operation.trim() : '';
  if (operation === 'delete') {
    return null;
  }

  const did = isNonEmptyString(message.did)
    ? message.did.trim()
    : isNonEmptyString(commit.did)
      ? commit.did.trim()
      : '';
  const collection = isNonEmptyString(commit.collection)
    ? commit.collection.trim()
    : isNonEmptyString(commit.path)
      ? commit.path.trim()
      : '';
  const rkey = isNonEmptyString(commit.rkey) ? commit.rkey.trim() : '';
  const record = commit.record && typeof commit.record === 'object' ? commit.record : null;

  if (!isNonEmptyString(did) || !isNonEmptyString(collection) || !isNonEmptyString(rkey) || !record) {
    return null;
  }

  const timeUs = Number.parseInt(message.time_us ?? commit.time_us ?? '', 10);
  const indexedAt = Number.isFinite(timeUs)
    ? new Date(Math.floor(timeUs / 1000)).toISOString()
    : new Date().toISOString();
  const createdAt = isNonEmptyString(record.createdAt)
    ? record.createdAt.trim()
    : indexedAt;
  const uri = `at://${did}/${collection}/${rkey}`;

  return {
    uri,
    cid: isNonEmptyString(commit.cid) ? commit.cid.trim() : '',
    did,
    collection,
    rkey,
    createdAt,
    indexedAt,
    record,
    source: options.source ?? 'jetstream',
  };
}

function makeEmptyLiveSummary(args) {
  return {
    accepted: 0,
    invalid: 0,
    duplicates: 0,
    unverified: 0,
    ordered: 0,
    lastCursorUs: null,
    streamUrl: args.streamUrl,
    wantedCollections: args.wantedCollections.slice(),
    protocol: args.protocol,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function writeLiveSummary(outputPath, summary) {
  if (!outputPath) {
    return;
  }

  const outPath = path.resolve(outputPath);
  fs.writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

async function ingestBatch(rawEvents, args, context = {}) {
  const ingestResult = ingestAtProtoEvents(rawEvents, {
    skipVerify: !args.verify,
  });

  if (args.storageDir) {
    persistIngestResult(args.storageDir, ingestResult, {
      source: context.source ?? 'jsonl',
      sourceLabel: context.sourceLabel ?? (args.sourceLabel || ''),
      batchId: context.batchId ?? (args.batchId || undefined),
    });
  }

  return ingestResult;
}

async function runBatch(args) {
  const rawEvents = await readJsonl(args.input);
  const ingestResult = await ingestBatch(rawEvents, args, {
    source: 'jsonl',
    sourceLabel: args.sourceLabel || path.resolve(args.input),
    batchId: args.batchId || undefined,
  });

  writeResult(args.output, args.format, ingestResult);

  process.stderr.write(
    `[DONE] mode=batch protocol=${args.protocol} input=${path.resolve(args.input)} accepted=${ingestResult.accepted.length} invalid=${ingestResult.invalid.length} duplicates=${ingestResult.duplicates.length} unverified=${ingestResult.unverified.length}\n`
  );
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function connectToJetstream(streamUrl, onMessage, onLifecycle = {}) {
  let WebSocketClient;
  try {
    WebSocketClient = require('ws');
  } catch (error) {
    throw new Error('ws is required for live ATProto ingest');
  }

  return new Promise((resolve, reject) => {
    const socket = new WebSocketClient(streamUrl);
    let closed = false;

    socket.on('open', () => {
      if (typeof onLifecycle.onOpen === 'function') {
        onLifecycle.onOpen();
      }
    });

    socket.on('message', data => {
      let payload;
      try {
        payload = JSON.parse(data.toString());
      } catch (error) {
        if (typeof onLifecycle.onError === 'function') {
          onLifecycle.onError(error instanceof Error ? error : new Error(String(error)));
        }
        return;
      }

      onMessage(payload).catch(error => {
        if (typeof onLifecycle.onError === 'function') {
          onLifecycle.onError(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });

    socket.on('close', (code, reason) => {
      if (closed) {
        return;
      }
      closed = true;
      resolve({
        code,
        reason: reason ? reason.toString() : '',
      });
    });

    socket.on('error', error => {
      if (typeof onLifecycle.onError === 'function') {
        onLifecycle.onError(error instanceof Error ? error : new Error(String(error)));
      }
      if (!closed) {
        closed = true;
        reject(error);
      }
    });
  });
}

async function runLive(args) {
  const stateFile = resolveStateFile(args);
  const existingState = loadStreamState(stateFile);
  const initialCursorUs = Number.isInteger(existingState.lastCursorUs)
    ? Math.max(0, existingState.lastCursorUs - args.cursorBufferUs)
    : null;
  const liveSummary = makeEmptyLiveSummary(args);
  const batchId = isNonEmptyString(args.batchId)
    ? args.batchId.trim()
    : `live-${process.pid}-${Date.now()}`;
  let shutdownRequested = false;
  let lastSeenCursorUs = Number.isInteger(existingState.lastCursorUs) ? existingState.lastCursorUs : null;
  let cursorUsForNextConnect = initialCursorUs;

  const shutdown = () => {
    shutdownRequested = true;
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  process.stderr.write(
    `[START] mode=live protocol=${args.protocol} stream=${args.streamUrl} collections=${args.wantedCollections.join(',')} cursor=${initialCursorUs ?? 'none'}\n`
  );

  while (!shutdownRequested) {
    const streamUrl = buildJetstreamUrl(args.streamUrl, args.wantedCollections, cursorUsForNextConnect);
    process.stderr.write(
      `[CONNECT] stream=${streamUrl}\n`
    );

    let processedInThisConnection = 0;
    let pending = Promise.resolve();

    try {
      await connectToJetstream(
        streamUrl,
        async payload => {
          pending = pending.then(async () => {
            const timeUs = Number.parseInt(payload?.time_us ?? payload?.commit?.time_us ?? '', 10);
            const rawEvent = toAtProtoRecordFromJetstreamMessage(payload);

            if (Number.isFinite(timeUs)) {
              lastSeenCursorUs = timeUs;
              liveSummary.lastCursorUs = timeUs;
              saveStreamState(stateFile, {
                lastCursorUs: timeUs,
              });
            }

            if (!rawEvent) {
              return;
            }

            const ingestResult = await ingestBatch([rawEvent], args, {
              source: 'jetstream',
              sourceLabel: args.sourceLabel || args.streamUrl,
              batchId,
            });

            liveSummary.accepted += ingestResult.accepted.length;
            liveSummary.invalid += ingestResult.invalid.length;
            liveSummary.duplicates += ingestResult.duplicates.length;
            liveSummary.unverified += ingestResult.unverified.length;
            liveSummary.ordered += ingestResult.orderedEvents.length;
            liveSummary.updatedAt = new Date().toISOString();
            processedInThisConnection += 1;

            writeLiveSummary(args.output, liveSummary);
          }).catch(error => {
            process.stderr.write(
              `[WARN] ingest failed: ${error instanceof Error ? error.message : String(error)}\n`
            );
          });

          return pending;
        },
        {
          onOpen() {
            process.stderr.write(
              `[OPEN] stream=${args.streamUrl} collections=${args.wantedCollections.length}\n`
            );
          },
          onError(error) {
            process.stderr.write(
              `[WARN] stream-error=${error instanceof Error ? error.message : String(error)}\n`
            );
          },
        }
      );
    } catch (error) {
      if (shutdownRequested) {
        break;
      }
      process.stderr.write(
        `[WARN] connect failed: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }

    await pending;

    if (shutdownRequested) {
      break;
    }

    const reconnectCursorUs = Number.isInteger(lastSeenCursorUs)
      ? Math.max(0, lastSeenCursorUs - args.cursorBufferUs)
      : null;
    cursorUsForNextConnect = reconnectCursorUs;
    process.stderr.write(
      `[RETRY] stream closed; reconnecting after 3000ms cursor=${reconnectCursorUs ?? 'none'} processed=${processedInThisConnection}\n`
    );
    await sleep(3000);
  }

  writeLiveSummary(args.output, liveSummary);
  process.stderr.write(
    `[DONE] mode=live protocol=${args.protocol} stream=${args.streamUrl} accepted=${liveSummary.accepted} invalid=${liveSummary.invalid} duplicates=${liveSummary.duplicates} unverified=${liveSummary.unverified}\n`
  );
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (args.streamUrl) {
    await runLive(args);
    return;
  }

  await runBatch(args);
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
  writeResult,
  resolveStateFile,
  loadStreamState,
  saveStreamState,
  buildJetstreamUrl,
  toAtProtoRecordFromJetstreamMessage,
  ingestBatch,
  runBatch,
  runLive,
  main,
};
