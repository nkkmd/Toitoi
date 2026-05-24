# 運用ガイド：Ingest Failure の再試行ポリシー

**Version: 0.1.0** | **Status: evolving** | **Last updated: 2026-05-22**

本ドキュメントは、Toitoi の Nostr relay ingest における再試行方針を定義します。

障害時に「何を再試行し、何を即時失敗とみなすか」を明確にして、運用判断を単純にすることを目的とします。

## どこで使うか

- 対象: ingest 実装者、運用者、障害解析担当
- 使用場面: `relay_ingest_worker.js` の再試行方針確認、運用判断の基準化
- 関連実装: `infra/transports/nostr/relay_ingest_worker.js`、`@toitoi/nostr/adapter/relay_ingest.js`

---

## 1. 再試行するもの

次のような一時的な relay / network 障害は再試行対象です。

- `ECONNRESET`
- `ETIMEDOUT`
- `EHOSTUNREACH`
- `ENETUNREACH`
- `EPIPE`
- `ECONNREFUSED`
- relay が EOSE 前に close した場合
- timeout / temporarily unavailable / socket hang up 系の失敗

---

## 2. 再試行しないもの

次のような失敗は再試行しません。

- raw event が invalid
- signature verify に失敗した event
- duplicate event
- canonicalize できない input
- subscription の論理エラー

これらはデータや入力の問題なので、retry しても状況は改善しません。

---

## 3. デフォルト値

relay ingest worker のデフォルトは次の通りです。

- retry 回数: `3`
- 初回 delay: `1000ms`
- 最大 delay: `10000ms`
- backoff factor: `2`

---

## 4. 設定方法

### CLI

```bash
pnpm --filter @toitoi/nostr-transport start -- \
  --relay-url wss://relay.example.com \
  --retry-attempts 3 \
  --retry-initial-delay-ms 1000 \
  --retry-max-delay-ms 10000 \
  --retry-factor 2
```

### Environment

- `RELAY_RETRY_ATTEMPTS`
- `RELAY_RETRY_INITIAL_DELAY_MS`
- `RELAY_RETRY_MAX_DELAY_MS`
- `RELAY_RETRY_FACTOR`

---

## 5. 運用上の考え方

- retry は transient failure を吸収するためのものです
- retry の上限を超えたら、monitor が異常として扱います
- retry しても改善しない failure は入力や設定の見直し対象です

---

## 6. 関連

- [MONITOR_SETUP.md](./MONITOR_SETUP.md)
- [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md)
- [OPERATION_CHECKLIST.md](./OPERATION_CHECKLIST.md)
- [NOSTR_STORAGE_AND_REPLAY.md](../../docs/operations/NOSTR_STORAGE_AND_REPLAY.md)
