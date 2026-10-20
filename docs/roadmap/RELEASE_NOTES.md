# Toitoi Release Notes

**Status: current**
**Language policy:** New public release entries are maintained in English followed by equivalent Japanese. Historical entries retain their existing language.
**Last synchronized:** 2026-10-20

## v1.0.0 candidate

**Status: PR #39 merged into main; post-merge CI validation complete; not yet publicly released**

### Summary

Toitoi v1.0.0 connects the existing protocol, API, AI, review, offline, transport, search, replay, recovery, and governance foundations into one minimum reference implementation.

The fixed reference scenario begins with an offline observation that weed species differ on the eastern side of a field and follows it through AI inquiry candidates, human annotation review, an Inquiry Draft, independent publication approval, Canonical Event publication, transport delivery state, cross-region discovery, vocabulary mapping, human-confirmed synthesis, replay, backup, restore, and migration verification.

### Highlights

- protocol-independent Canonical Event storage remains authoritative;
- stable Canonical IDs are preserved across publication, transport projection, replay, backup, and restore;
- AI annotation review and publication approval remain separate and independently attributable;
- the mobile/offline Golden Path covers local persistence, sensitive-field acknowledgment, queueing, failed synchronization, explicit retry, and publication;
- FTS5 search, structured filters, context facets, related-inquiry candidates, and replay equivalence are connected to the reference fixture;
- Conformance Suite 1.0.0 validates native v1 input and keeps legacy v0.9 acceptance behind an explicit compatibility profile;
- backup manifest verification, corruption detection, migration plan, dry-run, apply, and derived-state rebuild are covered;
- public entry documents and minimum operational procedures follow the repository documentation language policy;
- automatic identity merge and autonomous AI publication remain prohibited.

### Stable contract notes

- repository release version: `v1.0.0`;
- Canonical Event wire identifier: `schemaVersion: "0.1.0"`;
- Canonical ID form: `tt:evt:<opaque-id>`;
- normative synthesis lineage relation: `synthesizes`;
- Canonical storage is durable and authoritative;
- search indexes, facets, metrics, and health projections are rebuildable derived state.

### Known limitations before publication

- the reference authentication provider is header-based and is not OAuth/OIDC certification;
- the durable queue is a single-node JSONL reference implementation;
- live local-model reproducibility is not established by deterministic fixtures alone;
- the real-participant pilot is recorded as `not yet conducted`;
- hosted environment synchronization and external transport availability require separate verification;
- FTS5 is a lexical and structured baseline, not production vector search or RAG;
- generated, derived, related, or mapped inquiries are not guaranteed to be agriculturally correct.

Implementation merge and post-merge validation are complete. Publication still requires human review of the final candidate, hosted-environment verification, release-owner disposition of the pilot limitation, an annotated `v1.0.0` tag, and GitHub Release publication.

Related documents:

- [`V1.0.0_RELEASE_PLAN.md`](./V1.0.0_RELEASE_PLAN.md)
- [`V1.0.0_RELEASE_RUNBOOK.md`](./V1.0.0_RELEASE_RUNBOOK.md)
- [`V1.0.0_GITHUB_RELEASE.md`](./V1.0.0_GITHUB_RELEASE.md)
- [`V1.0.0_RELEASE_RECORD.md`](./V1.0.0_RELEASE_RECORD.md)
- [`V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md`](./V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md)

---

## v1.0.0候補

**状態: PR #39をmainへ統合し、統合後のCI検証も完了。正式公開前です。**

### 概要

Toitoi v1.0.0は、プロトコル、API、AI、人間による確認、オフライン操作、配信、検索、保存データの再処理、復旧、運営ルールの基盤を、一つの最小参照実装につなぎます。

参照シナリオは、「畑の東側だけ雑草の種類が違う」というオフラインでの観察記録から始まります。AIによる問いの候補生成、人間によるAI注釈の確認、Inquiry Draft（公開前の問いの下書き）、独立した公開承認、Canonical Eventの公開、配信状態の記録、別地域の問いの発見、語彙の対応付け、人間が確定した問いの統合、保存データの再処理、バックアップ・復元・移行の検証までを、一連の流れとして扱います。

### 主な内容

- 通信プロトコルに依存しないCanonical Eventの保存領域を、正本として維持します。
- 公開、配信方式ごとの変換、再処理、バックアップ、復元を経ても、安定したCanonical IDを保持します。
- AI注釈の確認と公開承認を分け、誰が判断したかをそれぞれ記録できるようにします。
- スマートフォン・オフライン向けの一連の検証では、端末内保存、機微情報の確認、キューへの登録、同期失敗、利用者の操作による再試行、公開を確認します。
- FTS5検索、条件による絞り込み、文脈による絞り込み項目、関連する問いの候補、再処理前後の結果の同等性を、参照用の固定テストデータで検証します。
- Conformance Suite 1.0.0では、v1本来の形式の入力を検証します。旧v0.9形式の受理は、明示的な互換プロファイルに限定します。
- バックアップ一覧の検証、破損検知、移行計画、試行実行（dry-run）、適用、派生状態の再構築を検証します。
- 公開上の入口となる文書と最小限の運用手順は、リポジトリの文書言語ポリシーに従って管理します。
- 同一性の自動統合とAIによる自律的な公開は、引き続き禁止します。

