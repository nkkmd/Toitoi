# 運用チェックリスト

**Last updated: 2026-06-03**

**目的**: 日常運用でそのまま使える短いチェックリストに落とし込む。

## どこで使うか

- 対象: 日常運用の担当者、オンコール担当
- 使用場面: ingest 失敗時の確認、監視確認、バックアップ前後のチェック
- 関連実装: `infra/transports/nostr/MONITOR_SETUP.md`、`docs/operations/NOSTR_STORAGE_AND_REPLAY.md`
- 前提モデル: canonicalized event を内部中心にし、Nostr は transport projection として扱う
- このチェックリストが扱う duplicate は、Nostr の source 内重複と ingest 時の transport 側判定に限定する
- cross-source の semantic duplicate 判定は Phase 13/14 の multi-transport policy に従う

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
- [ ] `toitoi-nostr-worker` と `toitoi-api` が online である
- [ ] `nostream` / `nostream-db` / `nostream-cache` が running である
- [ ] `caddy` が active である
- [ ] `/health` が 200 を返す
- [ ] relay からの ingest が継続して canonicalized event に変換されている
- [ ] indexer の共通構築手順が `infra/indexers/INDEXER_API_SETUP.md` にまとまっていることを確認する

---

## 3. バックアップ

- [ ] `toitoi-monitor` を停止する
- [ ] `toitoi-nostr-worker` と `toitoi-api` を停止する
- [ ] `packages/nostr/storage` の storage ディレクトリを退避する
- [ ] `raw-events.jsonl` / `canonical-events.jsonl` / `ingest-log.jsonl` / `index-snapshot.json` を確認する
- [ ] `provenance` と `rawRef` を含む canonicalized snapshot が揃っているか確認する
- [ ] `~/nostr-archive/agroecology-commons/inquiry*.jsonl` の transport archive も必要に応じて確認する
- [ ] replay が必要なら `pnpm --filter @toitoi/nostr replay -- --protocol nostr --storage-dir <dir> --verify` を使う
- [ ] replay CLI は `--` 区切りを無視するので、上の書き方のままでよい
- [ ] バックアップを別場所に保管する

---

## 4. 復旧

- [ ] storage バックアップを展開する
- [ ] `replay_cli.js --protocol nostr --storage-dir <dir> --verify` を実行する
- [ ] `index-snapshot.json` が再生成されることを確認する
- [ ] `TOITOI_STORAGE_DIR=<dir> pnpm --filter @toitoi/api start` を起動できることを確認する
- [ ] `/health` と `lookup` / `list` / `query` / `relation` / `tree` を確認する
- [ ] 必要なら raw event から canonicalized event を再生成する
- [ ] transport archive がある場合は、必要に応じて relay 再投入も検討する

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

- [NOSTR_STORAGE_AND_REPLAY.md](../../docs/operations/NOSTR_STORAGE_AND_REPLAY.md)
- [INGEST_RETRY_POLICY.md](./INGEST_RETRY_POLICY.md)
- [MONITOR_SETUP.md](./MONITOR_SETUP.md)
- [CLEAN_START.md](./CLEAN_START.md)
