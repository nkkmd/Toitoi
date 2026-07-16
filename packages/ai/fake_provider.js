'use strict';

function createDeterministicAiProvider({
  model = 'toitoi-deterministic-fixture',
  promptVersion = 'summary-tags-v0.1.0',
} = {}) {
  async function infer({ task, eventId, payload }) {
    if (typeof eventId !== 'string' || eventId.trim() === '') {
      throw new TypeError('eventId must be a non-empty string');
    }

    const text = extractText(payload);
    if (task === 'summarize') {
      const summary = text.length <= 120 ? text : `${text.slice(0, 117)}...`;
      return {
        model,
        promptVersion,
        output: { summary: summary || `Event ${eventId}` },
        rawOutput: JSON.stringify({ summary: summary || `Event ${eventId}` }),
      };
    }

    if (task === 'tag') {
      const tags = [...new Set(text
        .toLowerCase()
        .split(/[^\p{L}\p{N}_-]+/u)
        .filter((token) => token.length >= 3)
        .slice(0, 8))];
      const output = { tags: tags.length > 0 ? tags : ['untagged'] };
      return { model, promptVersion, output, rawOutput: JSON.stringify(output) };
    }

    throw new TypeError(`unsupported task: ${task}`);
  }

  return Object.freeze({ infer, model, promptVersion });
}

function extractText(payload) {
  if (typeof payload === 'string') return payload.trim();
  if (!payload || typeof payload !== 'object') return '';
  for (const field of ['content', 'text', 'observation', 'inquiry', 'summary']) {
    if (typeof payload[field] === 'string' && payload[field].trim()) {
      return payload[field].trim();
    }
  }
  return JSON.stringify(payload);
}

module.exports = { createDeterministicAiProvider };
