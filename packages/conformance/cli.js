#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { runConformanceSuite } = require('./index');

function parseArgs(argv) {
  const args = { input: null, output: null, pretty: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--input') args.input = argv[++index];
    else if (value === '--output') args.output = argv[++index];
    else if (value === '--pretty') args.pretty = true;
    else if (value === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

function usage() {
  return 'Usage: toitoi-conformance --input <fixture.json> [--output <report.json>] [--pretty]';
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (!args.input) throw new Error('--input is required');
  const input = JSON.parse(fs.readFileSync(path.resolve(args.input), 'utf8'));
  const report = runConformanceSuite(input);
  const serialized = `${JSON.stringify(report, null, args.pretty ? 2 : 0)}\n`;
  if (args.output) fs.writeFileSync(path.resolve(args.output), serialized, 'utf8');
  else process.stdout.write(serialized);
  return report.passed ? 0 : 1;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`${error.message}\n${usage()}\n`);
    process.exitCode = 2;
  }
}

module.exports = { main, parseArgs, usage };
