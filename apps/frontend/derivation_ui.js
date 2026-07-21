' strict';

(function initDerivationUi() {
  const form = document.querySelector('#derivation-form');
  if (!form) return;
  const api = Toitoi.createApiClient();
  const relationSelect = form.elements.relationType;
  const guidance = document.querySelector('#derivation-guidance');
  const details = document.querySelector('#derivation-details');
  const status = document.querySelector('#derivation-status');
  const result = document.querySelector('#derivation-result');

  for (const relation of Toitoi.DERIVATION_RELATIONS) {
    const option = document.createElement('option');
    option.value = relation.value;
    option.textContent = relation.label;
    relationSelect.append(option);
  }

  function field(name, label, kind = 'input') {
    const wrapper = document.createElement('label');
    wrapper.textContent = label;
    const control = document.createElement(kind === 'textarea' ? 'textarea' : 'input');
    control.name = name;
    if (kind === 'textarea') control.rows = 2;
    wrapper.append(control);
    return wrapper;
  }

  function renderDetails() {
    const type = relationSelect.value;
    const relation = Toitoi.DERIVATION_RELATIONS.find(item => item.value === type);
    guidance.textContent = relation ? relation.guidance : '';
    const fields = [];
    if (type === 'translated_from') fields.push(field('sourceLanguage', '翻訳元言語'), field('targetLanguage', '翻訳先言語'));
    if (type === 'observed_alongside') fields.push(field('observationNote', '同時観察', 'textarea'), field('contextNote', '共有文脈', 'textarea'));
    if (type === 'contrasts_with' || type === 'reframes') fields.push(field('rationale', 'relationの理由', 'textarea'));
    if (type === 'annotates') fields.push(field('annotationText', '注釈内容', 'textarea'), field('rationale', '注釈理由', 'textarea'));
    if (type === 'revises') fields.push(field('revisionSummary', '改訂内容', 'textarea'));
    if (type === 'synthesizes') fields.push(field('additionalSourceIds', '追加の派生元ID（改行またはカンマ区切り）', 'textarea'));
    details.replaceChildren(...fields);
  }

  relationSelect.addEventListener('change', renderDetails);
  renderDetails();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    result.textContent = '';
    const values = Object.fromEntries(new FormData(form).entries());
    values.relationConfirmedByHuman = form.elements.relationConfirmedByHuman.checked;
    try {
      const payload = Toitoi.buildDerivationRequest(values);
      const draft = await api.deriveInquiry(values.sourceInquiryId.trim(), payload);
      result.textContent = JSON.stringify({
        id: draft.id,
        status: draft.status,
        inquiry: draft.candidate?.body?.text,
        derivation: draft.derivation,
      }, null, 2);
      status.textContent = '派生Inquiry Draftを作成しました。公開には通常の人間レビューが必要です。';
      status.dataset.kind = 'success';
    } catch (error) {
      status.textContent = error.message;
      status.dataset.kind = 'error';
    }
  });
})();
