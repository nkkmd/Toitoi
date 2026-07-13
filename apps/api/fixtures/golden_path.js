'use strict';

const GOLDEN_PATH_IDS = Object.freeze({
  root: '0000000000000000000000000000000000000000000000000000000000000001',
  translated: '0000000000000000000000000000000000000000000000000000000000000002',
  comparison: '0000000000000000000000000000000000000000000000000000000000000003',
});

const GOLDEN_PATH_RELAY = 'wss://relay.example.com';

function createGoldenPathEvents(makeEvent) {
  if (typeof makeEvent !== 'function') {
    throw new TypeError('makeEvent must be a function');
  }

  return [
    makeEvent({
      id: GOLDEN_PATH_IDS.root,
      created_at: 100,
      content: '畑の東側だけ雑草の種類が違う。微気候や土壌水分との関係を確かめたい。',
      tags: [
        ['t', 'agroecology'],
        ['context', 'field_zone', 'east'],
        ['context', 'climate_zone', 'warm-temperate'],
        ['relationship', 'microclimate', 'weed_flora'],
        ['phase', 'beginner'],
      ],
    }),
    makeEvent({
      id: GOLDEN_PATH_IDS.translated,
      created_at: 101,
      content: '別地域でも圃場の東側だけ雑草相が異なるか。斜面方位と水分条件を比較したい。',
      tags: [
        ['t', 'agroecology'],
        ['context', 'field_zone', 'east'],
        ['context', 'climate_zone', 'cool-temperate'],
        ['relationship', 'translated_from', GOLDEN_PATH_IDS.root],
        ['relationship', 'microclimate', 'weed_flora'],
        ['e', GOLDEN_PATH_IDS.root, GOLDEN_PATH_RELAY, 'reply'],
        ['phase', 'intermediate'],
      ],
    }),
    makeEvent({
      id: GOLDEN_PATH_IDS.comparison,
      created_at: 102,
      content: '二つの地域の問いを並べ、日照、土壌水分、管理履歴の差を観察する。',
      tags: [
        ['t', 'agroecology'],
        ['relationship', 'observed_alongside', GOLDEN_PATH_IDS.root],
        ['relationship', 'observed_alongside', GOLDEN_PATH_IDS.translated],
        ['e', GOLDEN_PATH_IDS.translated, GOLDEN_PATH_RELAY, 'reply'],
        ['phase', 'expert'],
      ],
    }),
  ];
}

module.exports = {
  GOLDEN_PATH_IDS,
  GOLDEN_PATH_RELAY,
  createGoldenPathEvents,
};
