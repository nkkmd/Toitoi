# Toitoi 基盤実装の状況

**状態: 現在地の案内と基盤実装の記録** | **最新公開版: v0.9.0** | **v1.0.0実装: mainへ統合済み・正式公開前** | **最終更新: 2026-10-20**

## 目的

この文書は、基盤実装の履歴、公開済みv0.9.0の到達点、mainに統合済みのv1.0.0実装、正式公開までの残作業を案内します。

[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)は、Phase 1〜18の基盤実装履歴です。v0.2.0以降の完成条件と実作業は、[`V1.0.0_ROADMAP.md`](./V1.0.0_ROADMAP.md)、各リリース計画、[`RELEASE_NOTES.md`](./RELEASE_NOTES.md)、GitHubのIssue・PRで管理します。v1.0.0の完了証拠と残る公開条件は、[`V1.0.0_RELEASE_RECORD.md`](./V1.0.0_RELEASE_RECORD.md)を参照してください。

## 文書の役割分担

| 文書 | 役割 | 更新方針 |
|---|---|---|
| `IMPLEMENTATION_PLAN.md` | Phase 1〜18の基盤実装履歴と設計判断 | 原則として履歴を保存 |
| `FOUNDATION_IMPLEMENTATION_STATUS.md` | 公開版・統合済み実装の現在地と関連文書への入口 | 各リリースで更新 |
| `V1.0.0_ROADMAP.md` | v1.0.0までのリリース順序と完成条件 | リリースごとに更新 |
| `Vx.y.z_RELEASE_PLAN.md` | 各リリースの対象範囲と完了条件 | 対象リリースの作業中に更新 |
| `Vx.y.z_RELEASE_RECORD.md` | 実装の証拠と公開手続きの状況 | 条件の達成・変更時に更新 |
| `RELEASE_NOTES.md` | 公開済み版とリリース候補の記録 | 公開条件の変更時に更新 |
| GitHubのIssue・PR | 個々の作業と完了条件 | 実作業に合わせて更新 |

## 完了済み基盤の要約

### 意味を表す記録と通信方式の分離

- Canonical Eventを、通信プロトコルに依存せず意味を表す記録として定義
- 元データ、正規化済みデータ、Canonical Eventの責務を分離
- アダプター、正規化器、変換器、索引作成、Standard APIの境界を整理
- Nostr、Lingonberry、ATProtoごとの実行環境と保存機能
- 複数経路への配信と取り込み、プロトコル登録簿、保存処理の選択

### 取り込み・保存・再処理・検索

- 入力検査、真正性の検証、重複排除、Canonical Eventへの変換
- 元データとCanonical Eventの追記型保存
- 同じ入力から同じ結果を得られる再処理と派生索引の再構築
- Canonical Eventから再構築できるSQLite FTS5検索索引
- 問い、観察、要約、タグ、ラベル、文脈、関係、来歴、確認状態、配信メタデータの検索
- 条件による絞り込み、絞り込み項目、関連する問いのAPI
- 語句の類似性、関係、語彙の対応付けだけでは、記録の同一性を自動統合しない仕組み

### 識別情報・来歴・派生関係・ワークフロー

- 内部構造に依存しないCanonical ID、同一性キー、同一性に関する申告
- 来歴情報と`rawRef`の責務分離
- 明示的な同一性の対応付けによる、異なる配信方式からの記録の統合
- 意味上の関係と派生関係の記録
- Inquiry Draft、人間による確認、未承認の公開を防ぐ仕組み
- AI注釈の確認、関係の確定、公開承認の分離
- スマートフォン向けSPA／PWA、IndexedDBによる端末内保存、利用者が操作する同期キュー

### 非同期AI支援

- 取り込み処理から分離し、重複を考慮するAIジョブキュー
- 要約、タグ付け、`generate_inquiries`（問いの候補生成）の注釈仕様
- モデル、プロンプト、未加工の出力、確認状態を含む来歴
- 固定入力で再現可能な検証用プロバイダーと、llama.cpp互換プロバイダー
- 採用・編集・却下の確認機能
- 確認済み候補からInquiry Draftへの移行
- AIによる無人公開を防ぐ仕組み

