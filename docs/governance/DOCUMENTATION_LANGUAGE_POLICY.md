# Toitoi Documentation Language Policy

**Status: normative**  
**Applies from:** v1.0.0  
**Last updated:** 2026-07-23

## Purpose

This policy defines how English and Japanese are used across the Toitoi repository. Its goals are to keep public entry points and operational guidance accessible to both English- and Japanese-speaking users while avoiding unsustainable translation work for detailed implementation documents.

## Core rule

Public entry points, core concepts, and the minimum operational procedures required to install, operate, recover, and upgrade Toitoi are maintained in English and Japanese.

Detailed technical specifications, implementation records, internal development documents, test fixtures, and package-level engineering notes are maintained in English unless a release owner explicitly classifies them otherwise.

## Document classes

Every maintained documentation file belongs to one of the following classes.

### Class A — bilingual, English followed by Japanese

Use this class for documents that users, operators, contributors, or evaluators are expected to read before they can safely understand or operate Toitoi.

Required structure:

```text
English section

---

Japanese section containing the same meaning
```

Class A includes, at minimum:

- root `README.md`;
- project overview and core concept documents;
- high-level architecture overview;
- Canonical Event overview;
- setup and quick-start guidance;
- the minimum operations runbook;
- backup, restore, migration, upgrade, rollback, and failure-recovery procedures;
- the security and sensitive-information entry point;
- the contributor entry point;
- public release notes.

### Class B — English only

Use this class for detailed engineering and maintenance documents whose primary audience works directly with source code, schemas, fixtures, CI, or protocol internals.

Class B normally includes:

- JSON Schema and wire-format detail;
- transport-specific specifications;
- adapter, converter, normalizer, and package-internal documentation;
- API endpoint reference details;
- Conformance fixtures and test-fixture explanations;
- architecture decision records;
- implementation plans and release plans;
- CI and deployment internals;
- migration implementation details;
- pilot data collection and internal analysis templates.

### Class C — historical record

Use this class for superseded plans, release records, archived design discussions, and historical implementation notes.

Class C documents are not translated solely for consistency. Their existing language is preserved unless translation is needed to prevent a current operational or contractual misunderstanding.

## Normative authority

When multiple representations conflict, use the following order:

1. machine-verifiable schema or executable contract;
2. normative English technical text;
3. official Japanese translation;
4. examples and explanatory material.

For bilingual operations runbooks, the English and Japanese sections are maintained as operationally equivalent. A conflict must be fixed before the affected release is published.

Concept and philosophy documents may declare both language sections official. The source language should be identified where historical authorship matters.

## Bilingual document requirements

Every Class A document must:

- place the full English section before the full Japanese section;
- preserve equivalent headings and operational meaning;
- keep commands, environment variables, endpoint paths, schema versions, file paths, IDs, and error codes identical in both sections;
- include a language synchronization marker;
- be updated in both languages in the same pull request when behavior or meaning changes.

Recommended marker:

```text
Language status: English and Japanese sections are maintained as equivalent.
Last synchronized: YYYY-MM-DD
```

The Japanese section should contain the corresponding Japanese marker.

## Translation rules

- Translate meaning, not word order.
- Do not translate identifiers, API paths, environment variables, schema keys, command names, package names, or code.
- Use one stable Japanese term for each core concept and include the English term when ambiguity is possible.
- Preserve explicit distinctions such as Canonical identity versus transport identity, annotation review versus publication approval, and durable state versus derived state.
- Do not describe AI output as authoritative knowledge or publication approval.
- Do not silently strengthen or weaken requirements in one language.

## Change-control rules

A pull request that modifies a Class A document must either:

1. update both language sections; or
2. state that the change is non-semantic, such as formatting or a link correction.

A release must not be published when a Class A document contains known material divergence between its English and Japanese sections.

New documents default to Class B unless they are added to the Class A registry below.

## Class A registry

The maintained registry is intentionally small.

| Document | Purpose |
|---|---|
| `README.md` | public project entry point |
| `docs/architecture/ARCHITECTURE.md` or the designated architecture overview | high-level system model |
| `docs/protocols/CANONICAL_EVENT.md` | Canonical Event overview and contract interpretation |
| `docs/reference/V1.0.0_SETUP_AND_DEMO.md` | installation and reference workflow |
| `docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md` | minimum safe operation and recovery |
| `CONTRIBUTING.md` | contributor entry point |
| `SECURITY.md` or the designated security entry point | security and sensitive-information reporting |
| `docs/roadmap/RELEASE_NOTES.md` | public release history |

Changes to this registry require an explicit documentation-governance decision.

## Automated checks

Where practical, CI should verify:

- required English and Japanese section markers exist;
- synchronization markers exist;
- critical commands, environment variables, endpoints, versions, and paths appear in both sections;
- registered Class A files exist;
- a Class A file is not changed in only one language section without an explicit exception marker.

Automated checks cannot prove semantic equivalence. Human review remains required.

## v1.0.0 transition

The v1.0.0 documentation migration is tracked in:

`docs/roadmap/V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md`

The migration must prioritize documents required for installation, safe operation, recovery, contract interpretation, and public release. Historical and deeply internal documents do not block v1.0.0 solely because they are not translated.

---

# Toitoi 文書言語ポリシー

**状態: 規範文書**  
**適用開始:** v1.0.0  
**最終更新:** 2026-07-23

## 目的

このポリシーは、Toitoiリポジトリ内で英語と日本語をどのように使用するかを定めます。公開上の入口と運用手順を英語・日本語の利用者双方に提供しながら、詳細な実装文書まで無制限に翻訳して保守不能になることを防ぐことが目的です。

