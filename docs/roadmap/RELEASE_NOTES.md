# Toitoi Release Notes

**Status: current** | **Last updated: 2026-07-15**

この文書は、Toitoi の公開基準点を短く記録するための release note です。

---

## v0.3.0

**Status: planned**

v0.3.0 は、v0.2.0 で固定した「問いの一生」の Golden Path を、閲覧可能な reference implementation から、問いを発見・比較・派生できる最初の知識空間へ進めるリリースです。

### Planned Highlights

- inquiry detail と接続された lineage tree
- root / parent / child / derived inquiry と relation type の可視化
- contexts / relationships に基づく inquiry 探索と比較
- lineage を保持した derived inquiry draft の作成
- human review と publication guard を通した派生 inquiry 公開
- 派生元、操作種別、作成主体、AI関与、人間確認を追跡できる provenance
- 公開後の lineage tree と Standard API canonical view への反映
- 雑草相 Golden Path を使った browser-level E2E / contract validation

### Required Scope

- [#16](https://github.com/nkkmd/Toitoi/issues/16): lineage tree を中核UIとして実装する
- [#17](https://github.com/nkkmd/Toitoi/issues/17): context に基づく inquiry 探索を実装する
- [#18](https://github.com/nkkmd/Toitoi/issues/18): lineage を保持した派生 inquiry 作成を実装する
- [#19](https://github.com/nkkmd/Toitoi/issues/19): release tracking と横断的な release gate

### Release Criteria

- 雑草相 Golden Path を detail → lineage → context exploration → derived inquiry creation までブラウザ上で辿れる
- `approved` 以外の Inquiry Draft が公開されない
- 派生 inquiry の lineage / provenance が publish、retrieve、re-ingest、replay 後も維持される
- canonical identity と semantic relationship を混同しない
- workspace tests と追加された frontend / API / E2E contracts が成功する
- Nostr / Lingonberry の deterministic operational smoke に既知回帰がない
- release plan、release notes、release runbook、known limitations が整合している

### Non-goals

- 新transport追加
- embeddings 必須の意味検索
- graph inference
- 本格的なオフライン同期
- 語彙管理UI
- 外部SDKまたはgovernance processの完成
- AI生成 inquiry の無人公開

詳細は [`V0.3.0_RELEASE_PLAN.md`](./V0.3.0_RELEASE_PLAN.md) を参照してください。

---

## v0.2.0

**Status: release candidate**

v0.2.0 は、Toitoi 固有の「問いの一生」を、公開前の人間確認から Canonical Event、保存、検索、派生、provenance / lineage 取得、frontend 表示境界、primary transport の再取り込みまで再現可能な Golden Path として示す最初のリリースです。

### Highlights

- 雑草相の変化を題材にした Golden Path reference fixture
- ingest → persistence → replay → Standard API の一貫した E2E 検証
- inquiry detail、provenance、lineage tree、context / relationship query の検証
- schema-valid な Nostr lineage tag と回帰テスト
- Canonical Event とは分離された Inquiry Draft contract
- `draft` → `in_review` → `approved` / `rejected` の human review workflow
- `approved` 以外の draft を公開させない publication guard
- Standard API response を transport-independent な frontend render model へ変換する境界
- loading / empty / ready / error state と三段階 lineage tree の frontend contract test
- Nostr と Lingonberry の publish → retrieve → re-ingest deterministic operational smoke
- v0.2.0 の必須スコープ、非対象、release candidate 判定基準の文書化

### Validation

- workspace root の `corepack pnpm install` を GitHub Actions で実行
- workspace root の `corepack pnpm test` を GitHub Actions で実行
- Golden Path、Inquiry Draft、frontend view model、primary transport smoke を default CI に含める

### Release Criteria

- workspace tests が成功する
- Golden Path が fixture とテストで再現できる
- Human-reviewed Inquiry Draft contract と publication guard が検証される
- Canonical Event contract に未文書化の破壊的変更がない
- Nostr / Lingonberry の deterministic publish / retrieve / re-ingest に既知回帰がない
- frontend render model から Golden Path の detail / provenance / lineage を確認できる

詳細は [`V0.2.0_RELEASE_PLAN.md`](./V0.2.0_RELEASE_PLAN.md) を参照してください。

### Known Limitations

- frontend は framework-independent render model までで、完成したGUIや完全な lineage editor は対象外
- AI 生成 inquiry の無人公開は対象外であり、公開には明示的な人間承認が必要
- production-grade authentication / authorization / rate limiting は対象外
- default operational smoke は外部networkを使わない決定的テストであり、実relay / carrierの可用性や長期信頼性を保証しない
- Lingonberry live smoke と multi-transport live check は環境変数で明示的に有効化する
- embeddings、graph inference、新 transport、大規模DB・検索最適化は後続フェーズで扱う

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
