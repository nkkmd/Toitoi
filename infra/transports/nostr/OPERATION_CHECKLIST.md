# 運用チェックリスト

**目的**: 日常運用でそのまま使える短いチェックリストに落とし込む。

## どこで使うか

- 対象: 日常運用の担当者、オンコール担当
- 使用場面: ingest 失敗時の確認、監視確認、バックアップ前後のチェック
- 関連実装: `infra/transports/nostr/MONITOR_SETUP.md`、`infra/transports/nostr/BACKUP_AND_RESTORE.md`
- 前提モデル: canonicalized event を内部中心にし、Nostr は transport projection として扱う

---

## 1. Ingest 失敗時

- [ ] 失敗種別を確認する
- [ ] `invalid` / `duplicate` / verify failure なら再試行しない
- [ ] `ECONNRESET` / `ETIMEDOUT` / `ECONNREFUSED` などなら再試行対象にする
- [ ] `relay_ingest_worker` の retry 回数が上限以内か確認する
- [ ] 上限超過なら relay 側・ネットワーク側を確認する
- [ ] 再試行しても失敗する場合は手動 ingest を止める
- [ ] raw event が残っているなら canonicalize 再実行の余地を確認する
- [ ] `provenance.sources[]` と `rawRef` を失っていないか確認する

---

## 2. 監視確認

- [ ] `toitoi-monitor` が稼働している
- [ ] `toitoi-worker` と `toitoi-api` が online である
- [ ] `nostream` / `nostream-db` / `nostream-cache` が running である
- [ ] `caddy` が active である
- [ ] `/health` が 200 を返す
- [ ] relay からの ingest が継続して canonicalized event に変換されている

---

## 3. バックアップ

- [ ] `toitoi-monitor` を停止する
- [ ] `toitoi-worker` と `toitoi-api` を停止する
- [ ] storage ディレクトリを退避する
- [ ] `raw-events.jsonl` / `canonical-events.jsonl` / `ingest-log.jsonl` / `index-snapshot.json` を確認する
- [ ] `provenance` と `rawRef` を含む canonicalized snapshot が揃っているか確認する
- [ ] バックアップを別場所に保管する

---

## 4. 復旧

- [ ] storage バックアップを展開する
- [ ] `replay_cli.js --storage-dir <dir>` を実行する
- [ ] `index-snapshot.json` が再生成されることを確認する
- [ ] `TOITOI_STORAGE_DIR=<dir> pnpm --filter @toitoi/api start` を起動できることを確認する
- [ ] `/health` と `lookup` / `list` / `query` / `relation` / `tree` を確認する
- [ ] 必要なら raw event から canonicalized event を再生成する

---

## 5. データ欠落時

- [ ] 直近バックアップを探す
- [ ] raw event が残っているか確認する
- [ ] raw があるなら replay する
- [ ] raw がないなら canonicalized event / index snapshot で暫定復旧する
- [ ] 不足分は relay から再 ingest する
- [ ] provenance が欠ける場合は復旧ログに明記する

---

## 6. 関連

- [BACKUP_AND_RESTORE.md](./BACKUP_AND_RESTORE.md)
- [INGEST_RETRY_POLICY.md](./INGEST_RETRY_POLICY.md)
- [MONITOR_SETUP.md](./MONITOR_SETUP.md)
- [CLEAN_START.md](./CLEAN_START.md)