### 安定した仕様に関する注意

- リポジトリのリリース版: `v1.0.0`
- Canonical Eventの通信形式上のバージョン識別子: `schemaVersion: "0.1.0"`
- Canonical IDの形式: `tt:evt:<opaque-id>`
- 問いの統合を表す正式な派生関係: `synthesizes`
- Canonical storageは、永続保存する正本です。
- 検索索引、絞り込み項目、運用指標、稼働状態の派生データは、再構築可能です。

### 公開前に残る既知の制約

- 参照実装の認証方式はヘッダーを使います。OAuth/OIDC認定ではありません。
- 永続キューは、単一ノード上のJSONL形式を使う参照実装です。
- 固定テストデータだけでは、実際のローカルモデルによる再現性を証明できません。
- 実参加者による試行は、`not yet conducted`（未実施）として記録されています。
- ホスト環境への同期と、外部配信先の可用性は、別途検証が必要です。
- FTS5は語句検索と条件検索の基本実装です。本番向けのベクトル検索やRAGではありません。
- 生成・派生・関連付け・対応付けされた問いの、農業上の正しさは保証されません。

実装の統合と統合後の検証は完了しています。公開には、最終候補の人間によるレビュー、ホスト環境の確認、参加者による試行が未実施である制約についてのリリース責任者の判断、注釈付き`v1.0.0`タグの作成、GitHub Release公開が必要です。

関連文書:

- [`V1.0.0_RELEASE_PLAN.md`](./V1.0.0_RELEASE_PLAN.md)
- [`V1.0.0_RELEASE_RUNBOOK.md`](./V1.0.0_RELEASE_RUNBOOK.md)
- [`V1.0.0_GITHUB_RELEASE.md`](./V1.0.0_GITHUB_RELEASE.md)
- [`V1.0.0_RELEASE_RECORD.md`](./V1.0.0_RELEASE_RECORD.md)
- [`V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md`](./V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md)

---

## Historical release entries

Historical entries retain their existing language and are not rewritten solely for language normalization.

## v0.9.0

**Status: released**

v0.9.0は、Toitoiを単独開発向けreference environmentから、小規模な共同利用、障害復旧、外部互換性検証、共同運営手続きへ拡張するreleaseです。

### Implementation record

- implementation PR: [#37](https://github.com/nkkmd/Toitoi/pull/37)
- implementation head: `c064f8966bb96e8904798d670b6ec0e0dc662f31`
- final pre-merge CI: run #719 succeeded
- squash merge commit: `6a8db9022fd1db34bc81b3946c72ae714f4454ae`
- release-record PR: [#38](https://github.com/nkkmd/Toitoi/pull/38)

### Highlights

- role／capability model and separated authority boundaries
- authenticated server mode, stable errors, request IDs, rate limiting, idempotency, and audit records
- durable JSONL queue, restart recovery, dead-letter handling, backup, restore, and migration tooling
- externally runnable `toitoi-conformance` CLI and three-transport semantic fixtures
- governance, compatibility, Vocabulary, moderation, correction, withdrawal, deletion-request, and sensitive-information policies

詳細は[`V0.9.0_RELEASE_PLAN.md`](./V0.9.0_RELEASE_PLAN.md)、[`V0.9.0_RELEASE_RUNBOOK.md`](./V0.9.0_RELEASE_RUNBOOK.md)、[`V0.9.0_GITHUB_RELEASE.md`](./V0.9.0_GITHUB_RELEASE.md)、[`V0.9.0_RELEASE_RECORD.md`](./V0.9.0_RELEASE_RECORD.md)を参照してください。

## v0.8.0

**Status: released**

- released: 2026-07-22
- tag: `v0.8.0`
- tag target: `d04e4354325ebd68f270f844cd7130a47ae4e660`
- implementation PR: [#36](https://github.com/nkkmd/Toitoi/pull/36)
- rebuildable SQLite FTS5 projection, lexical search, structured filters, facets, related inquiry API, Vocabulary contracts, explicit mapping claims, and replay equivalence

詳細は[`V0.8.0_RELEASE_PLAN.md`](./V0.8.0_RELEASE_PLAN.md)、[`V0.8.0_RELEASE_RUNBOOK.md`](./V0.8.0_RELEASE_RUNBOOK.md)、[`V0.8.0_GITHUB_RELEASE.md`](./V0.8.0_GITHUB_RELEASE.md)を参照してください。

## v0.7.0

**Status: released**

- released: 2026-07-21
- tag: `v0.7.0`
- tag target: `79013aad304c0778f49dab67678cbf0ef6ee9fd0`
- implementation merged to `main` as `b1ba070c1bf9cfc4c21be74a4cd9d4e479640959`
- semantic relationを明示して問いを育てるfirst-class authoring workflowを追加

詳細は[`V0.7.0_RELEASE_PLAN.md`](./V0.7.0_RELEASE_PLAN.md)、[`V0.7.0_RELEASE_RUNBOOK.md`](./V0.7.0_RELEASE_RUNBOOK.md)、[`V0.7.0_GITHUB_RELEASE.md`](./V0.7.0_GITHUB_RELEASE.md)を参照してください。
