# Security and Sensitive Information

**Language status:** English and Japanese sections are maintained as equivalent.
**Last synchronized:** 2026-10-20

## Purpose

This document is the public security and sensitive-information entry point for Toitoi. It does not replace deployment-specific security engineering, but it defines the minimum reporting, information-handling, and authority boundaries expected for the v1.0.0 reference implementation.

## Reporting a vulnerability

Do not disclose an unpatched vulnerability in a public Issue, Discussion, Pull Request, fixture, or log.

Use a private GitHub security reporting channel when available. If no private repository security channel is available, contact the repository owner privately and provide:

- affected component and version or commit;
- reproduction steps;
- security impact;
- whether credentials, personal information, field locations, or unpublished observations are involved;
- proposed mitigation when known.

Do not include real secrets or unnecessary personal data in the report. Use redacted or synthetic examples.

## Sensitive information boundary

Potentially sensitive information includes:

- precise farm, field, household, or participant location;
- participant identity or contact information;
- unpublished observations or community knowledge;
- authentication credentials and transport keys;
- API tokens, relay credentials, PDS credentials, private keys, and model-service secrets;
- audit records or logs containing request, actor, or operational details;
- backup archives and raw payloads.

Sensitive information must not be committed to repository fixtures, examples, screenshots, tests, or documentation.

## Reference implementation limitations

The v1.0.0 reference implementation is not production security certification.

- reference authentication headers are deterministic development boundaries, not OAuth/OIDC certification;
- TLS termination and network policy are deployment responsibilities;
- secrets must be stored outside the repository and outside public fixtures;
- rate limiting, idempotency, and process-local state may require deployment-specific durable implementations;
- external transports and AI providers introduce their own credential and data-retention boundaries.

## Authority and identity

Authentication identity, actor identity, transport identity, and Canonical Event identity remain distinct.

Possession of credentials does not automatically grant publication, moderation, or operator authority. Annotation review, relation confirmation, publication approval, moderation, and operator operations must remain separately attributable and auditable.

## Data minimization

Before capture, publication, logging, backup, or transport delivery:

1. collect only information necessary for the intended inquiry or operation;
2. abstract precise locality where exact coordinates are unnecessary;
3. require explicit acknowledgment before synchronizing marked sensitive fields;
4. avoid placing secrets or private raw data in Canonical Event semantic fields;
5. preserve raw and Canonical storage boundaries;
6. redact unnecessary sensitive data from incident reports and test fixtures.

## Secrets and credentials

- never commit secrets;
- load credentials through operator-controlled environment or secret storage;
- rotate credentials after suspected exposure;
- preserve audit evidence without copying secret values;
- invalidate or quarantine affected transport operations where appropriate;
- verify that retry does not create a new Canonical identity.

## Backup and incident handling

Backups may contain durable sensitive state. Operators must control access, retention, encryption, transfer, and deletion according to their deployment and legal obligations.

During an incident, preserve:

- timestamps;
- affected commit and deployment version;
- request IDs and audit references;
- relevant queue and transport state;
- backup and restore verification results;
- corrective actions and unresolved risks.

Do not publish sensitive evidence merely to demonstrate that an incident occurred.

## Related documents

- `docs/governance/INFORMATION_PROTECTION.md`
- `docs/governance/TOITOI_GOVERNANCE.md`
- `docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md`
- `docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`
- `CONTRIBUTING.md`

---

# セキュリティと機微情報

**言語状態:** 英語版と日本語版は同等の内容として管理します。
**最終同期日:** 2026-10-20

## 目的

この文書は、Toitoiのセキュリティと機微情報の取り扱いを案内します。配備環境ごとのセキュリティ設計を代替するものではありません。v1.0.0参照実装で必要となる、最小限の報告方法、情報の取り扱い、権限の分離を定めます。

## 脆弱性の報告

未修正の脆弱性を、公開Issue、Discussion、Pull Request、固定テストデータ、ログで公開しないでください。

