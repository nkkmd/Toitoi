'use strict';

const assert = require('node:assert/strict');
const {
  DERIVATION_RELATIONS,
  validateDerivationInput,
  buildDerivationRequest,
} = require('./derivation_form_model');

function run() {
  assert.equal(DERIVATION_RELATIONS.length, 8);
  const invalid = validateDerivationInput({
    sourceInquiryId: 'tt:evt:source-1',
    relationType: 'synthesizes',
    inquiryText: '統合した問い',
    relationConfirmedByHuman: true,
    additionalSourceIds: '',
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join(' '), /2件以上/);

  const request = buildDerivationRequest({
    sourceInquiryId: 'tt:evt:source-1',
    relationType: 'translated_from',
    inquiryText: 'How does soil moisture affect wilting?',
    language: 'en',
    sourceLanguage: 'ja',
    targetLanguage: 'en',
    authorId: 'human:translator',
    relationConfirmedByHuman: true,
    aiSuggestedRelationType: 'translated_from',
    aiSuggestionNote: 'language difference detected',
  });
  assert.equal(request.relationType, 'translated_from');
  assert.equal(request.relationDetails.sourceLanguage, 'ja');
  assert.equal(request.relationDetails.targetLanguage, 'en');
  assert.equal(request.relationConfirmedByHuman, true);
  assert.equal(request.aiSuggestion.suggestedRelationType, 'translated_from');

  console.log('v0.7.0 derivation form model passed');
}

run();
