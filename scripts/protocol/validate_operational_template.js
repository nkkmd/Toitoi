'use strict';

const fs = require('fs');
const path = require('path');

function getOperationalTemplatePath() {
  return path.resolve(__dirname, '../../docs/operations/PROTOCOL_OPERATION_TEMPLATE.md');
}

function validateOperationalTemplate(templatePath = getOperationalTemplatePath()) {
  const source = fs.readFileSync(templatePath, 'utf8');
  const requiredSnippets = [
    '## 1. Protocol Profile',
    '## 2. Backup / Restore / Replay',
    '## 3. Retry / Alert / Health Check',
    '## 4. Fixture / Sample Archive / Migration Script',
    '## 5. New Protocol Onboarding Checklist',
    '| `localfs` | unsupported | runtime replay is not wired yet; future file/archive-backed support is possible |',
  ];

  const errors = [];

  for (const snippet of requiredSnippets) {
    if (!source.includes(snippet)) {
      errors.push(`missing required snippet: ${snippet}`);
    }
  }

  if (!source.includes('replay が無い protocol は、将来対応の余地があっても `unsupported` と書く')) {
    errors.push('template does not instruct unsupported replay to remain explicit');
  }

  return {
    templatePath,
    source,
    errors,
  };
}

function main() {
  const result = validateOperationalTemplate();

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
  getOperationalTemplatePath,
  validateOperationalTemplate,
};
