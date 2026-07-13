# Toitoi Release Notes

**Status: current** | **Last updated: 2026-07-13**

この文書は、Toitoi の公開基準点を短く記録するための release note です。

---

## v0.2.0

**Status: in development**

v0.2.0 は、Toitoi 固有の「問いの一生」を再現可能な Golden Path として示す最初のリリースを目標とします。

### Planned Highlights

- 雑草相の変化を題材にした Golden Path reference fixture
- ingest → persistence → replay → Standard API の一貫した E2E 検証
- inquiry detail、provenance、lineage tree、context / relationship query の検証
- v0.2.0 の必須スコープ、非対象、release candidate 判定基準の文書化

### Release Criteria

- workspace tests が成功する
- Golden Path が fixture とテストで再現できる
- Canonical Event contract に未文書化の破壊的変更がない
- Nostr / Lingonberry の主要 runtime に重大な既知回帰がない

詳細は [`V0.2.0_RELEASE_PLAN.md`](./V0.2.0_RELEASE_PLAN.md) を参照してください。

### Known Limitations

- frontend の完全な lineage editor は対象外
- AI 生成 inquiry の無人公開は対象外
- embeddings、graph inference、新 transport、大規模検索最適化は後続フェーズで扱う

---

## v0.1.0

**Status: release candidate**

v0.1.0 は、Toitoi の canonical event と multi-transport MVP を外部から参照できる最初の基準点です。

### Highlights

- Canonical Event `schemaVersion: 0.1.0` を stable な最小契約として固定した
- Nostr / ATProto / Lingonberry の ingest、canonicalize、storage、replay、Standard API 接続を揃えた
- protocol registry と storage runtime による protocol 選択を整理した
- multi-transport fan-out / fan-in、canonical identity、identity key / claim の最小実装を接続した
- Standard API で canonical view、protocol introspection、storage runtime の説明を返せるようにした
- LocalFS は registry 登録済みの metadata-only / future migration 対象として残し、runtime replay は明示的に unsupported とした

### Scope

このリリースは、production-grade product release ではなく、protocol / API contract の初期公開リリースとして扱います。

### Known Follow-ups

- Lingonberry の実 carrier に対する手元 live smoke を行う
- Lingonberry live relay ingest worker の必要性を確認する
- embeddings、graph inference、ActivityPub、DB / search engine 最適化は後続フェーズで扱う
