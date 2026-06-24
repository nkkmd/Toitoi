# Lingonberry Transport Ops

`infra/transports/lingonberry/` は、Lingonberry carrier / archive / ingest worker の運用入口を置く場所です。

現時点では Phase 17 の batch/archive ingest 入口として、`lingonberry_ingest_worker.js` を置いています。最初の運用対象は live relay ではなく、Lingonberry archive または HTTP publish request JSONL の batch ingest です。

## 方針

- Lingonberry object は Toitoi Canonical Event の transport projection として扱う
- upstream の `knowledge object` を Toitoi の内部中心モデルとして扱わない
- raw request / wire log を保存し、replay できる経路を優先する
- live 接続が必要な smoke test は環境変数で gated にする

## 実行例

JSONL から ingest する場合:

```bash
node infra/transports/lingonberry/lingonberry_ingest_worker.js \
  --in /path/to/lingonberry-events.jsonl \
  --out /tmp/lingonberry-ingest-report.json \
  --storage-dir /path/to/lingonberry-storage \
  --source-label fixture
```

Lingonberry archive から ingest する場合:

```bash
node infra/transports/lingonberry/lingonberry_ingest_worker.js \
  --archive-dir /path/to/lingonberry-archive \
  --out /tmp/lingonberry-ingest-report.json \
  --storage-dir /path/to/lingonberry-storage \
  --source-label archive
```

`--archive-dir` は `<archive-dir>/wire-log.jsonl` を読み、各行の `requestJson` を Lingonberry HTTP publish request として処理します。

## live smoke

live publish は `packages/lingonberry/test_smoke.js` を使います。通常の worker は batch / archive ingest に限定し、live publish は明示的な smoke gate の中だけで扱います。

## systemd timer

Nostr worker と同じく、Lingonberry の最初の live ingest は `systemd timer` で定期回収します。  
常時接続ではなく、archive / wire log を一定間隔で読み直す storage-only の運用です。

```ini
[Unit]
Description=Toitoi Lingonberry ingest worker

[Service]
Type=oneshot
WorkingDirectory=/home/you/github/Toitoi
Environment=NODE_ENV=production
Environment=TOITOI_PROTOCOL=lingonberry
Environment=LINGONBERRY_ARCHIVE_DIR=/var/lib/toitoi/lingonberry-archive
Environment=LINGONBERRY_STORAGE_DIR=/var/lib/toitoi/lingonberry-storage
ExecStart=/usr/bin/env bash -lc 'pnpm --filter @toitoi/lingonberry-transport start -- --archive-dir "$LINGONBERRY_ARCHIVE_DIR" --protocol lingonberry --storage-dir "$LINGONBERRY_STORAGE_DIR" --source-label archive'
```

```ini
[Unit]
Description=Run Toitoi Lingonberry ingest worker every 10 minutes

[Timer]
OnCalendar=*:0/10
Persistent=true
Unit=toitoi-lingonberry-worker.service

[Install]
WantedBy=timers.target
```
