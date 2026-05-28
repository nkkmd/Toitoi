'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function ensureDirectoryForFile(filePath) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function createStorageId(prefix = 'log') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = crypto.randomBytes(6).toString('hex');
  return `${prefix}-${stamp}-${random}`;
}

function appendJsonlRecord(filePath, record) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new TypeError('filePath must be a non-empty string');
  }

  ensureDirectoryForFile(filePath);
  fs.appendFileSync(path.resolve(filePath), `${JSON.stringify(record)}\n`, 'utf8');
}

function readJsonlRecords(filePath) {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new TypeError('filePath must be a non-empty string');
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return [];
  }

  const raw = fs.readFileSync(resolved, 'utf8');
  if (raw.trim() === '') {
    return [];
  }

  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

module.exports = {
  appendJsonlRecord,
  cloneJson,
  createStorageId,
  ensureDirectoryForFile,
  readJsonlRecords,
};
