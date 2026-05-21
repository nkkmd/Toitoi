'use strict';

const appendOnlyLog = require('./append_only_log');
const persistence = require('./persistence');
const replay = require('./replay');

module.exports = {
  ...appendOnlyLog,
  ...persistence,
  ...replay,
};
