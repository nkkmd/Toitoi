#!/usr/bin/env node
/*
 * Canonical JSONL <-> Nostr JSONL converter (single-file CLI)
 *
 * Quick start:
 *   node tools/canonical_nostr_converter.js \
 *     --direction canonical-to-nostr \
 *     --in examples/input-canonical.jsonl \
 *     --out examples/output-nostr.jsonl \
 *     --lineage-map examples/lineage-map.json \
 *     --require-agroecology-tag
 *
 *   node tools/canonical_nostr_converter.js \
 *     --direction nostr-to-canonical \
 *     --in examples/sample-nostr-archive.jsonl \
 *     --out examples/output-canonical.jsonl \
 *     --lineage-map examples/lineage-map.json
 *
 * Input/output:
 * - Both input and output are JSONL (one JSON object per line).
 * - canonical-to-nostr outputs unsigned Nostr event drafts:
 *   { kind, created_at, content, tags }
 * - nostr-to-canonical outputs canonical objects:
 *   { id, schemaVersion, type, author, createdAt, body, ... }
 *
 * lineage-map format:
 * {
 *   "tt:obj:AAA": "<nostr_event_id>",
 *   "tt:obj:BBB": { "eventId": "<nostr_event_id>", "relay": "wss://relay.example" }
 * }
 *
 * Notes:
 * - --lineage-map is optional, but recommended when using lineage/e tags.
 * - If nostr input has no id/pubkey (draft), fallback canonical id/author is generated.
 * - Use --help to see all options.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DEFAULT_KIND = 1042;
const DEFAULT_DIRECTION = 'canonical-to-nostr';
const DIRECTION_CANONICAL_TO_NOSTR = 'canonical-to-nostr';
const DIRECTION_NOSTR_TO_CANONICAL = 'nostr-to-canonical';

function parseArgs(argv) {
  const args = {
    in: null,
    out: null,
    kind: DEFAULT_KIND,
    defaultRelay: '',
    lineageMap: null,
    requireAgroecologyTag: false,
    direction: DEFAULT_DIRECTION,
    schemaVersion: '0.2.0',
    canonicalType: 'inquiry',
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

    if (arg.startsWith('--direction=')) {
      args.direction = arg.slice('--direction='.length);
      continue;
    }
    if (arg === '--direction') {
      args.direction = argv[++i];
      continue;
    }

    if (arg.startsWith('--schema-version=')) {
      args.schemaVersion = arg.slice('--schema-version='.length);
      continue;
    }
    if (arg === '--schema-version') {
      args.schemaVersion = argv[++i];
      continue;
    }

    if (arg.startsWith('--canonical-type=')) {
      args.canonicalType = arg.slice('--canonical-type='.length);
      continue;
    }
    if (arg === '--canonical-type') {
      args.canonicalType = argv[++i];
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

    if (
      args.direction !== DIRECTION_CANONICAL_TO_NOSTR &&
      args.direction !== DIRECTION_NOSTR_TO_CANONICAL
    ) {
      throw new Error(
        `--direction must be one of: ${DIRECTION_CANONICAL_TO_NOSTR}, ${DIRECTION_NOSTR_TO_CANONICAL}`
      );
    }

    if (!Number.isInteger(args.kind) || args.kind < 0) {
      throw new Error('--kind must be a non-negative integer');
    }
  }

  return args;
}

function printHelp() {
  console.log([
    'Canonical JSONL <-> Nostr Event Draft JSONL converter',
    '',
    'Usage:',
    '  node tools/canonical_nostr_converter.js --in <input.jsonl> --out <output.jsonl> [options]',
    '',
    'Options:',
    `  --direction <value>           ${DIRECTION_CANONICAL_TO_NOSTR} | ${DIRECTION_NOSTR_TO_CANONICAL}`,
    '                               (default: canonical-to-nostr)',
    '  --kind <number>               Nostr kind for canonical-to-nostr (default: 1042)',
    '  --default-relay <url>         fallback relay URL for e tags',
    '  --lineage-map <path>          JSON map for lineage resolution (both directions)',
    '  --require-agroecology-tag     ensure ["t", "agroecology"] is present (canonical-to-nostr)',
    '  --schema-version <value>      canonical schemaVersion (nostr-to-canonical, default: 0.2.0)',
    '  --canonical-type <value>      canonical type (nostr-to-canonical, default: inquiry)',
    '  -h, --help                    show this help',
    '',
    'Lineage map JSON format:',
    '  {',
    '    "tt:obj:AAA": "<nostr_event_id>",',
    '    "tt:obj:BBB": { "eventId": "<nostr_event_id>", "relay": "wss://relay.example" }',
    '  }',
  ].join('\n'));
}

function readLineageMap(filePath) {
  if (!filePath) {
    return { canonicalToNostr: new Map(), nostrToCanonical: new Map() };
  }

  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved, 'utf8');
  const parsed = JSON.parse(raw);
  const canonicalToNostr = new Map();
  const nostrToCanonical = new Map();

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
    if (!nostrToCanonical.has(item.eventId)) {
      nostrToCanonical.set(item.eventId, canonicalId);
    }
  }

  return { canonicalToNostr, nostrToCanonical };
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

function unixSecondsToIso(seconds) {
  if (!Number.isFinite(seconds)) {
    return new Date().toISOString();
  }
  return new Date(seconds * 1000).toISOString();
}

function pushTag(tags, ...values) {
  if (values.every(v => typeof v === 'string' && v.length > 0)) {
    tags.push(values);
  }
}

function canonicalIdFromNostrEvent(event) {
  if (typeof event.id === 'string' && event.id.length > 0) {
    return `tt:obj:nostr:${event.id}`;
  }

  const pub = typeof event.pubkey === 'string' ? event.pubkey.slice(0, 16) : 'unknown';
  const ts = Number.isFinite(event.created_at) ? String(event.created_at) : String(Math.floor(Date.now() / 1000));
  return `tt:obj:nostr:${pub}:${ts}`;
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

      const mapped = options.lineageMaps.canonicalToNostr.get(target);
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

function convertNostrToCanonical(event, options) {
  const warnings = [];
  const tags = Array.isArray(event.tags) ? event.tags : [];

  const labels = [];
  const contexts = {};
  const relationships = [];
  const lineage = [];
  const modelMap = new Map();

  let phase;
  let trigger;
  let language;

  function getOrCreateModel(modelId) {
    if (!modelMap.has(modelId)) {
      modelMap.set(modelId, {
        id: modelId,
        name: '',
        variables: [],
        relations: [],
        meta: {},
      });
    }
    return modelMap.get(modelId);
  }

  for (const rawTag of tags) {
    if (!Array.isArray(rawTag) || rawTag.length === 0) {
      continue;
    }

    const key = rawTag[0];

    if (key === 't' && typeof rawTag[1] === 'string' && rawTag[1] !== '') {
      labels.push(rawTag[1]);
      continue;
    }

    if (key === 'context' && typeof rawTag[1] === 'string' && typeof rawTag[2] === 'string') {
      contexts[rawTag[1]] = rawTag[2];
      continue;
    }

    if (key === 'relationship' && typeof rawTag[1] === 'string' && typeof rawTag[2] === 'string') {
      relationships.push({ source: rawTag[1], target: rawTag[2] });
      continue;
    }

    if (key === 'phase' && typeof rawTag[1] === 'string' && !phase) {
      phase = rawTag[1];
      continue;
    }

    if (key === 'trigger' && typeof rawTag[1] === 'string' && typeof rawTag[2] === 'string' && !trigger) {
      trigger = { category: rawTag[1], value: rawTag[2] };
      continue;
    }

    if ((key === 'lang' || key === 'language') && typeof rawTag[1] === 'string' && !language) {
      language = rawTag[1];
      continue;
    }

    if (key === 'e' && typeof rawTag[1] === 'string') {
      const parentEventId = rawTag[1];
      const marker = typeof rawTag[3] === 'string' && rawTag[3] !== '' ? rawTag[3] : 'derived_from';
      const mappedCanonicalId = options.lineageMaps.nostrToCanonical.get(parentEventId);
      lineage.push({
        type: marker,
        target: mappedCanonicalId || `tt:obj:nostr:${parentEventId}`,
      });
      if (!mappedCanonicalId) {
        warnings.push(`lineage parent not mapped: ${parentEventId}`);
      }
      continue;
    }

    if (key === 'dsl:model' && typeof rawTag[1] === 'string' && typeof rawTag[2] === 'string') {
      const model = getOrCreateModel(rawTag[1]);
      model.name = rawTag[2];
      continue;
    }

    if (key === 'dsl:var' && typeof rawTag[1] === 'string' && typeof rawTag[2] === 'string') {
      const model = getOrCreateModel(rawTag[1]);
      if (typeof rawTag[3] === 'string' && rawTag[3] !== '') {
        model.variables.push({ name: rawTag[2], role: rawTag[3] });
      } else {
        model.variables.push({ name: rawTag[2], role: 'independent' });
        warnings.push(`dsl:var missing role for model=${rawTag[1]} name=${rawTag[2]}; defaulted to independent`);
      }
      continue;
    }

    if (key === 'dsl:rel' && typeof rawTag[1] === 'string' && typeof rawTag[2] === 'string' && typeof rawTag[3] === 'string') {
      const model = getOrCreateModel(rawTag[1]);
      model.relations.push({ source: rawTag[2], target: rawTag[3] });
      continue;
    }

    if (key === 'dsl:meta' && typeof rawTag[1] === 'string' && typeof rawTag[2] === 'string') {
      const model = getOrCreateModel(rawTag[1]);
      model.meta[rawTag[2]] = typeof rawTag[3] === 'string' ? rawTag[3] : '';
      continue;
    }
  }

  const models = Array.from(modelMap.values()).map(model => {
    const normalized = {
      id: model.id,
      name: model.name || model.id,
    };
    if (model.variables.length > 0) {
      normalized.variables = model.variables;
    }
    if (model.relations.length > 0) {
      normalized.relations = model.relations;
    }
    if (Object.keys(model.meta).length > 0) {
      normalized.meta = model.meta;
    }
    return normalized;
  });

  const body = { text: typeof event.content === 'string' ? event.content : '' };
  if (language) {
    body.language = language;
  }

  const canonical = {
    id: canonicalIdFromNostrEvent(event),
    schemaVersion: options.schemaVersion,
    type: options.canonicalType,
    author: {
      scheme: 'nostr',
      id: typeof event.pubkey === 'string' ? event.pubkey : '',
    },
    createdAt: unixSecondsToIso(Number(event.created_at)),
    body,
  };

  if (Object.keys(contexts).length > 0) {
    canonical.contexts = contexts;
  }
  if (relationships.length > 0) {
    canonical.relationships = relationships;
  }
  if (phase) {
    canonical.phase = phase;
  }
  if (trigger) {
    canonical.trigger = trigger;
  }
  if (models.length > 0) {
    canonical.dsl = { models };
  }
  if (lineage.length > 0) {
    canonical.lineage = lineage;
  }
  if (labels.length > 0) {
    canonical.labels = labels;
  }

  return {
    output: canonical,
    warnings,
  };
}

function convertOne(record, options) {
  if (options.direction === DIRECTION_CANONICAL_TO_NOSTR) {
    return convertCanonicalToNostrDraft(record, options);
  }
  return convertNostrToCanonical(record, options);
}

async function convertFile(args) {
  const lineageMaps = readLineageMap(args.lineageMap);
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
      const { output: convertedRecord, warnings } = convertOne(parsed, {
        direction: args.direction,
        kind: args.kind,
        defaultRelay: args.defaultRelay,
        lineageMaps,
        requireAgroecologyTag: args.requireAgroecologyTag,
        schemaVersion: args.schemaVersion,
        canonicalType: args.canonicalType,
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
    `[DONE] direction=${args.direction} converted=${converted} skipped=${skipped} output=${outPath}\n`
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
