'use strict';

(function initDerivationFormModel(root, factory) {
  const exported = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (root) root.Toitoi = Object.assign(root.Toitoi || {}, exported);
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildDerivationFormModel() {
  const RELATIONS = Object.freeze([
    { value: 'derived_from', label: '一般的な派生', guidance: '元の問いを出発点に、新しい問いを作ります。' },
    { value: 'translated_from', label: '翻訳', guidance: '同一性を主張せず、別言語の問いとして派生します。' },
    { value: 'observed_alongside', label: '同時観察', guidance: '同じ時期・場所・文脈で観察された問いを接続します。' },
    { value: 'contrasts_with', label: '対照', guidance: '問いの違いや緊張関係を明示します。' },
    { value: 'synthesizes', label: '統合', guidance: '複数の問いをまとめ、新しい問いを作ります。' },
    { value: 'reframes', label: '再解釈', guidance: '異なる視点から問いを捉え直します。' },
    { value: 'annotates', label: '注釈', guidance: '説明・補足・解釈を加えます。' },
    { value: 'revises', label: '改訂', guidance: '元の問いを消さず、訂正または更新します。' },
  ]);

  function text(value) { return typeof value === 'string' ? value.trim() : ''; }

  function relationDetails(input) {
    const relationType = text(input.relationType);
    if (relationType === 'translated_from') return { sourceLanguage: text(input.sourceLanguage), targetLanguage: text(input.targetLanguage) };
    if (relationType === 'observed_alongside') return { observationNote: text(input.observationNote), contextNote: text(input.contextNote) };
    if (relationType === 'contrasts_with' || relationType === 'reframes') return { rationale: text(input.rationale) };
    if (relationType === 'annotates') return { annotationText: text(input.annotationText), rationale: text(input.rationale) };
    if (relationType === 'revises') return { revisionSummary: text(input.revisionSummary) };
    if (relationType === 'synthesizes') return { sourceInquiryIds: [...new Set([text(input.sourceInquiryId), ...text(input.additionalSourceIds).split(/[,\n]/).map(text)].filter(Boolean))] };
    return {};
  }

  function validateDerivationInput(input = {}) {
    const errors = [];
    const relationType = text(input.relationType);
    if (!/^tt:evt:[^\s]+$/.test(text(input.sourceInquiryId))) errors.push('派生元のCanonical Event IDを入力してください。');
    if (!RELATIONS.some(item => item.value === relationType)) errors.push('relation種別を選択してください。');
    if (!text(input.inquiryText)) errors.push('派生する問いを入力してください。');
    if (input.relationConfirmedByHuman !== true) errors.push('relationを人間が確認してください。');
    const details = relationDetails(input);
    if (relationType === 'translated_from' && (!details.sourceLanguage || !details.targetLanguage || details.sourceLanguage === details.targetLanguage)) errors.push('翻訳元と翻訳先の異なる言語を入力してください。');
    if (relationType === 'observed_alongside' && !details.observationNote && !details.contextNote) errors.push('同時観察または共有文脈を入力してください。');
    if ((relationType === 'contrasts_with' || relationType === 'reframes') && !details.rationale) errors.push('relationの理由を入力してください。');
    if (relationType === 'annotates' && !details.annotationText && !details.rationale) errors.push('注釈内容を入力してください。');
    if (relationType === 'revises' && !details.revisionSummary) errors.push('改訂内容を入力してください。');
    if (relationType === 'synthesizes' && details.sourceInquiryIds.length < 2) errors.push('統合には2件以上の派生元が必要です。');
    return { ok: errors.length === 0, errors, relationDetails: details };
  }

  function buildDerivationRequest(input = {}) {
    const validation = validateDerivationInput(input);
    if (!validation.ok) throw new TypeError(validation.errors.join(' '));
    const aiSuggestion = text(input.aiSuggestedRelationType) ? {
      suggestedRelationType: text(input.aiSuggestedRelationType),
      note: text(input.aiSuggestionNote) || null,
    } : undefined;
    return {
      relationType: text(input.relationType),
      relationConfirmedByHuman: true,
      relationDetails: validation.relationDetails,
      text: text(input.inquiryText),
      language: text(input.language) || 'und',
      authorId: text(input.authorId) || undefined,
      aiSuggestion,
    };
  }

  return { DERIVATION_RELATIONS: RELATIONS, relationDetails, validateDerivationInput, buildDerivationRequest };
});
