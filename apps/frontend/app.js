'use strict';

(async function bootstrap() {
  const $ = (selector) => document.querySelector(selector);
  const store = Toitoi.createIndexedDbStore();
  const api = Toitoi.createApiClient();
  const app = Toitoi.createFieldApp({ store, api, online: () => navigator.onLine });
  const form = $('#observation-form');
  const list = $('#observation-list');
  const queueList = $('#queue-list');
  const network = $('#network-status');
  const notice = $('#notice');
  const publishDialog = $('#publish-dialog');
  let selectedObservation = null;

  function text(value) { return document.createTextNode(String(value || '')); }
  function announce(message, error = false) { notice.textContent = message; notice.dataset.kind = error ? 'error' : 'success'; }
  function statusLabel(status) { return ({ local: '端末保存', queued: '同期待ち', sync_failed: '同期失敗', published: '公開済み' })[status] || status; }
  function renderObservation(item) {
    const article = document.createElement('article'); article.className = 'card';
    const heading = document.createElement('h3'); heading.append(text(item.text));
    const meta = document.createElement('p'); meta.className = 'meta'; meta.append(text(`${statusLabel(item.status)} · ${new Date(item.created_at).toLocaleString()}`));
    article.append(heading, meta);
    if (item.context) { const context = document.createElement('p'); context.append(text(item.context)); article.append(context); }
    const sensitive = app.detectSensitiveFields(item);
    if (sensitive.length) { const warning = document.createElement('p'); warning.className = 'warning'; warning.append(text(`公開前確認: ${sensitive.join(', ')}`)); article.append(warning); }
    if (item.remote_event_id) { const remote = document.createElement('code'); remote.append(text(item.remote_event_id)); article.append(remote); }
    if (item.status !== 'published') {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = item.status === 'queued' ? '公開待ちを確認' : '公開確認へ';
      button.addEventListener('click', () => openPublishDialog(item)); article.append(button);
    }
    return article;
  }
  function openPublishDialog(item) {
    selectedObservation = item; $('#publish-preview').textContent = item.text;
    const fields = app.detectSensitiveFields(item); const container = $('#sensitive-fields'); container.replaceChildren();
    fields.forEach((field) => {
      const label = document.createElement('label'); const input = document.createElement('input');
      input.type = 'checkbox'; input.name = 'acknowledged'; input.value = field;
      label.append(input, text(` ${field} を公開対象として確認しました`)); container.append(label);
    });
    publishDialog.showModal();
  }
  async function render() {
    const dashboard = await app.loadDashboard();
    network.textContent = dashboard.online ? 'オンライン' : 'オフライン'; network.dataset.online = dashboard.online ? 'true' : 'false';
    list.replaceChildren(...dashboard.observations.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(renderObservation));
    if (!dashboard.observations.length) list.textContent = '保存済みの観察はありません。';
    queueList.replaceChildren(...dashboard.queue.map((item) => {
      const li = document.createElement('li'); li.append(text(`${item.state} · 試行 ${item.attempts}回${item.last_error ? ` · ${item.last_error}` : ''}`));
      if (item.state === 'failed') {
        const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '再試行';
        retry.addEventListener('click', async () => { await app.retry(item.id); await synchronize(); }); li.append(retry);
      }
      return li;
    }));
    if (!dashboard.queue.length) queueList.textContent = '同期待ちの項目はありません。';
  }
  async function synchronize() {
    try {
      const result = await app.syncQueue();
      if (!result.online) announce('オフラインのため、端末に保持しています。');
      else if (result.results.some((entry) => !entry.ok)) announce('一部の同期に失敗しました。状態を確認して再試行してください。', true);
      else if (result.results.length) announce('同期が完了しました。');
      await render();
    } catch (error) { announce(error.message, true); await render(); }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try { await app.saveObservation(Object.fromEntries(new FormData(form).entries())); form.reset(); announce('観察を端末へ保存しました。'); await render(); }
    catch (error) { announce(error.message, true); }
  });
  $('#publish-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const acknowledged = Array.from(event.currentTarget.querySelectorAll('input[name="acknowledged"]:checked')).map((input) => input.value);
    try { await app.queuePublication(selectedObservation.id, { confirmed: true, acknowledged_fields: acknowledged }); publishDialog.close(); announce('公開キューへ追加しました。'); await synchronize(); }
    catch (error) { announce(error.message, true); }
  });
  $('#cancel-publish').addEventListener('click', () => publishDialog.close());
  $('#sync-now').addEventListener('click', synchronize);
  addEventListener('online', synchronize); addEventListener('offline', render);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch((error) => announce(`PWA初期化失敗: ${error.message}`, true));
  await render();
})();
