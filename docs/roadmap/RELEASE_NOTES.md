# Toitoi Release Notes

**Status: current** | **Last updated: 2026-07-15**

この文書は、Toitoi の公開基準点を短く記録するための release note です。

---

## v0.3.0

**Status: release candidate**

v0.3.0 は、v0.2.0 で固定した「問いの一生」の Golden Path を、閲覧可能な reference implementation から、問いを発見・比較・派生できる最初の知識空間へ進めるリリースです。

### Highlights

- inquiry detail と接続された、選択・relation・provenance対応の lineage tree
- root / branch / leaf / cycle / missing nodeを扱うresilient frontend contract
- contextsに基づくinquiry探索、条件表示、異なる文脈の比較
- context similarityをcanonical identity mergeと混同しない明示的なsemantics
- lineageを保持したderived inquiry draftの作成
- `draft` → `in_review` → `approved` / `rejected`のhuman review workflow再利用
- `approved`以外を拒否するpublication guard
- 派生元、relation type、作成主体、AI関与、人間確認を追跡する`meta.publication`
- Nostr relation marker付き`e` tagとLingonberry lineage metadataへのtransport projection
- detail → lineage → context exploration → reviewed derivation → Nostr re-ingest → updated lineageを一続きで確認するv0.3.0 Golden Path

### Completed Scope

- [#16](https://github.com/nkkmd/Toitoi/issues/16): lineage tree を中核UIとして実装
- [#17](https://github.com/nkkmd/Toitoi/issues/17): context に基づく inquiry 探索を実装
- [#18](https://github.com/nkkmd/Toitoi/issues/18): lineage を保持した派生 inquiry 作成を実装
- [#19](https://github.com/nkkmd/Toitoi/issues/19): release tracking、横断E2E、release gate

### Validation

- workspace rootの`corepack pnpm install --frozen-lockfile`をdefault CIで実行
- workspace rootの`corepack pnpm test`をdefault CIで実行
- lineage、context exploration、derived inquiryのcontract testsをdefault CIへ追加
- 雑草相fixtureを使ったv0.3.0 cross-feature Golden Pathをdefault CIへ追加
- Nostr / Lingonberry deterministic operational smokeを既存workspace testsで回帰確認

### Release Criteria

- 雑草相 Golden Path を detail → lineage → context exploration → derived inquiry creation まで辿れる
- `approved` 以外の Inquiry Draft が公開されない
- 派生 inquiry の lineage / provenance が transport projection、re-ingest、persistence、replay 後も維持される
- canonical identity と semantic relationship を混同しない
- workspace tests と frontend / API / protocol / transport contracts が成功する
- release plan、release notes、release runbook、known limitations が整合している

### Known Limitations

- frontendはframework-independent model / HTML rendererが中心で、完成したSPA製品ではない
- 汎用lineage editor、relation type自由編集、複数人同時編集は対象外
- production-grade authentication / authorization / rate limitingは対象外
- default operational smokeは外部networkを使わない決定的テストであり、実relay / carrierの可用性を保証しない
- embeddings、graph inference、本格オフライン同期、新transport、大規模DB最適化は後続リリースで扱う
- AI生成inquiryの無人公開は行わず、明示的なhuman reviewを必須とする

詳細は [`V0.3.0_RELEASE_PLAN.md`](./V0.3.0_RELEASE_PLAN.md) と [`V0.3.0_RELEASE_RUNBOOK.md`](./V0.3.0_RELEASE_RUNBOOK.md) を参照してください。

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
