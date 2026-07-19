# Toitoi Release Notes

**Status: current** | **Last updated: 2026-07-19**

この文書は、Toitoi の公開基準点を短く記録するための release note です。

---

## v0.5.0

**Status: release candidate preparation**

v0.5.0 は、v0.4.0 で確立した非同期 AI annotation 基盤を、Toitoi の中心機能である監査可能な問い候補生成へ拡張するリリースです。保存済み observation から複数の inquiry candidate を生成できますが、AI 出力は Canonical Event ではなく annotation として保持され、人間による accept / edit と既存の Inquiry Draft publication review を経て初めて公開可能になります。

### Highlights

- llama.cpp の OpenAI-compatible HTTP endpoint に接続する production inference provider
- 一つの observation から複数候補を生成する versioned `generate_inquiries` annotation contract
- `inquiry`、`context`、`observation`、`relationship`、`uncertainty`、`tags`、`source_refs` の保持
- malformed JSON / malformed candidate schema の annotation persistence 前 rejection
- model、model version、prompt version、raw output、generation time を保持する provenance
- append-only な annotation accept / edit / reject mutation service と HTTP routes
- accepted / edited candidate から既存契約に準拠した Inquiry Draft を作る明示的 promotion
- 4GB RAM クラスを想定した single-worker、bounded-output、timeout 対応の低資源プロファイル
- observation → inquiry generation → API review → draft → publication guard → human approval を検証する v0.5.0 Golden Path

### Completed Scope

- production llama.cpp-compatible provider と deterministic CI provider
- inquiry-generation annotation contract と schema validation
- annotation review mutation boundary
- selected candidate promotion と source lineage / AI provenance retention
- mutation API、package contract tests、cross-feature Golden Path
- v0.5.0 release plan、release runbook、known limitations

### Validation

- workspace root の `corepack pnpm install --frozen-lockfile` を default CI で実行
- workspace root の `corepack pnpm test` を default CI で実行
- CI Run #386 で workspace installation と全テストが成功
- deterministic inquiry generation、llama.cpp-compatible response parsing、malformed-output rejection を検証
- accept / edit / reject、重複 mutation rejection、promotion rejection path を検証
- v0.4.0 以前の frontend / API / protocol / transport tests を同じ workspace run で回帰確認

### Release Criteria

- inference failure が observation ingest や canonical persistence を停止させない
- model response が annotation persistence 前に schema validation される
- candidate から source event、model、prompt version、raw output を追跡できる
- unreviewed / rejected annotation は Inquiry Draft に promotion できない
- annotation acceptance と publication approval が別の監査操作として維持される
- promoted candidate が既存 Inquiry Draft contract と publication guard を通る
- v0.5.0 Golden Path と workspace tests が default CI で成功する

### Known Limitations

- 完成した一般利用者向け SPA / PWA とオフライン同期は v0.6.0 の対象
- production-grade authentication、authorization、rate limiting は未実装
- AI queue は local single-process を前提とし、distributed queue ではない
- 実モデルの品質と農業上の妥当性は保証しない
- live llama.cpp check は opt-in であり、default CI は deterministic provider を使用する
- embeddings、vector database、RAG、semantic identity merge は対象外
- AI 生成 inquiry の無人公開は行わず、明示的な human review を必須とする

詳細は [`V0.5.0_RELEASE_PLAN.md`](./V0.5.0_RELEASE_PLAN.md) と [`V0.5.0_RELEASE_RUNBOOK.md`](./V0.5.0_RELEASE_RUNBOOK.md) を参照してください。

---

## v0.4.0

**Status: released**

v0.4.0 は、v0.3.0 で確立した human-reviewed inquiry derivation の手前に、非同期 AI 補助層を接続するリリースです。AI 出力は Canonical Event や公開済み inquiry を直接変更せず、監査可能な annotation として保存され、人間による確認と既存の Inquiry Draft workflow を経て初めて公開候補になります。

### Highlights

- ingest 経路と分離された、重複抑止・bounded retry 対応の AI job queue
- summary / tag を扱う versioned AI annotation contract
- model、prompt version、raw output、review state を保持する AI provenance
- append-only JSONL による job transition / annotation persistence
- プロセス再起動後の job 復元と、中断された `processing` job の明示的な再キュー化
- provider-neutral worker boundary と、CI／オフライン検証用 deterministic provider
- `TOITOI_AI_STORAGE_DIR` を利用した read-only Standard API inspection routes
- accepted annotation を通常の Inquiry Draft へ昇格する明示的な promotion contract
- AI annotation を公開済み inquiry と区別して表示する frontend review model / renderer
- observation → async AI annotation → human acceptance → draft → human approval を検証する v0.4.0 Golden Path

### Completed Scope

- AI job queue、annotation contract、worker、persistence、recovery
- job / annotation / event 単位の read-only inspection service と HTTP routes
- annotation acceptance と Inquiry Draft promotion
- AI provenance・review state・draft 昇格可否の frontend 表示契約
- v0.4.0 release plan、release runbook、default CI release gate

### Validation

- workspace root の `corepack pnpm install --frozen-lockfile` を default CI で実行
- workspace root の `corepack pnpm test` を default CI で実行
- queue、annotation、worker、recovery、promotion の package contract tests を追加
- AI inspection HTTP routes の API contract test を追加
- AI provenance / review frontend tests を追加
- 雑草相 observation を使った v0.4.0 cross-feature Golden Path を default CI へ追加
- v0.3.0 以前の frontend / API / protocol / transport tests を同じ workspace run で回帰確認

### Release Criteria

- AI 処理を無効化しても既存 ingest / persistence / replay / Standard API が動作する
- AI failure が canonical event の保存・再処理経路を停止させない
- annotation から source event、model、prompt version、raw output、人間確認状態を追跡できる
- 中断 job を再起動後に復元・再キュー化できる
- `unreviewed` annotation は draft 昇格にも公開にも利用できない
- accepted annotation の昇格後も `draft` → `in_review` → `approved` を必須とする
- AI annotation が frontend 上で公開済み inquiry と明確に区別される
- v0.4.0 Golden Path と workspace tests が default CI で成功する

### Known Limitations

- deterministic provider は契約検証用であり、production inference model ではない
- production-grade distributed queue、authentication、authorization、rate limiting は対象外
- annotation review と promotion の HTTP mutation API は未実装で、現行 API は inspection のみ
- frontend は framework-independent model / HTML renderer が中心で、完成した SPA 製品ではない
- model quality や生成内容の農業上の妥当性は保証しない
- embeddings、vector database、RAG、semantic similarity による identity merge は後続リリースで扱う
- AI 生成 inquiry の無人公開は行わず、明示的な human review を必須とする

詳細は [`V0.4.0_RELEASE_PLAN.md`](./V0.4.0_RELEASE_PLAN.md) と [`V0.4.0_RELEASE_RUNBOOK.md`](./V0.4.0_RELEASE_RUNBOOK.md) を参照してください。

---

## v0.3.0

**Status: released**

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

**Status: released**

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

**Status: released**

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
