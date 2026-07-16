'use strict';

function createAiInspectionService({ store }) {
  if (!store || typeof store.latestJobsById !== 'function' || typeof store.latestAnnotationsById !== 'function') {
    throw new TypeError('store must expose latestJobsById and latestAnnotationsById');
  }

  function listJobs({ state = null, eventId = null } = {}) {
    return [...store.latestJobsById().values()]
      .filter((job) => !state || job.state === state)
      .filter((job) => !eventId || job.eventId === eventId)
      .sort(compareCreatedAt);
  }

  function getJob(id) {
    return store.latestJobsById().get(id) || null;
  }

  function listAnnotations({ eventId = null, task = null, reviewState = null } = {}) {
    return [...store.latestAnnotationsById().values()]
      .filter((annotation) => !eventId || annotation.eventId === eventId)
      .filter((annotation) => !task || annotation.task === task)
      .filter((annotation) => !reviewState || annotation.reviewState === reviewState)
      .sort(compareCreatedAt);
  }

  function getAnnotation(id) {
    return store.latestAnnotationsById().get(id) || null;
  }

  function getEventAiView(eventId) {
    if (typeof eventId !== 'string' || eventId.trim() === '') {
      throw new TypeError('eventId must be a non-empty string');
    }
    return {
      eventId,
      jobs: listJobs({ eventId }),
      annotations: listAnnotations({ eventId }),
    };
  }

  return Object.freeze({
    listJobs,
    getJob,
    listAnnotations,
    getAnnotation,
    getEventAiView,
  });
}

function compareCreatedAt(left, right) {
  return String(left.createdAt).localeCompare(String(right.createdAt));
}

module.exports = { createAiInspectionService };
