# Toitoi Frontend

**Status: v0.3.0 release candidate** | **Last updated: 2026-07-15**

`apps/frontend/` は、ToitoiのStandard APIが返すtransport-independentなcanonical viewを、利用者向けの表示モデルへ変換するreference frontend layerです。

現時点ではframework非依存のview modelとHTML rendererを中心に実装しています。完成済みのproduction GUIではありませんが、v0.3.0の主要導線と状態遷移はdefault CIで再現可能です。

## v0.3.0の実装済み範囲

```text
inquiry detail
  → lineage tree
  → context exploration
  → reviewed derived inquiry creation
  → publication / re-ingest / replay
  → updated lineage tree
```

### Inquiry detail

- Canonical Eventの`body.text`、`contexts`、`relationships`、`trigger`、`phase`を表示モデルへ投影
- parent / child referenceの表示
- provenance summaryとidentity summaryの保持
- loading / empty / ready / error state

主要実装:

- `inquiry_view_model.js`
- `test_inquiry_view_model.js`

### Lineage tree

- root / branch / leafの区別
- relation typeの表示
- 選択中ノードとdetailリンク
- provenance summary
- 欠損参照と循環参照への防御
- canonical IDとtransport source IDの双方を使ったrelation照合
- HTML escaping、tree semantics、keyboard-accessible links

主要実装:

- `inquiry_view_model.js`
- `lineage_tree_renderer.js`
- `test_lineage_tree_renderer.js`

### Context exploration

対応するcontext条件:

- `climate_zone`
- `soil_type`
- `farming_context`
- `crop_family`

実装済み契約:

- 選択条件の可視化
- 一致条件と異なるcontext値の比較
- inquiry detailへの導線
- loading / empty / ready / invalid query / error state
- 文脈上の類似をcanonical identityの根拠にしない表示

主要実装:

- `context_exploration_model.js`
- `context_exploration_renderer.js`
- `test_context_exploration.js`

### Reviewed derived inquiry

派生操作はfrontend単独の自由編集モデルではなく、`@toitoi/protocol`のInquiry Draft contractを利用します。

対応relation type:

- `derived_from`
- `translated_from`
- `annotates`
- `reframes`
- `revises`
- `synthesizes`

公開条件:

- draftを`in_review`へ提出する
- 人間が`approved`または`rejected`を判断する
- `approved`以外はCanonical Event化できない
- semantic relationは`lineage`へ、workflow provenanceは`meta.publication`へ記録する

### Cross-feature Golden Path

`test_v0_3_0_golden_path.js`は、次を一続きに検証します。

1. inquiry detailを取得する
2. lineage treeを表示モデルへ変換する
3. context explorationで関連inquiryを見つける
4. 派生Inquiry Draftを作成する
5. 未承認draftの公開を拒否する
6. human reviewで承認する
7. Canonical Eventとして公開する
8. Nostrへlineageを投影する
9. 再取り込み・永続化・replayを行う
10. 派生inquiryが更新後のlineage treeに現れることを確認する

詳細な利用者導線は[`V0.3.0_USER_JOURNEY.md`](./V0.3.0_USER_JOURNEY.md)を参照してください。

## API dependency

frontendはtransport固有eventを直接解釈せず、Standard APIのcanonical viewを利用します。

主なendpoint:

- `GET /api/v1/inquiries/:id/detail`
- `GET /api/v1/inquiries/:id/tree`
- `GET /api/v1/inquiries/query`

API仕様は[`../api/README.md`](../api/README.md)を参照してください。

## Test

workspace root:

```bash
corepack pnpm test
```

frontendのみ:

```bash
corepack pnpm --filter @toitoi/frontend test
```

実行対象:

- `test_inquiry_view_model.js`
- `test_lineage_tree_renderer.js`
- `test_context_exploration.js`
- `test_v0_3_0_golden_path.js`

## UX原則

- 問いを正解や処方として表示しない
- 自然言語の`body.text`を主役にする
- 文脈差を消去せず比較可能にする
- 類似と同一性を混同しない
- provenanceと人間確認を利用者から追跡可能にする
- transport固有表現をUIへ過剰に露出しない
- keyboard操作、HTML escaping、欠損データへの耐性を維持する

## 非対象・将来構想

v0.3.0では次を完成済みとは扱いません。

- production-readyなSPA／モバイルアプリ
- canvasベースの大規模グラフUI、ピンチズーム、ミニマップ
- relation typeの自由編集UI
- 複数人同時編集
- embeddings必須の意味検索
- graph inference
- 本格的なoffline synchronization
- production authentication / authorization
- AIによる無人公開

これらは設計上の将来候補であり、v0.3.0 release blockerではありません。

## 関連文書

- [v0.3.0 User Journey](./V0.3.0_USER_JOURNEY.md)
- [Standard API](../api/README.md)
- [v0.3.0 Release Plan](../../docs/roadmap/V0.3.0_RELEASE_PLAN.md)
- [v0.3.0 Release Runbook](../../docs/roadmap/V0.3.0_RELEASE_RUNBOOK.md)
- [Inquiry Draft Contract](../../docs/protocols/INQUIRY_DRAFT.md)
