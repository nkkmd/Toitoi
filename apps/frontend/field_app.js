'use strict';

const PRIVATE_FIELDS = ['location', 'person_names', 'contact', 'private_context'];

function id(prefix, now, random) {
  return `${prefix}-${now().toISOString().replace(/[-:.TZ]/g, '')}-${random().toString(36).slice(2, 8)}`;
}
function normalizeText(value) { return String(value || '').trim(); }
function detectSensitiveFields(input) { return PRIVATE_FIELDS.filter((field) => normalizeText(input[field])); }

function createFieldApp({ store, api, now = () => new Date(), random = Math.random, online = () => true }) {
  if (!store || !api) throw new TypeError('store and api are required');
  async function saveObservation(input) {
    const text = normalizeText(input.text);
    if (!text) throw new Error('Observation text is required');
    const observation = {
      id: input.id || id('local-observation', now, random), text,
      context: normalizeText(input.context), location: normalizeText(input.location),
      person_names: normalizeText(input.person_names), contact: normalizeText(input.contact),
      private_context: normalizeText(input.private_context), created_at: now().toISOString(),
      status: 'local', remote_event_id: null, sync_error: null,
    };
    await store.saveObservation(observation);
    return observation;
  }
  async function queuePublication(observationId, review) {
    const observation = await store.getObservation(observationId);
    if (!observation) throw new Error('Observation not found');
    const sensitive = detectSensitiveFields(observation);
    if (!review || review.confirmed !== true) throw new Error('Explicit publication confirmation is required');
    const acknowledged = new Set(review.acknowledged_fields || []);
    const missing = sensitive.filter((field) => !acknowledged.has(field));
    if (missing.length) throw new Error(`Sensitive fields require confirmation: ${missing.join(', ')}`);
    const item = { id: id('publish', now, random), observation_id: observationId, state: 'queued', attempts: 0, created_at: now().toISOString(), updated_at: now().toISOString(), last_error: null };
    await store.enqueue(item);
    observation.status = 'queued';
    await store.saveObservation(observation);
    return item;
  }
  async function syncQueue() {
    const items = await store.listQueue();
    const results = [];
    if (!online()) return { online: false, results };
    for (const item of items) {
      if (item.state === 'published') continue;
      const observation = await store.getObservation(item.observation_id);
      if (!observation) {
        item.state = 'failed'; item.last_error = 'Observation not found'; item.updated_at = now().toISOString();
        await store.updateQueueItem(item); results.push({ id: item.id, ok: false, error: item.last_error }); continue;
      }
      item.state = 'syncing'; item.attempts += 1; item.updated_at = now().toISOString(); await store.updateQueueItem(item);
      try {
        const response = await api.publishObservation({ local_id: observation.id, observation: observation.text, context: observation.context });
        observation.status = 'published'; observation.remote_event_id = response.event_id; observation.sync_error = null;
        await store.saveObservation(observation); await store.removeQueueItem(item.id);
        results.push({ id: item.id, ok: true, event_id: response.event_id });
      } catch (error) {
        item.state = 'failed'; item.last_error = error.message || String(error); item.updated_at = now().toISOString();
        observation.status = 'sync_failed'; observation.sync_error = item.last_error;
        await store.saveObservation(observation); await store.updateQueueItem(item);
        results.push({ id: item.id, ok: false, error: item.last_error });
      }
    }
    return { online: true, results };
  }
  async function retry(queueId) {
    const item = (await store.listQueue()).find((entry) => entry.id === queueId);
    if (!item) throw new Error('Queue item not found');
    item.state = 'queued'; item.last_error = null; item.updated_at = now().toISOString(); await store.updateQueueItem(item); return item;
  }
  async function loadDashboard() { return { observations: await store.listObservations(), queue: await store.listQueue(), online: online() }; }
  return { saveObservation, queuePublication, syncQueue, retry, loadDashboard, detectSensitiveFields };
}

const exported = { createFieldApp, detectSensitiveFields };
if (typeof module !== 'undefined' && module.exports) module.exports = exported;
if (typeof globalThis !== 'undefined') globalThis.Toitoi = Object.assign(globalThis.Toitoi || {}, exported);
