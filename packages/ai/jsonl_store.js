'use strict';

const fs = require('node:fs');
const path = require('node:path');

function createAiJsonlStore({ directory }) {
  if (typeof directory !== 'string' || directory.trim() === '') {
    throw new TypeError('directory must be a non-empty string');
  }

  const root = path.resolve(directory);
  const jobsPath = path.join(root, 'ai_jobs.jsonl');
  const annotationsPath = path.join(root, 'ai_annotations.jsonl');
  fs.mkdirSync(root, { recursive: true });

  function appendJob(job) {
    appendJsonLine(jobsPath, { recordType: 'job', ...job });
    return job;
  }

  function appendAnnotation(annotation) {
    appendJsonLine(annotationsPath, { recordType: 'annotation', ...annotation });
    return annotation;
  }

  function readJobs() {
    return readJsonLines(jobsPath).filter((record) => record.recordType === 'job');
  }

  function readAnnotations() {
    return readJsonLines(annotationsPath).filter((record) => record.recordType === 'annotation');
  }

  function latestJobsById() {
    const latest = new Map();
    for (const record of readJobs()) latest.set(record.id, record);
    return latest;
  }

  function latestAnnotationsById() {
    const latest = new Map();
    for (const record of readAnnotations()) latest.set(record.id, record);
    return latest;
  }

  return Object.freeze({
    root,
    jobsPath,
    annotationsPath,
    appendJob,
    appendAnnotation,
    readJobs,
    readAnnotations,
    latestJobsById,
    latestAnnotationsById,
  });
}

function appendJsonLine(filePath, value) {
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

function readJsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

module.exports = { createAiJsonlStore, readJsonLines };
