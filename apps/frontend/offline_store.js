'use strict';

const DB_NAME = 'toitoi-field-app';
const DB_VERSION = 1;
const OBSERVATIONS = 'observations';
const SYNC_QUEUE = 'sync_queue';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createMemoryStore(initial = {}) {
  const observations = new Map((initial.observations || []).map((item) => [item.id, clone(item)]));
  const queue = new Map((initial.queue || []).map((item) => [item.id, clone(item)]));
  return {
    async saveObservation(observation) { observations.set(observation.id, clone(observation)); return clone(observation); },
    async getObservation(id) { return observations.has(id) ? clone(observations.get(id)) : null; },
    async listObservations() { return Array.from(observations.values()).map(clone); },
    async enqueue(item) { queue.set(item.id, clone(item)); return clone(item); },
    async updateQueueItem(item) { queue.set(item.id, clone(item)); return clone(item); },
    async removeQueueItem(id) { queue.delete(id); },
    async listQueue() { return Array.from(queue.values()).map(clone); },
  };
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function openDatabase(indexedDBImpl = globalThis.indexedDB) {
  if (!indexedDBImpl) throw new Error('IndexedDB is not available');
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OBSERVATIONS)) db.createObjectStore(OBSERVATIONS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SYNC_QUEUE)) db.createObjectStore(SYNC_QUEUE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open IndexedDB'));
  });
}

function createIndexedDbStore(options = {}) {
  const dbPromise = openDatabase(options.indexedDB);
  async function transaction(storeName, mode, action) {
    const db = await dbPromise;
    const tx = db.transaction(storeName, mode);
    const result = await action(tx.objectStore(storeName));
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
    return result;
  }
  return {
    saveObservation: (value) => transaction(OBSERVATIONS, 'readwrite', async (store) => { await requestToPromise(store.put(clone(value))); return clone(value); }),
    getObservation: (id) => transaction(OBSERVATIONS, 'readonly', async (store) => clone(await requestToPromise(store.get(id)) || null)),
    listObservations: () => transaction(OBSERVATIONS, 'readonly', async (store) => (await requestToPromise(store.getAll())).map(clone)),
    enqueue: (value) => transaction(SYNC_QUEUE, 'readwrite', async (store) => { await requestToPromise(store.put(clone(value))); return clone(value); }),
    updateQueueItem: (value) => transaction(SYNC_QUEUE, 'readwrite', async (store) => { await requestToPromise(store.put(clone(value))); return clone(value); }),
    removeQueueItem: (id) => transaction(SYNC_QUEUE, 'readwrite', async (store) => { await requestToPromise(store.delete(id)); }),
    listQueue: () => transaction(SYNC_QUEUE, 'readonly', async (store) => (await requestToPromise(store.getAll())).map(clone)),
  };
}

const exported = { createMemoryStore, createIndexedDbStore };
if (typeof module !== 'undefined' && module.exports) module.exports = exported;
if (typeof globalThis !== 'undefined') globalThis.Toitoi = Object.assign(globalThis.Toitoi || {}, exported);
