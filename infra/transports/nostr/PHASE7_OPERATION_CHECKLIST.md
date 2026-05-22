# フェーズ7 運用チェックリスト

**目的**: Phase 7 の運用整備を、日常運用でそのまま使える短い手順に落とし込む。

---

## 1. Ingest 失敗時

- [ ] 失敗種別を確認する
- [ ] `invalid` / `duplicate` / verify failure なら再試行しない
- [ ] `ECONNRESET` / `ETIMEDOUT` / `ECONNREFUSED` などなら再試行対象にする
- [ ] `relay_ingest_worker` の retry 回数が上限以内か確認する
- [ ] 上限超過なら relay 側・ネットワーク側を確認する
- [ ] 再試行しても失敗する場合は手動 ingest を止める

---

## 2. 監視確認

- [ ] `toitoi-monitor` が稼働している
- [ ] `toitoi-worker` と `toitoi-api` が online である
- [ ] `nostream` / `nostream-db` / `nostream-cache` が running である
- [ ] `caddy` が active である
- [ ] `/health` が 200 を返す

---

## 3. バックアップ

- [ ] `toitoi-monitor` を停止する
- [ ] `toitoi-worker` と `toitoi-api` を停止する
- [ ] storage ディレクトリを退避する
- [ ] `raw-events.jsonl` / `canonical-events.jsonl` / `ingest-log.jsonl` / `index-snapshot.json` を確認する
- [ ] バックアップを別場所に保管する

---

## 4. 復旧

- [ ] storage バックアップを展開する
- [ ] `replay_cli.js --storage-dir <dir>` を実行する
- [ ] `index-snapshot.json` が再生成されることを確認する
- [ ] `TOITOI_STORAGE_DIR=<dir> node apps/api/server.js` を起動できることを確認する
- [ ] `/health` と `lookup` / `list` / `query` / `relation` / `tree` を確認する

---

## 5. データ欠落時

- [ ] 直近バックアップを探す
- [ ] raw event が残っているか確認する
- [ ] raw があるなら replay する
- [ ] raw がないなら canonical / index snapshot で暫定復旧する
- [ ] 不足分は relay から再 ingest する

---

## 6. 関連

- [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md)
- [INGEST_RETRY_POLICY.md](./INGEST_RETRY_POLICY.md)
- [MONITOR_SETUP.md](./MONITOR_SETUP.md)
- [CLEAN_START.md](./CLEAN_START.md)
