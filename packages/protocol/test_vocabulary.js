'use strict';

const assert = require('assert');
const {
  classifyVocabularyConnection,
  createVocabularyMappingClaim,
  createVocabularyTerm,
} = require('./vocabulary');

function run() {
  const local = createVocabularyTerm({
    id: 'local:shikoku:hiyoko-gusa',
    scope: 'local',
    vocabularyId: 'toitoi-local-shikoku',
    locality: 'Shikoku',
    labels: { ja: 'ひよこ草', 'ja-Latn': 'hiyoko-gusa' },
    definition: 'A locally used weed name whose referent must be confirmed in context.',
    provenance: { authorId: 'human:farmer-a' },
  });
  assert.strictEqual(local.scope, 'local');
  assert.strictEqual(local.locality, 'Shikoku');

  const domain = createVocabularyTerm({
    id: 'domain:agroecology:chickweed',
    scope: 'domain',
    vocabularyId: 'toitoi-agroecology',
    labels: { en: 'chickweed', ja: 'ハコベ類' },
  });
  assert.strictEqual(domain.scope, 'domain');

  const proposed = createVocabularyMappingClaim({
    id: 'mapping:hiyoko-gusa:chickweed',
    sourceTermId: local.id,
    targetTermId: domain.id,
    relation: 'close_match',
    rationale: 'Local usage appears to overlap but has not been taxonomically confirmed.',
    status: 'proposed',
    confirmedByHuman: true,
    provenance: { sourceObservationId: 'observation:one' },
  });
  assert.strictEqual(classifyVocabularyConnection(proposed), 'mapping_candidate');

  const acceptedExact = createVocabularyMappingClaim({
    id: 'mapping:confirmed-term',
    sourceTermId: 'local:confirmed',
    targetTermId: 'domain:confirmed',
    relation: 'exact_match',
    rationale: 'Confirmed by local and domain reviewers.',
    status: 'accepted',
    confirmedByHuman: true,
  });
  assert.strictEqual(classifyVocabularyConnection(acceptedExact), 'mapped_equivalent');

  assert.throws(() => createVocabularyTerm({
    id: 'bad', scope: 'local', vocabularyId: 'v', labels: { ja: '語' },
  }), /locality/);
  assert.throws(() => createVocabularyMappingClaim({
    id: 'bad', sourceTermId: 'same', targetTermId: 'same', relation: 'exact_match', rationale: 'x',
  }), /distinct/);

  console.log('Vocabulary contract tests passed');
}

run();
