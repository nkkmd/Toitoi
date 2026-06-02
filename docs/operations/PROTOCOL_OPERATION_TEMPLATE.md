# Protocol Operation Template

**Version: 0.2.0** | **Status: evolving** | **Last updated: 2026-05-31**

この文書は、Toitoi で新しい protocol を追加するときの運用テンプレートです。  
`backup / restore / replay`、`retry / alert / health check`、`fixture / sample archive / migration script` を、protocol ごとに同じ見出しで揃えるために使います。

## 使い方

1. このテンプレートを protocol 名で複製する。
2. `supported` / `unsupported` を曖昧にせず、現状の実装状態に合わせて明記する。
3. replay が無い protocol は、将来対応の余地があっても `unsupported` と書く。
4. 変更があったら、対応する test と script を同時に更新する。

## 1. Protocol Profile

| 項目 | 値 |
|---|---|
| protocol | `<protocol-name>` |
| owner | `<team-or-person>` |
| primary role | `<transport / archive / file projection / other>` |
| storage mode | `<append-only / snapshot / metadata-only / unsupported>` |
| replay | `<supported / unsupported>` |
| replay entrypoint | `<module or command>` |

### Current registry snapshot

| protocol | replay | status note |
|---|---|---|
| `nostr` | supported | first operational transport layer |
| `atproto` | supported | replayable append-only storage is wired |
| `localfs` | unsupported | runtime replay is not wired yet; future file/archive-backed support is possible |

## 2. Backup / Restore / Replay

### Backup scope

- `<storage directory>`
- `<raw archive>`
- `<canonical snapshot>`
- `<ingest log>`

### Backup procedure

```bash
<stop writer>
<archive storage>
<copy supporting archives>
```

### Restore procedure

```bash
<restore backup>
<rebuild replayable state>
<verify api health>
```

### Replay notes

- raw input を source of truth として扱う
- canonicalized output は再生成可能な成果物として扱う
- replay 不能な protocol は、読み出し専用または metadata-only の扱いを明記する

## 3. Retry / Alert / Health Check

### Retry policy

- retry する failure: `<network / transient / temporary>`
- retry しない failure: `<invalid / duplicate / deterministic>`
- retry budget: `<count / backoff>`

### Health check

- endpoint: `<URL>`
- success criteria: `<HTTP 200 / payload shape>`
- degraded criteria: `<timeouts / missing storage / stale replay>`

### Alert policy

- alert conditions: `<process down / replay failure / storage divergence>`
- on-call action: `<reload / restart / restore / re-ingest>`

## 4. Fixture / Sample Archive / Migration Script

### Fixture

- `<package path>`
- `<test file>`
- `<expected shape>`

### Sample archive

- `<sample archive path>`
- `<how to replay>`
- `<how to regenerate>`

### Migration script

- `<script path>`
- `<input>`
- `<output>`
- `<verification step>`

## 5. New Protocol Onboarding Checklist

- [ ] descriptor に `replay` の有無が明記されている
- [ ] runtime storage があるかどうかが API / README / ops doc に揃っている
- [ ] backup / restore / replay 手順が protocol ごとに読める
- [ ] retry / alert / health check が protocol 単位で定義されている
- [ ] fixture と sample archive がテストから再現できる
- [ ] migration script がある場合は入出力と検証方法が書かれている
- [ ] unsupported の場合は将来対応可能性を note で残している

## 6. 関連

- [NOSTR_STORAGE_AND_REPLAY.md](./NOSTR_STORAGE_AND_REPLAY.md)
- [MONITOR_SETUP.md](../../infra/transports/nostr/MONITOR_SETUP.md)
- [OPERATION_CHECKLIST.md](../../infra/transports/nostr/OPERATION_CHECKLIST.md)
