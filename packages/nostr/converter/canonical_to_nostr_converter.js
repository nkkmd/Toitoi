#!/usr/bin/env node
/*
 * Canonical JSONL -> Nostr event draft JSONL converter (single-file CLI)
 *
 * Quick start:
 *   node packages/nostr/converter/canonical_to_nostr_converter.js \
 *     --in examples/input-canonical.jsonl \
 *     --out examples/output-nostr.jsonl \
 *     --lineage-map examples/lineage-map.json \
 *     --require-agroecology-tag
 *
 * Input/output:
 * - Both input and output are JSONL (one JSON object per line).
 * - Output is unsigned Nostr event drafts:
 *   { kind, created_at, content, tags }
 *
 * lineage-map format:
 * {
 *   "tt:evt:AAA": "<nostr_event_id>",
 *   "tt:evt:BBB": { "eventId": "<nostr_event_id>", "relay": "wss://relay.example" }
 * }
 *
 * Notes:
 * - --lineage-map is optional, but recommended when using lineage/e tags.
 * - Use --help to see all options.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DEFAULT_KIND = 1042;

function parseArgs(argv) {
  const args = {
    in: null,
    out: null,
    kind: DEFAULT_KIND,
    defaultRelay: '',
    lineageMap: null,
    requireAgroecologyTag: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }

    if (arg === '--require-agroecology-tag') {
      args.requireAgroecologyTag = true;
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

    if (arg.startsWith('--kind=')) {
      args.kind = Number(arg.slice('--kind='.length));
      continue;
    }
    if (arg === '--kind') {
      args.kind = Number(argv[++i]);
      continue;
    }

    if (arg.startsWith('--default-relay=')) {
      args.defaultRelay = arg.slice('--default-relay='.length);
      continue;
    }
    if (arg === '--default-relay') {
      args.defaultRelay = argv[++i] ?? '';
      continue;
    }

    if (arg.startsWith('--lineage-map=')) {
      args.lineageMap = arg.slice('--lineage-map='.length);
      continue;
    }
    if (arg === '--lineage-map') {
      args.lineageMap = argv[++i];
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

    if (!Number.isInteger(args.kind) || args.kind < 0) {
      throw new Error('--kind must be a non-negative integer');
    }
  }

  return args;
}

function printHelp() {
  console.log([
    'Canonical JSONL -> Nostr event draft JSONL converter',
    '',
    'Usage:',
    '  node packages/nostr/converter/canonical_to_nostr_converter.js --in <input.jsonl> --out <output.jsonl> [options]',
    '',
    'Options:',
    '  --kind <number>               Nostr kind (default: 1042)',
    '  --default-relay <url>         fallback relay URL for e tags',
    '  --lineage-map <path>          JSON map for lineage resolution',
    '  --require-agroecology-tag     ensure ["t", "agroecology"] is present',
    '  -h, --help                    show this help',
    '',
    'Lineage map JSON format:',
    '  {',
    '    "tt:evt:AAA": "<nostr_event_id>",',
    '    "tt:evt:BBB": { "eventId": "<nostr_event_id>", "relay": "wss://relay.example" }',
    '  }',
  ].join('\n'));
}

function readLineageMap(filePath) {
  if (!filePath) {
    return new Map();
  }

  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved, 'utf8');
  const parsed = JSON.parse(raw);
  const canonicalToNostr = new Map();

  for (const [canonicalId, value] of Object.entries(parsed)) {
    let item;

    if (typeof value === 'string') {
      item = { eventId: value, relay: '' };
    } else if (value && typeof value === 'object' && typeof value.eventId === 'string') {
      item = {
        eventId: value.eventId,
        relay: typeof value.relay === 'string' ? value.relay : '',
      };
    } else {
      throw new Error(`Invalid lineage-map entry for ${canonicalId}`);
    }

    canonicalToNostr.set(canonicalId, item);
  }

  return canonicalToNostr;
}

function isoToUnixSeconds(isoString) {
  if (typeof isoString !== 'string' || isoString.trim() === '') {
    return Math.floor(Date.now() / 1000);
  }
  const ms = Date.parse(isoString);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid createdAt: ${isoString}`);
  }
  return Math.floor(ms / 1000);
}

function pushTag(tags, ...values) {
  if (values.every(value => typeof value === 'string' && value.length > 0)) {
    tags.push(values);
  }
}

function convertCanonicalToNostrDraft(canonical, options) {
  const tags = [];
  const warnings = [];

  const text = canonical?.body?.text;
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('body.text is required');
  }

  const labels = Array.isArray(canonical.labels)
    ? canonical.labels.filter(label => typeof label === 'string' && label.trim() !== '')
    : [];

  for (const label of labels) {
    pushTag(tags, 't', label);
  }

  if (options.requireAgroecologyTag && !labels.includes('agroecology')) {
    pushTag(tags, 't', 'agroecology');
  }

  if (canonical.contexts && typeof canonical.contexts === 'object' && !Array.isArray(canonical.contexts)) {
    for (const [key, value] of Object.entries(canonical.contexts)) {
      if (typeof value === 'string' && value.trim() !== '') {
        pushTag(tags, 'context', key, value);
      }
    }
  }

  if (Array.isArray(canonical.relationships)) {
    for (const rel of canonical.relationships) {
      pushTag(tags, 'relationship', rel?.source, rel?.target);
    }
  }

  if (typeof canonical.phase === 'string' && canonical.phase.trim() !== '') {
    pushTag(tags, 'phase', canonical.phase);
  }

  if (canonical.trigger && typeof canonical.trigger === 'object') {
    pushTag(tags, 'trigger', canonical.trigger.category, canonical.trigger.value);
  }

  const models = canonical?.dsl?.models;
  if (Array.isArray(models)) {
    for (const model of models) {
      const modelId = model?.id;
      const modelName = model?.name;
      pushTag(tags, 'dsl:model', modelId, modelName);

      if (Array.isArray(model?.variables)) {
        for (const variable of model.variables) {
          pushTag(tags, 'dsl:var', modelId, variable?.name, variable?.role);
        }
      }

      if (Array.isArray(model?.relations)) {
        for (const relation of model.relations) {
          pushTag(tags, 'dsl:rel', modelId, relation?.source, relation?.target);
        }
      }

      if (model?.meta && typeof model.meta === 'object' && !Array.isArray(model.meta)) {
        for (const [metaKey, metaValue] of Object.entries(model.meta)) {
          if (typeof metaValue === 'string' && metaValue.trim() !== '') {
            pushTag(tags, 'dsl:meta', modelId, metaKey, metaValue);
          }
        }
      }
    }
  }

  if (Array.isArray(canonical.lineage)) {
    for (const lin of canonical.lineage) {
      const type = lin?.type;
      const target = lin?.target;
      if (typeof type !== 'string' || typeof target !== 'string') {
        continue;
      }

      const mapped = options.lineageMap.get(target);
      if (!mapped) {
        warnings.push(`lineage target not mapped: ${target}`);
        continue;
      }

      const relay = mapped.relay || options.defaultRelay || '';
      tags.push(['e', mapped.eventId, relay, type]);
    }
  }

  return {
    output: {
      kind: options.kind,
      created_at: isoToUnixSeconds(canonical.createdAt),
      content: text,
      tags,
    },
    warnings,
  };
}

async function convertFile(args) {
  const lineageMap = readLineageMap(args.lineageMap);
  const inPath = path.resolve(args.in);
  const outPath = path.resolve(args.out);

  const input = fs.createReadStream(inPath, { encoding: 'utf8' });
  const output = fs.createWriteStream(outPath, { encoding: 'utf8' });

  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let lineNo = 0;
  let converted = 0;
  let skipped = 0;

  for await (const line of rl) {
    lineNo += 1;
    const trimmed = line.trim();

    if (trimmed === '') {
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      throw new Error(`Line ${lineNo}: invalid JSON (${err.message})`);
    }

    try {
      const { output: convertedRecord, warnings } = convertCanonicalToNostrDraft(parsed, {
        kind: args.kind,
        defaultRelay: args.defaultRelay,
        lineageMap,
        requireAgroecologyTag: args.requireAgroecologyTag,
      });

      output.write(`${JSON.stringify(convertedRecord)}\n`);
      converted += 1;

      for (const warning of warnings) {
        process.stderr.write(`[WARN] line ${lineNo}: ${warning}\n`);
      }
    } catch (err) {
      skipped += 1;
      process.stderr.write(`[SKIP] line ${lineNo}: ${err.message}\n`);
    }
  }

  output.end();

  await new Promise((resolve, reject) => {
    output.on('finish', resolve);
    output.on('error', reject);
  });

  process.stderr.write(
    `[DONE] direction=canonical-to-nostr converted=${converted} skipped=${skipped} output=${outPath}\n`
  );
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    if (args.help) {
      printHelp();
      return;
    }
    await convertFile(args);
  } catch (err) {
    process.stderr.write(`[ERROR] ${err.message}\n`);
    process.exitCode = 1;
  }
}

main();
