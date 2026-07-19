'use strict';

const DEFAULT_SYSTEM_PROMPT = `You assist Toitoi by proposing inquiry candidates from an observation. Return JSON only with a candidates array. Each candidate must contain inquiry, context, observation, relationship, uncertainty, tags, and source_refs. Do not present generated content as agricultural fact.`;

function createLlamaCppProvider({
  baseUrl = 'http://127.0.0.1:8080',
  model = 'local-model',
  modelVersion = null,
  promptVersion = 'inquiry-generation-v0.1.0',
  timeoutMs = 60000,
  maxTokens = 768,
  temperature = 0.2,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be a positive integer');

  async function infer(job) {
    if (!job || job.task !== 'generate_inquiries') {
      throw new TypeError('llama.cpp provider supports generate_inquiries only');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
            { role: 'user', content: buildPrompt(job) },
          ],
        }),
      });
      if (!response.ok) throw new Error(`llama.cpp inference failed: HTTP ${response.status}`);
      const envelope = await response.json();
      const rawOutput = envelope?.choices?.[0]?.message?.content;
      if (typeof rawOutput !== 'string' || rawOutput.trim() === '') {
        throw new TypeError('llama.cpp response did not contain message content');
      }
      let output;
      try { output = JSON.parse(rawOutput); } catch (error) {
        throw new TypeError(`llama.cpp output was not valid JSON: ${error.message}`);
      }
      return {
        model: envelope.model || model,
        modelVersion,
        promptVersion,
        output,
        rawOutput,
        generatedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({ infer, model, modelVersion, promptVersion, timeoutMs });
}

function buildPrompt(job) {
  return JSON.stringify({
    task: job.task,
    source_event_id: job.eventId,
    observation: job.payload,
    requirements: {
      candidate_count: '2-4',
      preserve_local_context: true,
      expose_uncertainty: true,
      source_refs: [job.eventId],
    },
  });
}

module.exports = { createLlamaCppProvider, buildPrompt, DEFAULT_SYSTEM_PROMPT };