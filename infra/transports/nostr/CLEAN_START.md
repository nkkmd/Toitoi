# 運用ガイド: Nostr リレーのクリーンスタート

**Version: 0.2.1** | **Status: evolving** | **Last updated: 2026-05-31**

本ドキュメントは、Nostream リレー側の PostgreSQL データを破棄して、リレーをクリーンな状態から再構築するための手順です。

**既存イベントとの互換性が失われる設定変更を行う際**に実施してください。本手順を実行すると、`nostream-db` に保持されたリレー用データが完全に削除されます。**必ず内容を十分に理解した上で実行してください。**

インデクサー側のクリーンスタートは別手順に分離しました。必要な場合は [infra/indexers/CLEAN_START.md](../../indexers/CLEAN_START.md) を参照してください。

クリーンスタートの前に、必要なら [NOSTR_STORAGE_AND_REPLAY.md](../../docs/operations/NOSTR_STORAGE_AND_REPLAY.md) を参照して `packages/nostr/storage` の storage を退避してください。`~/nostr-archive/agroecology-commons/inquiry*.jsonl` の transport archive を残すかどうかは、運用方針に応じて別途決めてください。

## どこで使うか

- 対象: リレー運用者
- 使用場面: リレーの初期化、DB破損時、互換性のない設定変更後
- 関連実装: `infra/transports/nostr/NOSTR_RELAY_SETUP.md`

---

## 1. 事前確認

本手順を実行する前に、以下を確認してください。

* JSONLアーカイブが存在する場合、必要に応じて手元に退避させておくこと。
* 変更内容が確定していること。
* 本番稼働中のリレーに外部からのアクセスがないか確認すること。

---

## 2. Nostream の停止

```bash
cd ~/nostream
sudo docker compose down -v
```

---

## 3. PostgreSQL データの完全削除

```bash
sudo rm -rf ~/nostream/.nostr/data
sudo rm -rf ~/nostream/.nostr/db-logs

mkdir -p ~/nostream/.nostr/data
mkdir -p ~/nostream/.nostr/db-logs

sudo chown -R 999:999 ~/nostream/.nostr/data
sudo chown -R 999:999 ~/nostream/.nostr/db-logs
```

---

## 4. Nostream の再起動と DB 再初期化

```bash
cd ~/nostream
sudo docker compose up -d
```

DB の初期化が完了するまで 30 秒ほど待ってから、以下でログを確認してください。

```bash
sudo docker compose logs nostream | tail -20
```

以下のログが出力されていれば初期化成功です。

```text
nostream  | ... "2 client workers started"
nostream  | ... "1 maintenance worker started"
```

---

## 5. 設定ファイルの修正と反映

### 例) `settings.yaml` の修正

設定変更がある場合は、以下のファイルを編集してください。

```bash
nano ~/nostream/.nostr/settings.yaml
```

修正後、Nostream を再起動して設定を反映します。

```bash
cd ~/nostream
sudo docker compose restart nostream
```

---

## 6. 動作確認

```bash
# リレーのログ確認
sudo docker compose logs nostream --lines 30

# リレーへのテスト送信
node test_relay.js

# リレーへの蓄積確認
nak req -k 1042 wss://relay.your-domain.com | jq .
```

---

## 7. JSONL アーカイブのリセット（任意）

クリーンスタートに合わせて JSONL アーカイブも初期化する場合は、以下を実行してください。

```bash
cd ~/nostr-archive/agroecology-commons

rm -f inquiry.jsonl inquiry_*.jsonl archive.log

git add -A
git commit -m "archive: Reset for clean start"
```

アーカイブを残したまま運用を継続する場合は、この手順は不要です。
