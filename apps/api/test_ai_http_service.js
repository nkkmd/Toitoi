'use strict';

const assert = require('assert');
const { createAiHttpService } = require('./ai_http_service');
const { createToitoiApiService } = require('./toitoi_api_service');

const jobs = [{
  id: 'job-1',
  eventId: 'event-1',
  task: 'summarize',
  state: 'completed',
  attempts: 1,
  createdAt: '2026-07-16T00:00:00.000Z',
}];
const annotations = [{
  id: 'annotation-1',
  eventId: 'event-1',
  task: 'summarize',
  reviewState: 'unreviewed',
  createdAt: '2026-07-16T00:00:01.000Z',
}];

function makeInspectionService() {
  return {
    listJobs({ state, eventId } = {}) {
      return jobs.filter(job => (!state || job.state === state) && (!eventId || job.eventId === eventId));
    },
    getJob(id) {
      return jobs.find(job => job.id === id) || null;
    },
    listAnnotations({ eventId, task, reviewState } = {}) {
      return annotations.filter(annotation =>
        (!eventId || annotation.eventId === eventId)
        && (!task || annotation.task === task)
        && (!reviewState || annotation.reviewState === reviewState));
    },
    getAnnotation(id) {
      return annotations.find(annotation => annotation.id === id) || null;
    },
    getEventAiView(eventId) {
      return {
        eventId,
        jobs: this.listJobs({ eventId }),
        annotations: this.listAnnotations({ eventId }),
      };
    },
  };
}

const tests = [
  {
    name: 'AI HTTP service exposes read-only inspection routes',
    run() {
      const service = createAiHttpService({ inspectionService: makeInspectionService() });

      const jobList = service.handleRequest({ method: 'GET', url: '/api/v1/ai/jobs?state=completed&event_id=event-1' });
      assert.strictEqual(jobList.statusCode, 200);
      assert.strictEqual(jobList.body.results.length, 1);

      const job = service.handleRequest({ method: 'GET', url: '/api/v1/ai/jobs/job-1' });
      assert.strictEqual(job.statusCode, 200);
      assert.strictEqual(job.body.id, 'job-1');

      const missingJob = service.handleRequest({ method: 'GET', url: '/api/v1/ai/jobs/missing' });
      assert.strictEqual(missingJob.statusCode, 404);

      const annotationList = service.handleRequest({ method: 'GET', url: '/api/v1/ai/annotations?task=summarize&review_state=unreviewed' });
      assert.strictEqual(annotationList.statusCode, 200);
      assert.strictEqual(annotationList.body.results[0].id, 'annotation-1');

      const eventView = service.handleRequest({ method: 'GET', url: '/api/v1/ai/events/event-1' });
      assert.strictEqual(eventView.statusCode, 200);
      assert.strictEqual(eventView.body.jobs.length, 1);
      assert.strictEqual(eventView.body.annotations.length, 1);

      const rejectedWrite = service.handleRequest({ method: 'POST', url: '/api/v1/ai/jobs' });
      assert.strictEqual(rejectedWrite.statusCode, 405);

      assert.strictEqual(service.handleRequest({ method: 'GET', url: '/api/v1/inquiries' }), null);
    },
  },
  {
    name: 'composed Toitoi API delegates AI routes and preserves Standard API routes',
    run() {
      const standardService = {
        handleRequest(request) {
          return { statusCode: 200, headers: {}, body: { delegated: request.url } };
        },
      };
      const service = createToitoiApiService({
        standardService,
        aiInspectionService: makeInspectionService(),
      });

      const ai = service.handleRequest({ method: 'GET', url: '/api/v1/ai/jobs/job-1' });
      assert.strictEqual(ai.body.id, 'job-1');

      const standard = service.handleRequest({ method: 'GET', url: '/api/v1/inquiries' });
      assert.strictEqual(standard.body.delegated, '/api/v1/inquiries');
    },
  },
];

let failed = 0;
for (const test of tests) {
  try {
    test.run();
    console.log(`PASS ${test.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${test.name}`);
    console.error(error instanceof Error ? error.stack || error.message : String(error));
  }
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} test(s) failed`);
} else {
  console.log(`\n${tests.length} test(s) passed`);
}