## 基本原則

公開上の入口、主要概念、およびToitoiの導入・運用・復旧・更新に必要な最小限の手順は、英語と日本語で管理します。

詳細な技術仕様、実装記録、内部開発文書、test fixture、package単位のengineering noteは、release ownerが明示的に別分類しない限り英語で管理します。

## 文書区分

保守対象となる各文書は、次のいずれかに分類します。

### Class A — 英日併記

Toitoiを安全に理解・運用するために、利用者、運用者、contributor、評価者が読むことを想定する文書です。

必須構成:

```text
英語全文

---

同じ意味を持つ日本語全文
```

最低限、次をClass Aとします。

- ルート`README.md`;
- プロジェクト概要と主要concept文書;
- 上位architecture概要;
- Canonical Event概要;
- setupおよびquick start;
- 最小運用runbook;
- backup、restore、migration、upgrade、rollback、障害復旧手順;
- securityおよび機微情報保護の入口;
- contributor向け入口;
- 公開release notes。

### Class B — 英語のみ

source code、schema、fixture、CI、protocol内部へ直接関わる技術者を主対象とする詳細文書です。

通常、次をClass Bとします。

- JSON Schemaおよびwire formatの詳細;
- transport固有仕様;
- adapter、converter、normalizer、package内部文書;
- API endpointの詳細reference;
- Conformance fixtureとtest fixtureの説明;
- architecture decision record;
- implementation planおよびrelease plan;
- CIとdeploymentの内部設計;
- migration実装詳細;
- pilotの内部記録・分析様式。

### Class C — 履歴保存

旧plan、release record、過去の設計議論、歴史的implementation noteです。

Class C文書は、言語統一だけを目的として翻訳しません。現在の運用や契約に誤解を生じさせる場合に限り、必要な修正または翻訳を行います。

## 規範性の優先順位

複数の表現が競合した場合は、次の順で確認します。

1. machine-verifiable schemaまたは実行可能contract;
2. 規範的な英語技術本文;
3. 公式日本語訳;
4. exampleおよび説明資料。

英日併記のoperations runbookでは、英語と日本語を運用上同等の内容として管理します。相違がある場合、対象releaseを公開する前に修正しなければなりません。

concept・思想文書は、英語版と日本語版の双方を公式版として宣言できます。著作上の原文言語が重要な場合は明示します。

## 英日併記文書の要件

Class A文書は、次を満たさなければなりません。

- 英語全文を先に置き、その後に日本語全文を置く;
- 見出し構造と運用上の意味を対応させる;
- command、環境変数、endpoint path、schema version、file path、ID、error codeを両言語で一致させる;
- 言語同期markerを記載する;
- behaviorまたは意味を変更する場合、同じpull request内で両言語を更新する。

推奨marker:

```text
Language status: English and Japanese sections are maintained as equivalent.
Last synchronized: YYYY-MM-DD
```

日本語側にも対応する日本語markerを記載します。

## 翻訳規則

- 語順ではなく意味を翻訳する。
- identifier、API path、環境変数、schema key、command名、package名、codeは翻訳しない。
- core conceptごとに安定した日本語訳を使用し、曖昧になり得る場合は英語を併記する。
- Canonical identityとtransport identity、annotation reviewとpublication approval、durable stateとderived stateなどの区別を保持する。
- AI outputを権威ある知識またはpublication approvalとして記述しない。
- 一方の言語だけで要件を強めたり弱めたりしない。

## 変更管理

Class A文書を変更するpull requestは、次のいずれかを満たす必要があります。

1. 両言語のsectionを更新する; または
2. formattingやlink修正など、非意味的変更であることを明記する。

英語と日本語の間に重大な不一致があることが判明しているClass A文書を残したまま、releaseを公開してはなりません。

新規文書は、Class A registryへ追加されない限りClass Bをdefaultとします。

## Class A registry

保守可能性を守るため、registryは意図的に小さく維持します。

| 文書 | 目的 |
|---|---|
| `README.md` | 公開上のプロジェクト入口 |
| `docs/architecture/ARCHITECTURE.md`または指定されたarchitecture概要 | 上位system model |
| `docs/protocols/CANONICAL_EVENT.md` | Canonical Event概要とcontract解釈 |
| `docs/reference/V1.0.0_SETUP_AND_DEMO.md` | 導入とreference workflow |
| `docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md` | 最小限の安全な運用と復旧 |
| `CONTRIBUTING.md` | contributor向け入口 |
| `SECURITY.md`または指定されたsecurity入口 | securityおよび機微情報の報告 |
| `docs/roadmap/RELEASE_NOTES.md` | 公開release履歴 |

registryの変更には、明示的なdocumentation governance判断が必要です。

## 自動検査

可能な範囲で、CIは次を検証します。

- 必須の英語・日本語section markerが存在する;
- synchronization markerが存在する;
- 重要なcommand、環境変数、endpoint、version、pathが両sectionに存在する;
- registryに記載されたClass A文書が存在する;
- 明示的な例外markerなしにClass A文書の一方の言語だけが変更されていない。

自動検査だけで意味の同等性を証明することはできません。human reviewは引き続き必要です。

## v1.0.0への移行

v1.0.0向けの文書移行は、次の文書で管理します。

`docs/roadmap/V1.0.0_DOCUMENTATION_LANGUAGE_MIGRATION.md`

導入、安全な運用、復旧、contract解釈、公開releaseに必要な文書を優先します。履歴文書や内部技術文書が翻訳されていないことだけを理由に、v1.0.0をblockしません。
