'use strict';

const appendOnlyLog = require('./append_only_log');
const indexer = require('./indexer');
const persistence = require('./persistence');
const replay = require('./replay');

module.exports = {
  ...appendOnlyLog,
  ...indexer,
  ...persistence,
  ...replay,
};
