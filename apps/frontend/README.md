# Toitoiのフロントエンド

**状態: v1.0.0参照実装をmainへ統合済み・正式公開前** | **最新公開版: v0.9.0** | **最終更新: 2026-10-20**

`apps/frontend/`は、ToitoiのStandard APIを利用する、スマートフォン向けSPA／PWAの参照実装です。観察の端末内保存から、AIによる問いの候補の確認、Inquiry Draftの作成、公開承認、Canonical Eventの公開、問いの派生、検索・文脈の探索までをつなぎます。各配信方式の固有イベントを直接扱う構成にはしません。

## 利用の流れ

1. 現場で観察を記録し、IndexedDBで端末内に保存する。
2. 利用者の操作で同期する。
3. AIが作った問いの候補を確認する。
4. Inquiry Draft（公開前の下書き）を作り、公開前の確認・承認を行う。
5. 承認済みの問いをCanonical Eventとして公開する。
6. 語句や条件で検索し、文脈や関連する問いを探す。
7. 問いの詳細、派生関係、来歴を確認し、必要に応じて新しい問いを派生させる。

端末内への保存、同期、公開承認、公開、各配信先への配送は、別々の段階です。

## SPA／PWAの基本構成

- `index.html`: スマートフォン向けの起動画面
- `styles.css`: 画面幅に応じた表示
- `manifest.webmanifest`: PWAのインストール情報
- `service-worker.js`: アプリケーションの基本画面のキャッシュ
- `icon.svg`: PWAのアイコン

Service Workerは、GETで取得する基本画面のファイルをキャッシュします。公開などの変更操作を、バックグラウンドで自動実行しません。

## 検索と文脈の探索

`search_exploration_view_model.js`は、画面の状態を、配信方式に依存しないAPIリクエストへ変換します。

検索に使える条件:

- 検索語句
- 地域
- 気候帯
- 土壌の種類
- 作物の科
- 季節
- 配信経路
- 確認状態

利用するAPI:

- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- `GET /api/v1/vocabulary/terms`
- `GET /api/v1/vocabulary/mappings`

`search_exploration_renderer.js`は、読み込み中、結果なし、エラー、表示準備完了の状態をHTMLに描画します。結果の分類、文脈の値、配信経路、確認状態、来歴、詳細画面へのリンクを表示し、関連候補を同一の問いへ自動統合しないことを示します。

| 分類 | 意味 |
|---|---|
| `exact_identity` | Canonical IDによる直接一致 |
| `explicit_relation` | 保存済みの意味上の関係 |
| `related_candidate` | 語句や文脈の条件から得られる関連候補 |

明示的な関係を持つ結果は、関連候補より先に表示します。いずれの分類も、自動的な同一性の統合を意味しません。

## オフラインでの観察記録と同期

`offline_store.js`は、観察記録、同期キュー、再試行回数、最後のエラー、同期先のCanonical Event IDをIndexedDBに保持します。

位置情報、人物名、連絡先、非公開の文脈が含まれる場合は、キューへの追加前に個別の確認を求めます。端末内の元の観察記録と、外部に公開するCanonical Eventは別の記録です。

## AI注釈の確認と公開

`workflow_ui.js`は、AI注釈の採用・編集・却下と、確認済み候補からのInquiry Draft作成を提供します。AI注釈の採用は、公開承認ではありません。

下書きは`draft`から`in_review`へ進み、人間の判断で`approved`または`rejected`になります。`approved`以外の下書きからの公開は拒否されます。

## 問いの派生と系譜

`derivation_form_model.js`と`derivation_ui.js`は、既存の問いから派生するInquiry Draftを作成します。AIによる関係の提案は参考情報です。利用者が関係を明示的に確定しなければ、下書きを作成できません。

`genealogy_view_model.js`と`genealogy_view_renderer.js`は、記録の同一性、意味上の関係、文脈の類似性を別々の概念として表示します。文脈の類似性、意味上の関係、語彙の対応付けを、同一性の根拠として自動採用しません。

## ローカルでの起動

```bash
TOITOI_STORAGE_DIR=/path/to/storage \
TOITOI_AI_STORAGE_DIR=/path/to/ai-storage \
TOITOI_SEARCH_INDEX_FILE=/path/to/search.sqlite \
TOITOI_PROTOCOL=nostr \
corepack pnpm --filter @toitoi/api start
```

`apps/frontend/`を静的HTTPサーバーで配信し、`/api/v1/*`のリクエストが同一オリジンのAPIへ届くようにします。`file://`で直接開く方法は、Service Workerや同一オリジンAPIの検証には適していません。

## テスト

```bash
corepack pnpm --filter @toitoi/frontend test
corepack pnpm test
```

主なフロントエンドテスト:

- `test_inquiry_view_model.js`
- `test_lineage_tree_renderer.js`
- `test_context_exploration.js`
- `test_ai_review.js`
- `test_search_exploration_view_model.js`
- `test_search_exploration_renderer.js`
- `test_v0_3_0_golden_path.js`
- `test_v0_4_0_golden_path.js`
- `test_v0_5_0_golden_path.js`
- `test_v0_6_0_offline_golden_path.js`
- `test_v0_7_0_transport_replay.js`
- `test_v1_reference_golden_path.js`

## 画面設計の原則

- 問いを、確定した正解や処方として表示しない。
- AI出力と公開済みの問いを混同しない。
- 同一の記録、明示的な関係、関連候補を区別する。
- 地域固有の語彙を、共通語彙へ暗黙に置き換えない。
- AI注釈の確認、関係の確定、語彙の対応付けの確認、公開前の確認を分ける。
- 端末内の元の観察記録と公開Canonical Eventを分ける。
- 同期失敗や再試行の状態を隠さない。
- 配信方式固有の表現を主要画面へ露出させない。
- 来歴、派生関係、AIの関与、人間による確認状態を追跡できるようにする。
- キーボード操作、HTMLエスケープ、データ欠損への耐性を維持する。

## 制約

- API側には参照実装の認証・権限制御・リクエスト頻度制限がありますが、本番向けOAuth/OIDC認証を備えた完成品ではありません。詳細は[APIの説明](../api/README.md)を参照してください。
- 複数人での共同編集やリアルタイム編集は未実装です。
- Service Workerによる無人のバックグラウンド公開は行いません。
- ブラウザー上での全操作の網羅的な検証と、参照シナリオに沿った一連のテストは区別します。
- FTS5による語句検索・条件検索は実装済みです。埋め込み、ベクトル検索、本番向けRAG、グラフ推論は対象外です。
- 大規模な系譜グラフの可視化は対象外です。
- 同一性を自動統合しません。
- AI生成・派生・関連候補の農業上の妥当性は保証しません。

## 関連文書

- [Standard API](../api/README.md)
- [v1.0.0のセットアップとデモ](../../docs/reference/V1.0.0_SETUP_AND_DEMO.md)
- [v1.0.0のリリース記録](../../docs/roadmap/V1.0.0_RELEASE_RECORD.md)
- [v1.0.0までのロードマップ](../../docs/roadmap/V1.0.0_ROADMAP.md)
- [Inquiry Draftの仕様](../../docs/protocols/INQUIRY_DRAFT.md)
- [v0.8.0のリリース計画（履歴）](../../docs/roadmap/V0.8.0_RELEASE_PLAN.md)
- [v0.8.0のリリース手順（履歴）](../../docs/roadmap/V0.8.0_RELEASE_RUNBOOK.md)
- [v0.8.0の公開文（履歴）](../../docs/roadmap/V0.8.0_GITHUB_RELEASE.md)
