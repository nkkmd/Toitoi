'use strict';

const assert = require('assert');
const {
  createInquiryDraft,
  submitInquiryDraft,
  approveInquiryDraft,
  rejectInquiryDraft,
  assertPublishableInquiryDraft,
  validateInquiryDraft,
} = require('./inquiry_draft');

const candidate = {
  type: 'inquiry',
  body: {
    text: '畑の東側だけ雑草相が異なる理由を確かめたい。',
    language: 'ja',
  },
  contexts: {
    field_zone: 'east',
  },
  relationships: [
    { source: 'microclimate', target: 'weed_flora' },
  ],
};

function run() {
  const draft = createInquiryDraft({
    id: 'tt:draft:golden-path-001',
    candidate,
    createdAt: '2026-07-13T08:00:00.000Z',
  });
  assert.strictEqual(draft.status, 'draft');
  assert.ok(validateInquiryDraft(draft).ok);
  assert.throws(() => assertPublishableInquiryDraft(draft), /only approved/);

  const inReview = submitInquiryDraft(draft, {
    submittedAt: '2026-07-13T08:05:00.000Z',
  });
  assert.strictEqual(inReview.status, 'in_review');
  assert.strictEqual(inReview.submittedAt, '2026-07-13T08:05:00.000Z');
  assert.throws(() => submitInquiryDraft(inReview), /cannot submit/);

  const approved = approveInquiryDraft(inReview, {
    reviewerId: 'human:nkkmd',
    reviewedAt: '2026-07-13T08:10:00.000Z',
    note: 'Observation and wording confirmed.',
  });
  assert.strictEqual(approved.status, 'approved');
  assert.strictEqual(approved.review.decision, 'approved');
  assert.strictEqual(approved.review.reviewerId, 'human:nkkmd');
  assert.deepStrictEqual(assertPublishableInquiryDraft(approved), candidate);
  assert.throws(() => rejectInquiryDraft(approved, { reviewerId: 'human:nkkmd' }), /cannot review/);

  const rejected = rejectInquiryDraft(inReview, {
    reviewerId: 'human:nkkmd',
    reviewedAt: '2026-07-13T08:11:00.000Z',
    note: 'Needs a more specific observation scope.',
  });
  assert.strictEqual(rejected.status, 'rejected');
  assert.throws(() => assertPublishableInquiryDraft(rejected), /only approved/);

  const resubmitted = submitInquiryDraft(rejected, {
    submittedAt: '2026-07-13T08:12:00.000Z',
  });
  assert.strictEqual(resubmitted.status, 'in_review');
  assert.ok(!Object.prototype.hasOwnProperty.call(resubmitted, 'review'));

  assert.throws(() => createInquiryDraft({
    id: 'invalid-id',
    candidate,
  }), /tt:draft/);

  assert.throws(() => createInquiryDraft({
    id: 'tt:draft:published-shape',
    candidate: { ...candidate, id: 'tt:evt:already-published' },
  }), /must not contain a published canonical event id/);

  console.log('PASS inquiry draft contract requires explicit human approval before publication');
}

try {
  run();
} catch (error) {
  console.error('FAIL inquiry draft contract');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
