# Security and Sensitive Information

**Language status:** English and Japanese sections are maintained as equivalent.  
**Last synchronized:** 2026-07-23

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
**最終同期日:** 2026-07-23

## 目的

この文書は、Toitoiの公開security・sensitive information入口です。deployment固有のsecurity engineeringを代替するものではありませんが、v1.0.0参照実装で求める最小限の報告、情報取扱い、authority boundaryを定めます。

## 脆弱性の報告

未修正の脆弱性をpublic Issue、Discussion、Pull Request、fixture、logで公開しないでください。

利用可能な場合はGitHubのprivate security reporting channelを使用してください。private channelがない場合はrepository ownerへ非公開で連絡し、次を提示してください。

- 影響するcomponentとversionまたはcommit
- 再現手順
- security impact
- credential、personal information、圃場位置、未公開observationが関係するか
- 判明している場合はmitigation案

報告には実credentialや不要なpersonal dataを含めず、redactedまたはsyntheticな例を使用してください。

## Sensitive information boundary

機微情報となり得るものには次が含まれます。

- 正確な農場、圃場、世帯、参加者の位置
- 参加者identityまたはcontact information
- 未公開observationまたはcommunity knowledge
- authentication credentialとtransport key
- API token、relay credential、PDS credential、private key、model-service secret
- request、actor、operation detailsを含むaudit recordまたはlog
- backup archiveとraw payload

機微情報をrepository fixture、example、screenshot、test、documentationへcommitしてはいけません。

## 参照実装の制約

v1.0.0参照実装はproduction security certificationではありません。

- reference authentication headerは決定的development boundaryであり、OAuth/OIDC certificationではありません
- TLS terminationとnetwork policyはdeployment側の責任です
- secretはrepositoryとpublic fixtureの外で保存します
- rate limiting、idempotency、process-local stateはdeployment固有のdurable implementationを必要とする場合があります
- external transportとAI providerには、それぞれcredentialとdata retentionの境界があります

## Authorityとidentity

authentication identity、actor identity、transport identity、Canonical Event identityは分離します。

credentialを所持しているだけではpublication、moderation、operator authorityを自動的に取得しません。annotation review、relation confirmation、publication approval、moderation、operator operationは、別々に帰属・監査できなければなりません。

## Data minimization

capture、publication、logging、backup、transport deliveryの前に次を行います。

1. intended inquiryまたはoperationに必要な情報だけを収集する
2. exact coordinateが不要な場合はprecise localityを抽象化する
3. marked sensitive fieldのsynchronization前にexplicit acknowledgmentを要求する
4. secretまたはprivate raw dataをCanonical Event semantic fieldへ入れない
5. raw storageとCanonical storageの境界を保持する
6. incident reportとtest fixtureから不要な機微情報をredactする

## Secretとcredential

- secretをcommitしない
- operator-controlled environmentまたはsecret storageからcredentialを読み込む
- exposureが疑われる場合はcredentialをrotateする
- secret valueを複製せずaudit evidenceを保持する
- 必要に応じて影響したtransport operationをinvalidateまたはquarantineする
- retryで新しいCanonical identityを作らないことを確認する

## Backupとincident対応

backupには機微なdurable stateが含まれる場合があります。operatorはdeploymentと法的義務に応じてaccess、retention、encryption、transfer、deletionを管理しなければなりません。

incident時には次を保持します。

- timestamp
- 影響するcommitとdeployment version
- request IDとaudit reference
- 関連するqueueとtransport state
- backup・restore verification result
- corrective actionと未解決risk

incidentが発生したことを示すためだけに機微なevidenceを公開してはいけません。

## 関連文書

- `docs/governance/INFORMATION_PROTECTION.md`
- `docs/governance/TOITOI_GOVERNANCE.md`
- `docs/operations/V1.0.0_OPERATIONS_RUNBOOK.md`
- `docs/governance/DOCUMENTATION_LANGUAGE_POLICY.md`
- `CONTRIBUTING.md`