### v0.7.0: 問いの派生と系譜

- 8種類の意味上の関係と、関係種別ごとの検証
- `POST /api/v1/inquiries/:id/derive`
- スマートフォン向けの問いの派生フォーム
- AIによる提案と人間による確定の分離
- 再処理後の派生関係の復元を検証する固定テストデータ

### v0.8.0: 検索・語彙・再利用

- SQLite FTS5検索索引
- `GET /api/v1/search`
- `GET /api/v1/search/contexts`
- `GET /api/v1/inquiries/:id/related`
- `exact_identity`、`explicit_relation`、`related_candidate`の分離
- Core／Domain／Local Vocabularyの仕様
- 来歴、確認状態、地域性、人間による確認の区別を保つ語彙の対応付け申告
- 順位付け・絞り込み用の固定データと、再処理前後の結果の同等性検証

### v0.9.0: 共同運用・永続性・適合性

- 操作主体の役割: `reader`、`contributor`、`reviewer`、`publisher`、`moderator`、`operator`
- 認証時、操作主体、配信先、Canonical Eventの識別情報の分離
- `TOITOI_AUTH_REQUIRED=true`による認証必須モード
- 安定したJSONエラー、リクエストID、リクエスト頻度制限、変更操作の冪等性
- ハッシュで連結した追記型の監査記録
- `GET /health/live`、`GET /health/ready`、運用者に限定した監査記録の確認
- JSONL形式の永続キュー、再起動後の復旧、回数を制限した再試行、処理不能ジョブの隔離、安全な終了
- バックアップ一覧、SHA-256検証、復元時の破損検知
- 移行計画、試行実行（dry-run）、対象バージョン、適用
- 外部から実行できる`toitoi-conformance` CLI
- Canonical Eventの検証、ID保持、来歴情報とrawRefの責務分離
- Nostr／Lingonberry／ATProtoとの往復変換を検証する固定テストデータ
- 実際の取り込み処理と再処理の結果の同等性
- TIP、スキーマ互換性、廃止予告、語彙変更、モデレーション、情報保護、訂正・撤回・削除依頼の手続き

## v1.0.0としてmainに統合済みの内容

PR #39は、2026年7月27日に`8735b2edce7561006d135644fef754629fc9ffcc`としてmainへ統合されました。統合後のCI検証も完了しています。

- 「畑の東側だけ雑草の種類が違う」という観察から始まる、一連の処理を結ぶ固定テストデータ
- 観察、AI候補、AI注釈の確認、Inquiry Draft、独立した公開承認、Canonical Event公開を結ぶ安定したID
- 別地域の問いの検索、明示的な語彙の対応付け、地域をまたぐ問いの統合、派生関係と来歴の追跡
- FTS5検索、文脈による絞り込み、逆順に再処理した後の検索結果の同等性
- オフライン保存、機微情報の確認、キューの保持、同期失敗、利用者の操作による再試行、公開までのフロントエンド検証
- Canonical Event v1形式に対応するConformance Suite 1.0.0
- `body`、`schemaVersion`、`tt:evt:` ID、`provenance.sources`、最上位の`rawRef`、派生関係の検証
- v1の厳密な検証と、明示的なv0.9.0互換プロファイルの分離
- 外部CLI向けの固定JSON入力と、機械処理可能な報告書
- バックアップ一覧、復元、破損検知、移行計画・試行実行・適用、派生状態の再構築
- v1の仕様一覧、参照シナリオの解説、セットアップ・デモ、参加者による試行の計画、リリース手順・公開文案・記録

## 維持すべき設計原則