利用できる場合は、GitHubの非公開の脆弱性報告機能を使ってください。非公開の報告窓口がない場合は、リポジトリ所有者へ非公開で連絡し、次を提示してください。

- 影響する構成要素と、バージョンまたはコミット
- 再現手順
- セキュリティ上の影響
- 認証情報、個人情報、圃場の位置、未公開の観察記録が関係するか
- 判明している場合は、影響を軽減する案

実際の認証情報や不要な個人情報を報告に含めず、機微情報を伏せた例や架空の例を使ってください。

## 機微情報に該当し得るもの

- 農場、圃場、世帯、参加者の正確な位置
- 参加者を識別できる情報や連絡先
- 未公開の観察記録やコミュニティの知識
- 認証情報や配信用の鍵
- APIトークン、リレーやPDSの認証情報、秘密鍵（private key）、モデルサービスの機密情報
- リクエスト、操作主体、操作の詳細を含む監査記録やログ
- バックアップ一式や受信した元データ

機微情報を、リポジトリの固定テストデータ、使用例、スクリーンショット、テスト、文書にコミットしてはいけません。

## 参照実装の制約

v1.0.0参照実装は、本番環境のセキュリティ認定を受けたものではありません。

- 参照実装の認証ヘッダーは、再現可能な開発用の仕組みです。OAuth/OIDC認定ではありません。
- TLS終端処理とネットワーク方針は、配備環境側で管理します。
- 機密情報は、リポジトリや公開の固定テストデータとは別に保存します。
- リクエスト頻度制限、冪等性、プロセス内の状態には、配備環境に応じた永続化の実装が必要になる場合があります。
- 外部配信先とAIプロバイダーには、それぞれ認証情報とデータ保持の管理範囲があります。

## 権限と識別情報

認証時の識別情報、操作主体の識別情報、配信先固有の識別情報、Canonical Eventの同一性（Canonical Event identity）は、分けて扱います。

認証情報を持つだけで、公開・モデレーション・運用者の権限が自動的に得られるわけではありません。AI注釈の確認、関係の確定、公開承認、モデレーション、運用者の操作は、それぞれ誰の判断・操作かを追跡し、監査できる必要があります。

## 必要最小限の情報の取り扱い

記録、公開、ログ出力、バックアップ、配信の前に、次を行います。

1. 対象の問いや操作に必要な情報だけを収集する。
2. 正確な座標が不要な場合は、位置情報の粒度を粗くする。
3. 機微情報として指定された項目の同期前に、明示的な確認を求める。
4. 機密情報や非公開の元データを、Canonical Eventの意味を表す項目に入れない。
5. 元データとCanonical Eventの保存範囲を分ける。
6. 事故報告や固定テストデータから、不要な機微情報を伏せる。

## 機密情報と認証情報

- 機密情報をコミットしない。
- 運用者が管理する環境や機密情報の保存先から、認証情報を読み込む。
- 漏えいが疑われる場合は、認証情報を更新・交換する。
- 機密情報の値を複製せずに、監査に必要な証拠を保持する。
- 必要に応じて、影響を受けた配信操作を無効化または隔離する。
- 再試行によって新しいCanonical Eventの同一性が生じないことを確認する。

## バックアップと事故対応

バックアップには、機微な永続データが含まれる場合があります。運用者は、配備環境と法的義務に応じて、アクセス、保持期間、暗号化、転送、削除を管理する必要があります。

事故時には、次を保持します。

- 日時
- 影響するコミットと配備バージョン
- リクエストIDと監査記録への参照
- 関連するキューと配信の状態
- バックアップ・復元の検証結果
- 是正措置と未解決のリスク

事故の発生を示すためだけに、機微な証拠を公開してはいけません。

## 関連文書

- `docs/governance/INFORMATION_PROTECTION.md`
- `docs/governance/TOITOI_GOVERNANCE.md`
- `docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md`
- `docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`
- `CONTRIBUTING.md`
