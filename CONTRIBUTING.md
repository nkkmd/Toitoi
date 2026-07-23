# Contributing to Toitoi

**Language status:** English and Japanese sections are maintained as equivalent.  
**Last synchronized:** 2026-07-23

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
**最終同期日:** 2026-07-23

Toitoiに関心を持っていただき、ありがとうございます。Toitoiは、protocol-independentなCanonical Eventと、問いを中心とした知識交換を基盤とするオープンソースのデジタル・アグロエコロジー・コモンズです。

開発者、農家、研究者、designer、operator、翻訳者、地域知識communityに関わる方からの貢献を歓迎します。

## 貢献前に確認する文書

次を確認してください。

- `README.md`
- `docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`
- `docs/reference/V1_CONTRACT_INDEX.md`
- `LICENSE_POLICY.md`
- `SECURITY.md`

Issue、Pull Request、fixture、log、screenshotには、credential、非公開の圃場座標、参加者を特定できる情報、その他の不要な機微情報を含めないでください。

## 貢献方法

- **バグ報告・機能提案:** 再現手順と期待する動作を添えてGitHub Issueを作成します。
- **protocol・schema・Vocabulary提案:** observable contract、互換性、lineage vocabulary、governanceへ影響する可能性がある場合は、実装前にIssueで議論します。
- **文書:** 文書言語ポリシーに従います。Class Aの変更では、同じPull Request内で英語版と日本語版を更新します。
- **コード:** scopeを限定し、決定的なtestを追加・更新し、authority、identity、provenance、replay、recoveryの境界を保持します。
- **運用改善:** durable stateへの影響、migration要否、rollback動作、secret handlingの前提を文書化します。

## Pull Requestの手順

1. Forkまたは作業branchを作成します。
2. 内容が分かるbranch名を使用します。
3. 変更範囲を限定します。
4. testと文書を追加・更新します。
5. 次を実行します。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
```

6. 明確なmessageでcommitします。
7. branchをpushし、Pull Requestを作成します。
8. scope、validation、互換性への影響、既知の制約、migrationまたは運用上の影響を説明します。

実施していないvalidationを実施済みと表現してはいけません。決定的fixtureは、live transport availability、live model reproducibility、hosted deployment synchronization、実参加者の知見を証明しません。

## Contract・互換性変更

次に影響する変更は、明示的なreviewが必要です。

- Canonical Eventのrequired fieldまたはwire identifier
- Standard APIのobservable behavior
- Canonical identityまたはprovenance rule
- lineageまたはsemantic relation vocabulary
- authentication、review、publication、moderation、operator authority
- storage、replay、backup、restore、migration
- transport adapter semantics
- Conformance Suite behavior

schemaの暗黙的な付け替え、strict v1 validationの弱体化、similarityによるidentity統合、人間review境界の迂回を行ってはいけません。

## 文書言語

規範ポリシーは次です。

`docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`

公開上の入口、主要概念、最小運用文書は英日併記とします。詳細な技術文書と実装文書は英語とします。歴史文書は、現在の技術的・運用上の誤解を生まない限り、既存言語のまま保存します。

## ライセンスへの同意

Pull Requestを提出した場合、`LICENSE_POLICY.md`で定義された条件に従い、module・artifact種別に応じてAGPLv3、MIT、またはCC BY-SA 4.0で貢献物が公開されることに同意したものとみなします。