- Canonical Eventの保存領域を正本とする。
- 未公開の観察記録と公開Canonical Eventの保存・公開範囲を分ける。
- FTS5、キューの索引、運用指標、稼働状態の表示は再構築可能な派生状態とする。
- 操作主体、配信先、Canonical Eventの識別情報を混同しない。
- AI注釈の採用、関係の確定、公開承認、モデレーション、運用者の権限行使を別々の判断として扱う。
- 配信失敗でCanonical Eventの永続保存を無効にしない。
- 意味上の関係、類似性、語彙の対応付けだけで同一性を自動統合しない。
- 地域固有の語彙を保持し、共通概念への対応付けは明示的な申告として記録する。
- AI出力は候補として扱い、人間による確認と公開承認を経ずに公開しない。
- Conformance Suiteは内部実装ではなく、外部から確認できる仕様を検証する。
- 旧形式は明示的な互換プロファイルでのみ受理し、v1本来の形式への適合と混同しない。

## 公開済み実装基準点

最新公開版: v0.9.0

- [`V0.9.0_RELEASE_PLAN.md`](./V0.9.0_RELEASE_PLAN.md)
- [`V0.9.0_RELEASE_RUNBOOK.md`](./V0.9.0_RELEASE_RUNBOOK.md)
- [`V0.9.0_GITHUB_RELEASE.md`](./V0.9.0_GITHUB_RELEASE.md)
- [`V0.9.0_RELEASE_RECORD.md`](./V0.9.0_RELEASE_RECORD.md)
- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)
- [実装PR #37](https://github.com/nkkmd/Toitoi/pull/37)
- スカッシュ統合コミット: `6a8db9022fd1db34bc81b3946c72ae714f4454ae`

## v1.0.0統合済み実装の関連文書

- [`V1.0.0_RELEASE_PLAN.md`](./V1.0.0_RELEASE_PLAN.md)
- [`V1.0.0_RELEASE_RUNBOOK.md`](./V1.0.0_RELEASE_RUNBOOK.md)
- [`V1.0.0_GITHUB_RELEASE.md`](./V1.0.0_GITHUB_RELEASE.md)
- [`V1.0.0_RELEASE_RECORD.md`](./V1.0.0_RELEASE_RECORD.md)
- [`../reference/V1_CONTRACT_INDEX.md`](../reference/V1_CONTRACT_INDEX.md)
- [`../reference/V1.0.0_REFERENCE_SCENARIO.md`](../reference/V1.0.0_REFERENCE_SCENARIO.md)
- [`../reference/V1.0.0_SETUP_AND_DEMO.md`](../reference/V1.0.0_SETUP_AND_DEMO.md)
- [`../pilot/V1.0.0_PILOT_PROTOCOL.md`](../pilot/V1.0.0_PILOT_PROTOCOL.md)
- [`../pilot/V1.0.0_PILOT_FINDINGS.md`](../pilot/V1.0.0_PILOT_FINDINGS.md)
- [実装PR #39](https://github.com/nkkmd/Toitoi/pull/39)

## v1.0.0の公開条件の現在地

### リポジトリ内で完了した検証・手続き

- 一連の処理を結ぶ固定参照シナリオ
- プロトコル、API検索・再処理、オフライン操作、Conformance CLI、復旧・移行のテスト
- 外部から確認できるv1の仕様一覧と、明示的なv0.9.0互換プロファイル
- セットアップ・デモ文書、リリース手順書、検証記録
- 最終仕様レビュー、英日文書の人間による意味の同等性レビュー
- PR #39のレビューとmainへの統合
- 統合後のmainのCI検証

7月27日の人間による文書レビューは、当時の対象コミットに対する記録です。今回の文章修正を含む正式公開候補については、公開前に文書言語ポリシーに従って確認します。

### 証拠の追加・判断・手続きが必要な項目

- ホスト環境を公開対象コミットへ同期し、動作を確認した証拠
- 可能な範囲での、GitHub Actions以外のクリーンな外部環境によるセットアップ検証
- 実際のローカルモデル構成での再現性の証拠、または制約として明示することの承認
- 実参加者による試行の結果、または未実施を既知の制約として公開するリリース責任者の判断
- 注釈付き`v1.0.0`タグの作成とGitHub Release公開

実参加者による試行、タグ作成、GitHub Release公開は、自動テストで代替しません。

埋め込み、ベクトルデータベース、本番向けRAG、大規模な分散キュー、新しい配信方式は、v1.0.0の一連の処理と実地利用が安定した後に再評価します。
