# Contributing to Toitoi

**Language status:** English and Japanese sections are maintained as equivalent.
**Last synchronized:** 2026-10-20

Thank you for your interest in Toitoi. Toitoi is an open-source digital agroecology commons built around protocol-independent Canonical Events and inquiry-centered knowledge exchange.

Contributions are welcome from developers, farmers, researchers, designers, operators, translators, and people working with local knowledge communities.

## Before contributing

Please review:

- `README.md`
- `docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`
- `docs/reference/V1_CONTRACT_INDEX.md`
- `LICENSE_POLICY.md`
- `SECURITY.md`

Do not include credentials, private field coordinates, participant-identifying information, or other unnecessary sensitive data in issues, pull requests, fixtures, logs, or screenshots.

## Ways to contribute

- **Bug reports and feature requests:** open a GitHub Issue with reproducible details and expected behavior.
- **Protocol, schema, or vocabulary proposals:** open an Issue before implementation when the change may affect observable contracts, compatibility, lineage vocabulary, or governance.
- **Documentation:** follow the documentation language policy. Class A changes must update English and Japanese sections in the same pull request.
- **Code contributions:** keep changes scoped, add or update deterministic tests, and preserve authority, identity, provenance, replay, and recovery boundaries.
- **Operational improvements:** document durable-state impact, migration requirements, rollback behavior, and secret-handling assumptions.

## Pull request workflow

1. Fork or create a working branch.
2. Use a descriptive branch name.
3. Make a focused change.
4. Add or update tests and documentation.
5. Run:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
```

6. Commit with a clear message.
7. Push the branch and open a Pull Request.
8. Explain scope, validation, compatibility impact, known limitations, and any migration or operational implications.

A pull request must not claim validation that was not performed. Deterministic fixtures are not evidence of live transport availability, live-model reproducibility, hosted deployment synchronization, or real participant findings.

## Contract and compatibility changes

Changes affecting the following require explicit review:

- Canonical Event required fields or wire identifiers;
- Standard API observable behavior;
- Canonical identity or provenance rules;
- lineage or semantic relation vocabulary;
- authentication, review, publication, moderation, or operator authority;
- storage, replay, backup, restore, or migration behavior;
- transport adapter semantics;
- Conformance Suite behavior.

Do not silently relabel schemas, weaken strict v1 validation, merge identity from similarity, or bypass human review boundaries.

## Documentation language

The normative policy is:

`docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`

Public entry points, core concepts, and minimum operations are bilingual. Detailed technical and implementation documents are English. Historical documents remain in their existing language unless they create a current technical or operational misunderstanding.

## License agreement

By submitting a Pull Request, you agree that your contribution will be licensed under the terms defined in `LICENSE_POLICY.md`: AGPLv3, MIT, or CC BY-SA 4.0 depending on the module and artifact type.

---

# Toitoiへの貢献

**言語状態:** 英語版と日本語版は同等の内容として管理します。
**最終同期日:** 2026-10-20

Toitoiは、通信プロトコルに依存しないCanonical Eventと、問いを中心とした知識交換を基盤とする、オープンソースのデジタル・アグロエコロジー・コモンズです。

開発者、農家、研究者、デザイナー、運用者、翻訳者、地域の知識を共有するコミュニティに関わる方からの貢献を歓迎します。

## 貢献前に確認する文書

次の文書を確認してください。

- `README.md`
- `docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`
- `docs/reference/V1_CONTRACT_INDEX.md`
- `LICENSE_POLICY.md`
- `SECURITY.md`

Issue、Pull Request、固定テストデータ、ログ、スクリーンショットには、認証情報、非公開の圃場座標、参加者を特定できる情報、その他の不要な機微情報を含めないでください。

## 貢献方法

- **バグ報告・機能提案:** 再現手順と期待する動作を添えて、GitHub Issueを作成します。
- **プロトコル・スキーマ・語彙の提案:** 外部から確認できる仕様、互換性、派生関係を表す語彙、運営ルールに影響する可能性がある場合は、実装前にIssueで議論します。
- **文書:** 文書言語ポリシーに従います。Class Aの変更では、同じPull Request内で英語版と日本語版を更新します。
- **コード:** 変更範囲を絞り、再現可能なテストを追加・更新します。権限、同一性、来歴、保存データの再処理、復旧の責務を維持します。
- **運用改善:** 永続保存する状態への影響、移行の要否、以前の状態へ戻す際の動作、機密情報の取り扱いの前提を文書化します。

## Pull Requestの手順

1. フォークまたは作業ブランチを作成します。
2. 作業内容が分かるブランチ名を付けます。
3. 変更範囲を限定します。
4. テストと文書を追加・更新します。
5. 次を実行します。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
```

6. 内容が分かるメッセージでコミットします。
7. ブランチをプッシュし、Pull Requestを作成します。
8. 変更範囲、検証結果、互換性への影響、既知の制約、移行や運用への影響を説明します。

実施していない検証を、実施済みと記載してはいけません。固定テストデータによる検証は、実際の配信先の可用性、AIモデルの再現性、ホスト環境への反映、実参加者から得た知見の証拠にはなりません。

## 仕様・互換性の変更

次に影響する変更には、明示的なレビューが必要です。

- Canonical Eventの必須項目や通信形式上のバージョン識別子
- Standard APIの外部から確認できる動作
- Canonical Eventの同一性や来歴情報の規則
- 派生関係や意味上の関係を表す語彙
- 認証、確認、公開、モデレーション、運用者の権限
- 保存、再処理、バックアップ、復元、移行
- 配信アダプターが扱う意味
- Conformance Suiteの動作

スキーマの暗黙的な付け替え、v1の厳密な検証の弱体化、類似性による同一性の統合、人間による確認の迂回を行ってはいけません。

## 文書言語

規範となるポリシーは、次の文書です。

`docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`

公開上の入口、主要概念、最小限の運用文書は英日併記とします。詳細な技術文書と実装文書は英語で管理します。過去の記録は、現在の技術や運用について誤解を生まない限り、既存の言語のまま保存します。

## ライセンスへの同意

Pull Requestの提出により、`LICENSE_POLICY.md`の条件に従い、モジュールや成果物の種類に応じて、貢献物をAGPLv3、MIT、またはCC BY-SA 4.0で公開することに同意したものとみなします。
