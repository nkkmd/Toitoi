'use strict';

const { DatabaseSync } = require('node:sqlite');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function stringValue(value) {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function stringArray(value) {
  return Array.isArray(value) ? value.map(stringValue).filter(Boolean) : [];
}

function objectEntries(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value)
    : [];
}

function provenanceSources(event) {
  return Array.isArray(event?.provenance?.sources)
    ? event.provenance.sources.filter(source => source && typeof source === 'object')
    : [];
}

function collectRelationTerms(event) {
  const terms = [];
  for (const relation of Array.isArray(event?.relationships) ? event.relationships : []) {
    if (!relation || typeof relation !== 'object') continue;
    terms.push(
      stringValue(relation.type),
      stringValue(relation.relation),
      stringValue(relation.source),
      stringValue(relation.target),
    );
  }
  for (const edge of Array.isArray(event?.lineage) ? event.lineage : []) {
    if (!edge || typeof edge !== 'object') continue;
    terms.push(
      stringValue(edge.type),
      stringValue(edge.relation),
      stringValue(edge.source),
      stringValue(edge.target),
    );
  }
  return terms.filter(Boolean);
}

function collectContextTerms(event) {
  const terms = [];
  for (const [key, value] of objectEntries(event?.contexts)) {
    terms.push(stringValue(key), stringValue(value));
  }
  return terms.filter(Boolean);
}

function resolveObservationText(event) {
  return [
    event?.observation?.text,
    event?.body?.observation,
    event?.body?.observationText,
    event?.metadata?.observation,
  ].map(stringValue).find(Boolean) || '';
}

function resolveSummaryText(event) {
  const direct = [
    event?.summary,
    event?.body?.summary,
    event?.metadata?.summary,
  ].map(stringValue).find(Boolean);
  if (direct) return direct;

  const annotations = Array.isArray(event?.annotations) ? event.annotations : [];
  const accepted = annotations.find(annotation => {
    if (!annotation || typeof annotation !== 'object') return false;
    const kind = stringValue(annotation.kind || annotation.type);
    const reviewState = stringValue(annotation.reviewState || annotation.review_state);
    return kind === 'summary' && ['accepted', 'edited', 'approved'].includes(reviewState);
  });
  return stringValue(accepted?.output?.summary || accepted?.summary || accepted?.text);
}

function resolveTransport(event) {
  const sourceProtocol = provenanceSources(event)
    .map(source => stringValue(source.protocol || source.sourceProtocol || source.transport))
    .find(Boolean);
  return sourceProtocol || stringValue(
    event?.provenance?.sourceProtocol
      || event?.provenance?.transport
      || event?.sourceProtocol
      || event?.transport,
  );
}

function resolveProvenance(event) {
  const parts = [
    event?.provenance?.sourceId,
    event?.provenance?.actorId,
    event?.provenance?.authorId,
    event?.metadata?.authorId,
  ];
  for (const source of provenanceSources(event)) {
    parts.push(
      source.protocol,
      source.sourceProtocol,
      source.transport,
      source.sourceId,
      source.id,
      source.uri,
      source.actorId,
      source.authorId,
      source.eventId,
    );
  }
  return parts.map(stringValue).filter(Boolean).join(' ');
}

function resolveReviewState(event) {
  return stringValue(
    event?.review?.state
      || event?.reviewState
      || event?.review_state
      || event?.metadata?.reviewState
      || event?.metadata?.review_state
      || event?.meta?.publication?.humanReview?.decision,
  );
}

function projectSearchDocument(event) {
  if (!event || typeof event !== 'object' || !isNonEmptyString(event.id)) {
    throw new TypeError('A search document requires a Canonical Event with a non-empty id');
  }

  const contexts = event.contexts && typeof event.contexts === 'object' ? event.contexts : {};
  const labels = [
    ...stringArray(event.labels),
    ...stringArray(event.tags),
    ...stringArray(event.body?.tags),
  ];

  return {
    id: event.id.trim(),
    eventType: stringValue(event.type),
    primaryText: stringValue(event.body?.text || event.text || event.title),
    observationText: resolveObservationText(event),
    summaryText: resolveSummaryText(event),
    tagsText: labels.join(' '),
    contextsText: collectContextTerms(event).join(' '),
    relationsText: collectRelationTerms(event).join(' '),
    region: stringValue(contexts.region || contexts.locality || contexts.place),
    climate: stringValue(contexts.climate || contexts.climate_zone),
    soil: stringValue(contexts.soil || contexts.soil_type),
    crop: stringValue(contexts.crop || contexts.crop_family || contexts.crop_type),
    season: stringValue(contexts.season),
    transport: resolveTransport(event),
    provenance: resolveProvenance(event),
    reviewState: resolveReviewState(event),
    createdAt: stringValue(event.createdAt),
  };
}

function escapeFtsToken(token) {
  return `"${token.replace(/"/g, '""')}"`;
}

function buildFtsQuery(query) {
  if (!isNonEmptyString(query)) return null;
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 ? tokens.map(escapeFtsToken).join(' AND ') : null;
}

