'use strict';

const fs = require('fs');
const path = require('path');

function getLocalFsTemplatePath() {
  return path.resolve(__dirname, '../../docs/operations/LOCALFS_MIGRATION_AND_FIXTURE_TEMPLATE.md');
}

function validateLocalFsMigrationFixtureTemplate(templatePath = getLocalFsTemplatePath()) {
  const source = fs.readFileSync(templatePath, 'utf8');
  const requiredSnippets = [
    'LocalFS Migration / Fixture Template',
    '| protocol | `localfs` |',
    '| replay | `unsupported` |',
    'Fixture Template',
    'Migration Script Template',
    'runtime replay はまだ wired しない',
  ];

  const errors = [];
  for (const snippet of requiredSnippets) {
    if (!source.includes(snippet)) {
      errors.push(`missing required snippet: ${snippet}`);
    }
  }

  return {
    templatePath,
    source,
    errors,
  };
}

function main() {
  const result = validateLocalFsMigrationFixtureTemplate();

  if (result.errors.length > 0) {
    console.error(`FAIL ${path.relative(process.cwd(), result.templatePath)}`);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`PASS ${path.relative(process.cwd(), result.templatePath)}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  getLocalFsTemplatePath,
  validateLocalFsMigrationFixtureTemplate,
};
