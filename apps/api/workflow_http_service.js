'use strict';

const { URL } = require('url');
const {
  submitInquiryDraft,
  approveInquiryDraft,
  rejectInquiryDraft,
  assertPublishableInquiryDraft,
  createDerivedInquiryDraft,
} = require('@toitoi/protocol');
const { promoteInquiryCandidate } = require('@toitoi/ai');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseBody(body) {
  if (body == null) return {};
  if (typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  try { return JSON.parse(String(body)); } catch (error) {
    throw new TypeError(`request body must be valid JSON: ${error.message}`);
  }
}

function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8' }, body };
}

function requiredString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} is required`);
  return value.trim();
}

function createMemoryWorkflowService({
  annotationService,
  canonicalPublisher = async (event) => ({ canonicalEvent: event, storage: null, delivery: null }),
  now = () => new Date().toISOString(),
} = {}) {
  const observations = new Map();
  const drafts = new Map();
  const publications = new Map();
  let sequence = 0;

  function nextId(prefix) {
    sequence += 1;
    return `${prefix}${sequence}`;
  }

  return Object.freeze({
    createObservation(input = {}) {
      const text = requiredString(input.text, 'text');
      const language = requiredString(input.language || 'und', 'language');
      const id = input.id || nextId('tt:evt:observation-');
      const createdAt = input.createdAt || now();
      const observation = {
        id,
        type: 'observation',
        body: { text, language },
        contexts: input.contexts && typeof input.contexts === 'object' ? clone(input.contexts) : {},
        meta: {
          visibility: 'private',
          localOnly: true,
          sensitive: input.sensitive && typeof input.sensitive === 'object' ? clone(input.sensitive) : {},
        },
        createdAt,
      };
      observations.set(id, observation);
      return clone(observation);
    },

    promoteAnnotation(annotationId, input = {}) {
      if (!annotationService || typeof annotationService.getAnnotation !== 'function') {
        throw new Error('annotation promotion is not configured');
      }
      const annotation = annotationService.getAnnotation(annotationId);
      if (!annotation) throw new Error('AI annotation not found');
      const draft = promoteInquiryCandidate({
        annotation,
        candidateIndex: Number.isInteger(input.candidateIndex) ? input.candidateIndex : 0,
        language: input.language,
        id: input.id || nextId('tt:draft:inquiry-'),
        createdAt: input.createdAt || now(),
        authorId: input.authorId,
        relationType: input.relationType || 'derived_from',
      });
      drafts.set(draft.id, draft);
      return clone(draft);
    },

    deriveInquiry(sourceInquiryId, input = {}) {
      const candidate = input.candidate && typeof input.candidate === 'object'
        ? input.candidate
        : {
          type: 'inquiry',
          body: {
            text: requiredString(input.text, 'text'),
            language: requiredString(input.language || 'und', 'language'),
          },
          contexts: input.contexts && typeof input.contexts === 'object' ? clone(input.contexts) : {},
        };
      const draft = createDerivedInquiryDraft({
        id: input.id || nextId('tt:draft:inquiry-'),
        sourceInquiryId,
        relationType: requiredString(input.relationType, 'relationType'),
        relationDetails: input.relationDetails || {},
        relationConfirmedByHuman: input.relationConfirmedByHuman,
        strictRelationValidation: true,
        candidate,
        createdAt: input.createdAt || now(),
        authorId: input.authorId,
        ai: input.aiSuggestion || input.ai,
      });
      drafts.set(draft.id, draft);
      return clone(draft);
    },

    getDraft(id) {
      const draft = drafts.get(id);
      return draft ? clone(draft) : null;
    },

    submitDraft(id, input = {}) {
      const draft = drafts.get(id);
      if (!draft) throw new Error('Inquiry Draft not found');
      const next = submitInquiryDraft(draft, { submittedAt: input.submittedAt || now() });
      drafts.set(id, next);
      return clone(next);
    },

    approveDraft(id, input = {}) {
      const draft = drafts.get(id);
      if (!draft) throw new Error('Inquiry Draft not found');
      const next = approveInquiryDraft(draft, {
        reviewerId: requiredString(input.reviewerId, 'reviewerId'),
        reviewedAt: input.reviewedAt || now(),
        note: input.note,
      });
      drafts.set(id, next);
      return clone(next);
    },

    rejectDraft(id, input = {}) {
      const draft = drafts.get(id);
      if (!draft) throw new Error('Inquiry Draft not found');
      const next = rejectInquiryDraft(draft, {
        reviewerId: requiredString(input.reviewerId, 'reviewerId'),
        reviewedAt: input.reviewedAt || now(),
        note: input.note,
      });
      drafts.set(id, next);
      return clone(next);
    },

    async publishDraft(id, input = {}) {
      const draft = drafts.get(id);
      if (!draft) throw new Error('Inquiry Draft not found');
      const candidate = assertPublishableInquiryDraft(draft);
      const publishedAt = input.createdAt || now();
      const publicationId = input.id || nextId('tt:evt:inquiry-');
      const derivationSources = draft.derivation
        ? (draft.derivation.sourceInquiryIds || [draft.derivation.sourceInquiryId])
        : [];
      const publication = {
        ...clone(candidate),
        id: publicationId,
        createdAt: publishedAt,
        lineage: draft.derivation ? derivationSources.map(sourceId => ({
          sourceId,
          relationType: draft.derivation.relationType,
        })) : [],
        meta: {
          ...(candidate.meta || {}),
          publication: {
            draftId: draft.id,
            approvedBy: draft.review.reviewerId,
            approvedAt: draft.review.reviewedAt,
            publishedAt,
            derivation: draft.derivation ? clone(draft.derivation) : null,
          },
        },
      };
      const result = await canonicalPublisher(publication, {
        draftId: draft.id,
        publishedAt,
        batchId: input.batchId,
      });
      const canonicalEvent = result && result.canonicalEvent ? result.canonicalEvent : publication;
      canonicalEvent.meta = canonicalEvent.meta && typeof canonicalEvent.meta === 'object' ? canonicalEvent.meta : {};
      canonicalEvent.meta.publication = {
        ...(canonicalEvent.meta.publication || {}),
        storage: result ? result.storage : null,
      };
      publications.set(canonicalEvent.id, canonicalEvent);
      return clone(canonicalEvent);
    },

    getPublication(id) {
      const publication = publications.get(id);
      return publication ? clone(publication) : null;
    },
  });
}

function createWorkflowHttpService({ workflowService }) {
  if (!workflowService) throw new TypeError('workflowService is required');

  async function handleRequest(request = {}) {
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET';
    const parsedUrl = new URL(request.url || '/', 'http://localhost');
    const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
    const body = () => parseBody(request.body);

    try {
      if (pathname === '/api/v1/observations') {
        if (method !== 'POST') return json(405, { message: 'Method not allowed' });
        return json(201, await workflowService.createObservation(body()));
      }

      const promotion = pathname.match(/^\/api\/v1\/ai\/annotations\/([^/]+)\/promote$/);
      if (promotion) {
        if (method !== 'POST') return json(405, { message: 'Method not allowed' });
        return json(201, await workflowService.promoteAnnotation(decodeURIComponent(promotion[1]), body()));
      }

      const derivation = pathname.match(/^\/api\/v1\/inquiries\/([^/]+)\/derive$/);
      if (derivation) {
        if (method !== 'POST') return json(405, { message: 'Method not allowed' });
        return json(201, await workflowService.deriveInquiry(decodeURIComponent(derivation[1]), body()));
      }

      const draft = pathname.match(/^\/api\/v1\/inquiry-drafts\/([^/]+)(?:\/(submit|approve|reject|publish))?$/);
      if (draft) {
        const id = decodeURIComponent(draft[1]);
        const action = draft[2];
        if (!action) {
          if (method !== 'GET') return json(405, { message: 'Method not allowed' });
          const value = await workflowService.getDraft(id);
          return value ? json(200, value) : json(404, { message: 'Inquiry Draft not found', id });
        }
        if (method !== 'POST') return json(405, { message: 'Method not allowed' });
        const methods = {
          submit: 'submitDraft', approve: 'approveDraft', reject: 'rejectDraft', publish: 'publishDraft',
        };
        return json(action === 'publish' ? 201 : 200, await workflowService[methods[action]](id, body()));
      }

      const publication = pathname.match(/^\/api\/v1\/publications\/([^/]+)$/);
      if (publication) {
        if (method !== 'GET') return json(405, { message: 'Method not allowed' });
        const id = decodeURIComponent(publication[1]);
        const value = await workflowService.getPublication(id);
        return value ? json(200, value) : json(404, { message: 'Publication not found', id });
      }
      return null;
    } catch (error) {
      const statusCode = /not found/i.test(error.message) ? 404 : /only approved|cannot /.test(error.message) ? 409 : 400;
      return json(statusCode, { message: error.message });
    }
  }

  return Object.freeze({ handleRequest });
}

module.exports = { createMemoryWorkflowService, createWorkflowHttpService, parseBody };