function normalizeLimit(value, fallback = 20) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function normalizeOffset(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function createFts5SearchProjection(options = {}) {
  const database = options.database || new DatabaseSync(options.filename || ':memory:');
  database.exec(`
    CREATE TABLE IF NOT EXISTS search_documents (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      region TEXT NOT NULL,
      climate TEXT NOT NULL,
      soil TEXT NOT NULL,
      crop TEXT NOT NULL,
      season TEXT NOT NULL,
      transport TEXT NOT NULL,
      provenance TEXT NOT NULL,
      review_state TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS search_documents_fts USING fts5(
      id UNINDEXED,
      primary_text,
      observation_text,
      summary_text,
      tags_text,
      contexts_text,
      relations_text,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `);

  const deleteAllDocuments = database.prepare('DELETE FROM search_documents');
  const deleteAllFtsDocuments = database.prepare('DELETE FROM search_documents_fts');
  const deleteDocument = database.prepare('DELETE FROM search_documents WHERE id = ?');
  const deleteFtsDocument = database.prepare('DELETE FROM search_documents_fts WHERE id = ?');
  const insertDocument = database.prepare(`
    INSERT INTO search_documents (
      id, event_type, region, climate, soil, crop, season,
      transport, provenance, review_state, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFtsDocument = database.prepare(`
    INSERT INTO search_documents_fts (
      id, primary_text, observation_text, summary_text,
      tags_text, contexts_text, relations_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  function insertProjected(document) {
    insertDocument.run(
      document.id,
      document.eventType,
      document.region,
      document.climate,
      document.soil,
      document.crop,
      document.season,
      document.transport,
      document.provenance,
      document.reviewState,
      document.createdAt,
    );
    insertFtsDocument.run(
      document.id,
      document.primaryText,
      document.observationText,
      document.summaryText,
      document.tagsText,
      document.contextsText,
      document.relationsText,
    );
  }

  function upsert(event) {
    const document = projectSearchDocument(event);
    database.exec('BEGIN IMMEDIATE');
    try {
      deleteFtsDocument.run(document.id);
      deleteDocument.run(document.id);
      insertProjected(document);
      database.exec('COMMIT');
      return document;
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  function rebuild(events) {
    const canonicalEvents = Array.isArray(events) ? events : [];
    database.exec('BEGIN IMMEDIATE');
    try {
      deleteAllFtsDocuments.run();
      deleteAllDocuments.run();
      for (const event of canonicalEvents) insertProjected(projectSearchDocument(event));
      database.exec('COMMIT');
      return { indexed: canonicalEvents.length };
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  function search(options = {}) {
    const query = buildFtsQuery(options.query || options.q);
    const filters = {
      eventType: stringValue(options.eventType || options.type),
      region: stringValue(options.region),
      climate: stringValue(options.climate || options.climate_zone),
      soil: stringValue(options.soil || options.soil_type),
      crop: stringValue(options.crop || options.crop_family),
      season: stringValue(options.season),
      transport: stringValue(options.transport),
      provenance: stringValue(options.provenance),
      reviewState: stringValue(options.reviewState || options.review_state),
    };
    const where = [];
    const parameters = [];

    if (query) {
      where.push('search_documents_fts MATCH ?');
      parameters.push(query);
    }
    for (const [column, value] of [
      ['d.event_type', filters.eventType],
      ['d.region', filters.region],
      ['d.climate', filters.climate],
      ['d.soil', filters.soil],
      ['d.crop', filters.crop],
      ['d.season', filters.season],
      ['d.transport', filters.transport],
      ['d.provenance', filters.provenance],
      ['d.review_state', filters.reviewState],
    ]) {
      if (value) {
        where.push(`${column} = ?`);
        parameters.push(value);
      }
    }

    const predicate = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const rankExpression = query ? 'bm25(search_documents_fts)' : '0';
    const count = database.prepare(`
      SELECT COUNT(*) AS total
      FROM search_documents_fts
      JOIN search_documents d ON d.id = search_documents_fts.id
      ${predicate}
    `).get(...parameters).total;
    const limit = normalizeLimit(options.limit);
    const offset = normalizeOffset(options.offset);
    const rows = database.prepare(`
      SELECT
        d.id,
        d.event_type AS eventType,
        d.region,
        d.climate,
        d.soil,
        d.crop,
        d.season,
        d.transport,
        d.provenance,
        d.review_state AS reviewState,
        d.created_at AS createdAt,
        ${rankExpression} AS rank
      FROM search_documents_fts
      JOIN search_documents d ON d.id = search_documents_fts.id
      ${predicate}
      ORDER BY rank ASC, d.created_at DESC, d.id ASC
      LIMIT ? OFFSET ?
    `).all(...parameters, limit, offset);

    return {
      total: Number(count),
      limit,
      offset,
      results: rows.map(row => ({
        ...row,
        classification: 'related_candidate',
        signals: {
          lexical: Boolean(query),
          structuredFilters: Object.values(filters).some(Boolean),
        },
      })),
    };
  }

  function facets(dimension) {
    const allowed = new Map([
      ['region', 'region'],
      ['climate', 'climate'],
      ['soil', 'soil'],
      ['crop', 'crop'],
      ['season', 'season'],
      ['transport', 'transport'],
      ['review_state', 'review_state'],
    ]);
    const column = allowed.get(dimension);
    if (!column) throw new RangeError(`Unsupported facet dimension: ${dimension}`);
    return database.prepare(`
      SELECT ${column} AS value, COUNT(*) AS count
      FROM search_documents
      WHERE ${column} <> ''
      GROUP BY ${column}
      ORDER BY count DESC, value ASC
    `).all().map(row => ({ value: row.value, count: Number(row.count) }));
  }

  function close() {
    if (typeof database.close === 'function') database.close();
  }

  return { close, database, facets, rebuild, search, upsert };
}

module.exports = {
  buildFtsQuery,
  createFts5SearchProjection,
  projectSearchDocument,
  resolveProvenance,
  resolveReviewState,
  resolveTransport,
};
