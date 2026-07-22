'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function buildBackupManifest({ root, files, createdAt = new Date().toISOString(), version = 1 }) {
  const absoluteRoot = path.resolve(root);
  const entries = files.map(relativePath => {
    const filename = path.resolve(absoluteRoot, relativePath);
    const stat = fs.statSync(filename);
    return {
      path: relativePath,
      size: stat.size,
      sha256: sha256File(filename),
    };
  }).sort((a, b) => a.path.localeCompare(b.path));
  return { version, createdAt, root: absoluteRoot, files: entries };
}

function verifyBackupManifest(manifest, root = manifest.root) {
  const absoluteRoot = path.resolve(root);
  const checks = manifest.files.map(entry => {
    const filename = path.resolve(absoluteRoot, entry.path);
    const exists = fs.existsSync(filename);
    const actual = exists ? sha256File(filename) : null;
    return { path: entry.path, passed: exists && actual === entry.sha256, expected: entry.sha256, actual };
  });
  return { passed: checks.every(check => check.passed), checks };
}

class MigrationRegistry {
  constructor(migrations = []) {
    this.migrations = migrations.slice().sort((a, b) => a.version - b.version);
  }

  plan(currentVersion, targetVersion = null) {
    const target = targetVersion === null
      ? (this.migrations.length ? this.migrations[this.migrations.length - 1].version : currentVersion)
      : targetVersion;
    return this.migrations.filter(migration => migration.version > currentVersion && migration.version <= target);
  }

  async apply({ currentVersion, targetVersion = null, context = {}, dryRun = false }) {
    const plan = this.plan(currentVersion, targetVersion);
    const applied = [];
    for (const migration of plan) {
      if (!dryRun) await migration.up(context);
      applied.push({ version: migration.version, name: migration.name, dryRun });
    }
    return { from: currentVersion, to: plan.length ? plan[plan.length - 1].version : currentVersion, applied };
  }
}

module.exports = {
  MigrationRegistry,
  buildBackupManifest,
  sha256File,
  verifyBackupManifest,
};
