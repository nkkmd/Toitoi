'use strict';

(function initWorkflowUi() {
  const api = Toitoi.createApiClient();
  const loadForm = document.querySelector('#workflow-load-form');
  const eventInput = document.querySelector('#workflow-event-id');
  const annotationList = document.querySelector('#annotation-list');
  const status = document.querySelector('#workflow-status');
  const draftPanel = document.querySelector('#draft-panel');
  const draftSummary = document.querySelector('#draft-summary');
  const reviewer = document.querySelector('#draft-reviewer');
  const note = document.querySelector('#draft-note');
  const publicationResult = document.querySelector('#publication-result');
  let currentDraft = null;

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.dataset.kind = isError ? 'error' : 'success';
  }

  function button(label, handler, className = '') {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    if (className) element.className = className;
    element.addEventListener('click', async () => {
      element.disabled = true;
      try { await handler(); } catch (error) { setStatus(error.message, true); }
      finally { element.disabled = false; }
    });
    return element;
  }

  function renderDraft(draft) {
    currentDraft = draft;
    draftPanel.hidden = false;
    draftSummary.textContent = JSON.stringify({
      id: draft.id,
      status: draft.status,
      inquiry: draft.candidate?.body?.text,
      source: draft.derivation?.sourceInquiryId,
      relation: draft.derivation?.relationType,
      ai: draft.derivation?.ai || draft.candidate?.meta?.aiPromotion || null,
      review: draft.review || null,
    }, null, 2);
    document.querySelector('#draft-submit').disabled = !['draft', 'rejected'].includes(draft.status);
    document.querySelector('#draft-approve').disabled = draft.status !== 'in_review';
    document.querySelector('#draft-reject').disabled = draft.status !== 'in_review';
    document.querySelector('#draft-publish').disabled = draft.status !== 'approved';
  }

  function candidates(annotation) {
    return Array.isArray(annotation.output?.candidates) ? annotation.output.candidates : [];
  }

  function renderAnnotation(annotation) {
    const card = document.createElement('article');
    card.className = 'card stack';
    const heading = document.createElement('h3');
    heading.textContent = `${annotation.task || 'annotation'} · ${annotation.reviewState || 'unreviewed'}`;
    const provenance = document.createElement('p');
    provenance.className = 'meta';
    provenance.textContent = `model: ${annotation.model || 'unknown'} · version: ${annotation.modelVersion || 'unknown'} · prompt: ${annotation.promptVersion || 'unknown'}`;
    card.append(heading, provenance);

    candidates(annotation).forEach((candidate, index) => {
      const section = document.createElement('section');
      const inquiry = document.createElement('p');
      inquiry.textContent = candidate.inquiry || '問い候補がありません';
      const uncertainty = document.createElement('p');
      uncertainty.className = 'warning';
      uncertainty.textContent = candidate.uncertainty ? `不確実性: ${candidate.uncertainty}` : '不確実性の記載なし';
      const actions = document.createElement('div');
      actions.className = 'actions';
      actions.append(
        button('採用', async () => {
          const reviewed = await api.reviewAnnotation(annotation.id, 'accept', { reviewedBy: 'human:field-worker', note: 'UIで候補を確認' });
          annotation.reviewState = reviewed.reviewState || 'accepted';
          setStatus('AI候補を採用しました。公開承認とは別の操作です。');
          await loadAnnotations();
        }),
        button('却下', async () => {
          await api.reviewAnnotation(annotation.id, 'reject', { reviewedBy: 'human:field-worker', note: 'UIで不採用' });
          setStatus('AI候補を却下しました。');
          await loadAnnotations();
        }, 'secondary'),
        button('Draft作成', async () => {
          const draft = await api.promoteAnnotation(annotation.id, {
            candidateIndex: index,
            authorId: 'human:field-worker',
            language: 'ja',
          });
          renderDraft(draft);
          setStatus('Inquiry Draftを作成しました。人間による別途の公開レビューが必要です。');
        })
      );
      if (!['accepted', 'edited'].includes(annotation.reviewState)) actions.lastElementChild.disabled = true;
      section.append(inquiry, uncertainty, actions);
      card.append(section);
    });

    if (candidates(annotation).length === 0) {
      const empty = document.createElement('p');
      empty.textContent = annotation.output?.summary || '問い候補はありません。';
      card.append(empty);
    }
    return card;
  }

  async function loadAnnotations() {
    const eventId = eventInput.value.trim();
    if (!eventId) throw new Error('観察イベントIDを入力してください');
    const view = await api.listAnnotations(eventId);
    const annotations = Array.isArray(view.annotations) ? view.annotations : [];
    annotationList.replaceChildren(...annotations.map(renderAnnotation));
    if (annotations.length === 0) annotationList.textContent = 'AI問い候補はまだありません。job状態を確認して再読込してください。';
    setStatus(`${annotations.length}件のannotationを読み込みました。`);
  }

  loadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try { await loadAnnotations(); } catch (error) { setStatus(error.message, true); }
  });

  document.querySelector('#draft-submit').addEventListener('click', async () => {
    try { renderDraft(await api.submitDraft(currentDraft.id)); setStatus('Draftをレビューへ提出しました。'); }
    catch (error) { setStatus(error.message, true); }
  });
  document.querySelector('#draft-approve').addEventListener('click', async () => {
    try {
      renderDraft(await api.approveDraft(currentDraft.id, { reviewerId: reviewer.value.trim(), note: note.value.trim() }));
      setStatus('Draftを承認しました。公開操作はまだ実行されていません。');
    } catch (error) { setStatus(error.message, true); }
  });
  document.querySelector('#draft-reject').addEventListener('click', async () => {
    try {
      renderDraft(await api.rejectDraft(currentDraft.id, { reviewerId: reviewer.value.trim(), note: note.value.trim() }));
      setStatus('Draftを却下しました。');
    } catch (error) { setStatus(error.message, true); }
  });
  document.querySelector('#draft-publish').addEventListener('click', async () => {
    try {
      const publication = await api.publishDraft(currentDraft.id);
      publicationResult.textContent = JSON.stringify({
        id: publication.id,
        inquiry: publication.body?.text,
        lineage: publication.lineage,
        publication: publication.meta?.publication,
        aiPromotion: publication.meta?.aiPromotion,
      }, null, 2);
      setStatus('承認済みDraftをCanonical Eventとして公開しました。');
    } catch (error) { setStatus(error.message, true); }
  });
})();
