# Toitoi Frontend

**Status: v0.5.0** | **Last updated: 2026-07-19**

`apps/frontend/` は、ToitoiのStandard APIが返すtransport-independentなcanonical viewとAI annotation viewを、利用者向けの表示モデルへ変換するreference frontend layerです。

現時点ではframework非依存のview model、HTML renderer、cross-feature Golden Pathを中心に実装しています。完成済みのproduction GUIではありませんが、v0.3.0のknowledge-space workflow、v0.4.0のAI annotation presentation、v0.5.0のhuman-reviewed inquiry generationをdefault CIで再現できます。

## 実装済み範囲

### v0.3.0 knowledge-space workflow

```text
inquiry detail
  → lineage tree
  → context exploration
  → reviewed derived inquiry creation
  → publication / re-ingest / replay
  → updated lineage tree
```

- Canonical Eventのdetail、context、relationship、provenance表示
- root / branch / leaf、relation type、missing reference、cycleを扱うlineage tree
- `climate_zone`、`soil_type`、`farming_context`、`crop_family`によるcontext exploration
- Inquiry Draftとhuman reviewを使ったderived inquiry publication
- `approved`以外を拒否するpublication guard

### v0.4.0 AI annotation presentation

AI annotationは公開済みinquiryとして表示せず、人間確認が必要な補助情報として表示します。

表示内容:

- summary、tag、または問い候補
- source event ID
- model、model version、prompt version
- `unreviewed` / `accepted` / `edited` / `rejected` review state
- draft作成の補助入力として利用可能かどうか
- annotation review後も別途Inquiry Draft reviewが必要であること

主要実装:

- `ai_review_model.js`
- `ai_review_renderer.js`
- `test_ai_review.js`

rendererはHTML escaping、empty state、error stateを扱います。AI出力の内容を農業上の正解として提示しません。

### v0.5.0 human-reviewed inquiry generation

v0.5.0では、保存済みobservationから生成された複数の問い候補を、人間のannotation reviewとpublication reviewの二段階境界へ接続しました。

```text
saved observation
  → asynchronous generate_inquiries job
  → multiple inquiry candidates
  → accept / edit / reject through AI review API
  → selected candidate promoted to Inquiry Draft
  → publication rejected while draft
  → independent human publication approval
```

問い候補は次を保持します。

- `inquiry`
- `context`
- `observation`
- `relationship`
- `uncertainty`
- `tags`
- `source_refs`

annotation acceptanceはpublication approvalではありません。promotion後のInquiry Draftにも既存の`draft → in_review → approved` workflowが適用されます。

## Golden Paths

### v0.3.0

`test_v0_3_0_golden_path.js`はdetail、lineage、context exploration、derived draft、human approval、Nostr projection、re-ingest、replayまでを検証します。

### v0.4.0

`test_v0_4_0_golden_path.js`は次を一続きに検証します。

1. observation由来のAI jobをenqueueする
2. deterministic providerで非同期推論を実行する
3. `unreviewed` annotationを永続化する
4. frontendで未公開のAI補助として表示する
5. 人間がannotationをacceptする
6. accepted annotationをlineage付きInquiry Draftへ昇格する
7. `draft`状態での公開を拒否する
8. `in_review`へ提出し、人間が承認する
9. 承認後のみ公開可能とする

### v0.5.0

`test_v0_5_0_golden_path.js`は次を検証します。

1. observationを保存する
2. `generate_inquiries` jobを非同期実行する
3. schema-validな複数候補を生成する
4. AI review mutation APIから候補をacceptする
5. 選択候補をvalidなInquiry Draftへpromotionする
6. source lineageとAI provenanceを確認する
7. annotation acceptance直後の公開を拒否する
8. 独立したpublication reviewerがdraftを承認する
9. approved draftのみpublishableになることを確認する

## API dependency

frontendはtransport固有eventを直接解釈せず、Standard APIを利用します。

Canonical view:

- `GET /api/v1/inquiries/:id/detail`
- `GET /api/v1/inquiries/:id/tree`
- `GET /api/v1/inquiries/query`

AI inspection view:

- `GET /api/v1/ai/annotations`
- `GET /api/v1/ai/annotations/:id`
- `GET /api/v1/ai/events/:eventId`

AI review mutation:

- `POST /api/v1/ai/annotations/:id/accept`
- `POST /api/v1/ai/annotations/:id/edit`
- `POST /api/v1/ai/annotations/:id/reject`

v0.5.0はmutation API contractとGolden Pathを実装していますが、完成したinteractive review SPAはまだ対象外です。

## Test

workspace root:

```bash
corepack pnpm test
```

frontendのみ:

```bash
corepack pnpm --filter @toitoi/frontend test
```

主な実行対象:

- `test_inquiry_view_model.js`
- `test_lineage_tree_renderer.js`
- `test_context_exploration.js`
- `test_ai_review.js`
- `test_v0_3_0_golden_path.js`
- `test_v0_4_0_golden_path.js`
- `test_v0_5_0_golden_path.js`

## UX原則

- 問いを正解や処方として表示しない
- AI出力を公開済みinquiryと混同しない
- annotation reviewとpublication reviewを明確に分離する
- 自然言語の`body.text`を主役にする
- 文脈差を消去せず比較可能にする
- 類似と同一性を混同しない
- provenance、model情報、人間確認状態を追跡可能にする
- human reviewをpublication boundaryとして維持する
- transport固有表現をUIへ過剰に露出しない
- keyboard操作、HTML escaping、欠損データへの耐性を維持する

## 非対象・将来構想

v0.5.0では次を完成済みとは扱いません。

- production-readyなSPA／PWA／モバイルアプリ
- 完成したAI annotation review／promotion UI
- 本格的なoffline observation storageとsynchronization
- canvasベースの大規模グラフUI
- relation typeの自由編集UI
- 複数人同時編集
- embeddings、vector search、RAG
- graph inference
- production authentication / authorization
- AIによる無人公開

## 関連文書

- [Standard API](../api/README.md)
- [v0.5.0 Release Plan](../../docs/roadmap/V0.5.0_RELEASE_PLAN.md)
- [v0.5.0 Release Runbook](../../docs/roadmap/V0.5.0_RELEASE_RUNBOOK.md)
- [v0.5.0 GitHub Release Content](../../docs/roadmap/V0.5.0_GITHUB_RELEASE.md)
- [AI Adoption Roadmap](../../docs/roadmap/AI_ADOPTION_ROADMAP.md)
- [Inquiry Draft Contract](../../docs/protocols/INQUIRY_DRAFT.md)
- [v0.3.0 User Journey](./V0.3.0_USER_JOURNEY.md)
