'use strict';

function createDeterministicAiProvider({
  model = 'toitoi-deterministic-fixture',
  modelVersion = '1',
  promptVersion = 'inquiry-generation-v0.1.0',
} = {}) {
  async function infer({ task, eventId, payload }) {
    if (typeof eventId !== 'string' || eventId.trim() === '') {
      throw new TypeError('eventId must be a non-empty string');
    }

    const text = extractText(payload);
    if (task === 'summarize') {
      const summary = text.length <= 120 ? text : `${text.slice(0, 117)}...`;
      const output = { summary: summary || `Event ${eventId}` };
      return { model, modelVersion, promptVersion, output, rawOutput: JSON.stringify(output) };
    }

    if (task === 'tag') {
      const tags = tokenize(text);
      const output = { tags: tags.length > 0 ? tags : ['untagged'] };
      return { model, modelVersion, promptVersion, output, rawOutput: JSON.stringify(output) };
    }

    if (task === 'generate_inquiries') {
      const observation = text || `Observation from ${eventId}`;
      const tags = tokenize(observation).slice(0, 5);
      const output = {
        candidates: [
          {
            inquiry: `${observation}に影響している条件は何か？`,
            context: { source_event_id: eventId },
            observation,
            relationship: 'conditions_influencing_observation',
            uncertainty: '原因と相関は未確認',
            tags: tags.length ? tags : ['observation'],
            source_refs: [eventId],
          },
          {
            inquiry: `${observation}は時間や場所によってどのように変化するか？`,
            context: { source_event_id: eventId },
            observation,
            relationship: 'variation_across_context',
            uncertainty: '比較観察が必要',
            tags: tags.length ? tags : ['observation'],
            source_refs: [eventId],
          },
        ],
      };
      return { model, modelVersion, promptVersion, output, rawOutput: JSON.stringify(output) };
    }

    throw new TypeError(`unsupported task: ${task}`);
  }

  return Object.freeze({ infer, model, modelVersion, promptVersion });
}

function tokenize(text) {
  return [...new Set(text.toLowerCase().split(/[^\p{L}\p{N}_-]+/u)
    .filter((token) => token.length >= 3).slice(0, 8))];
}

function extractText(payload) {
  if (typeof payload === 'string') return payload.trim();
  if (!payload || typeof payload !== 'object') return '';
  for (const field of ['content', 'text', 'observation', 'inquiry', 'summary']) {
    if (typeof payload[field] === 'string' && payload[field].trim()) return payload[field].trim();
  }
  return JSON.stringify(payload);
}

module.exports = { createDeterministicAiProvider };