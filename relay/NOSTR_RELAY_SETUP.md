# 構築ガイド：アグロエコロジー・コモンズ専用リレーの立ち上げ方
**バージョン：2.2**　｜　前バージョン (v2.1) からの主な追加：Nostream最新仕様への対応（`.env`から`.nostr/settings.yaml`への設定移行、シークレットキーの自動生成）

本ドキュメントは、「デジタル・アグロエコロジー・コモンズ」の基盤となる専用Nostrリレーサーバーを構築するための公式ガイドです。

このリレーは、スパムや無関係なSNS投稿を一切遮断し、**アグロエコロジーの「問い（Kind: 11042）」のみを永続的に保存する「知識の図書館」** として機能します。あなたがこのリレーを立ち上げることで、特定の企業に依存しない強靭な分散ネットワーク（入れ子構造のコモンズ）が実現されます。

---

## 1. 事前準備（システム要件）

サーバーを構築する前に、以下の準備をお願いします。

*   **Linuxサーバー（VPSなど）:**
    *   OS: Ubuntu 22.04 LTS または Debian 12 (推奨)
    *   スペック: 最小 1vCPU / 1GB RAM / 20GB SSD（月額500円〜1000円程度のVPSで十分稼働します）
*   **ドメインの取得:**
    *   例: `relay.your-domain.com`（取得したドメインのAレコードを、VPSのIPアドレスに向けておいてください）
*   **必須ソフトウェア:**
    *   Git, Docker, Docker Compose v2 がインストールされていること。
*   **§6 のJSONLアーカイブ機能を使う場合の追加要件:**
    *   `nak`（Nostr CLIツール）および `git` がサーバーにインストールされていること。

---

## 2. 構築ステップ

サーバーにSSHでログインし、以下の手順を順番に実行してください。

### Step 2.1: Nostream（リレーエンジン）の取得
世界で最も堅牢なNostrリレーソフトウェアの一つである `Nostream` を利用します。

```bash
# Nostreamのリポジトリをクローンしてディレクトリに移動
git clone https://github.com/Cameri/nostream.git
cd nostream
```

### Step 2.2: セキュリティキーの生成（.env）
Nostreamを安全に稼働させるための「シークレットキー」を生成して `.env` ファイルに記述します。（リレーの詳細設定は次の Step 2.3 で行います）

```bash
# デフォルトの設定ファイルをコピー
cp .env.example .env

# 128文字のランダムなシークレットキーを生成して .env に追記
echo "SECRET=$(openssl rand -hex 128)" >> .env
```

### Step 2.3: アグロエコロジー専用設定（settings.yaml）
「Kind 11042 のみを受け付ける」という強力なホワイトリスト設定や、リレーのプロフィール情報は `.nostr/settings.yaml` に記述します。

```bash
# 設定ディレクトリを作成し、デフォルト設定をコピー
mkdir -p .nostr
cp resources/default-settings.yaml .nostr/settings.yaml

# 設定ファイルを編集 (nano エディタを使用)
nano .nostr/settings.yaml
```

ファイルを開いたら、以下の構成になるように該当部分を変更・追記してください。
（※YAMLファイルはインデントが厳密です。タブ文字は使わず半角スペースを使用してください）

```yaml
info:
  relay_url: wss://relay.your-domain.com
  name: "Agroecology Commons Relay (Kyushu)"
  description: "九州地域の有機農家コミュニティが運営する、アグロエコロジー『問いの循環』専用リレーです。"
  pubkey: "<あなたのNostr公開鍵（hex形式）があれば入力>"
  contact: "mailto:admin@your-domain.com"

# --- 中略（paymentsなどの他項目はデフォルトのままでOK） ---

limits:
  client:
    subscription:
      # アプリからの同時接続や検索の過剰な要求を防ぐ
      maxSubscriptions: 10
      maxFilters: 10
  event:
    eventId:
      # 計算証明（PoW）は要求しない
      minLeadingZeroBits: 0
    kind:
      # Kind 11042（問い）のイベントのみを保存・配信する
      whitelist:
        - 11042
      blacklist:[]
    createdAt:
      # 古すぎる/未来すぎるタイムスタンプのイベントを拒否
      maxPositiveDelta: 60
      maxNegativeDelta: 31536000 # (1年前まで)
    content:
      # 巨大なデータ（画像スパム等）を防ぐため、イベントサイズを20KBに制限
      maxLength: 20000
```
*※編集が終わったら `Ctrl + O` → `Enter` で保存し、`Ctrl + X` で閉じます。*

### Step 2.4: docker-compose.yml の調整（ネットワーク競合回避）
Nostreamのデフォルト設定のまま起動すると、VPSの環境によってはネットワーク競合によるエラー（起動ループ）が発生します。これを未然に防ぐため、固定IP設定を解除してDockerに自動割り当てさせます。

```bash
nano docker-compose.yml
```
ファイルを開き、以下の部分を `#` でコメントアウトするか、行ごと削除してください。

1. 各コンテナ（`nostream`, `nostream-db`, `nostream-cache`）の `ipv4_address: 10.10.10.x` の行
2. ファイルの一番下にある `subnet: 10.10.10.0/24` およびその上の `ipam:` 関連の行
*(※さらに安全性を高めるため、外部公開が不要な `nostream-db` の `5432:5432` と `nostream-cache` の `6379:6379` のポート指定もコメントアウトしておくことを推奨します)*

### Step 2.5: データベースのセットアップと起動
NostreamはPostgreSQLを使用します。Docker Composeを使って一発で起動します。（※権限エラーを防ぐため `sudo` を付けて実行します）

```bash
# Nostream本体とデータベース(PostgreSQL)のビルドと起動（バックグラウンド実行）
sudo docker compose up -d
```
起動後、`sudo docker compose logs -f nostream` を実行し、エラーが出ずに一番最後に `Server listening on port 8008` または `nostream is running` と表示されていれば内部サーバーの起動は成功です。（監視から抜けるには `Ctrl + C`）

---

## 3. SSL暗号化と公開（Caddyの導入）

Nostrの通信はセキュアなWebSocket（`wss://`）で行われる必要があります。SSL証明書の取得と更新を完全に自動化してくれる **Caddy** を導入します。

### Step 3.1: Caddyのインストール
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### Step 3.2: Caddyfileの設定（リバースプロキシ）
Caddyの設定ファイルを編集し、あなたのドメインへのアクセスをNostream（ポート8008）に流すように設定します。

```bash
sudo nano /etc/caddy/Caddyfile
```

以下の内容をコピーし、`relay.your-domain.com` の部分をあなたの実際のドメインに書き換えて貼り付けてください。

```caddy
# あなたのドメインを指定
relay.your-domain.com {
    # Nostream (ポート8008) へリバースプロキシ
    reverse_proxy localhost:8008 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }

    # NIP-11（リレー情報）へのCORSアクセス許可
    @options {
        method OPTIONS
    }
    header {
        Access-Control-Allow-Origin "*"
        Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization"
    }
    respond @options 204
}
```
*※ `Ctrl + O` → `Enter` で保存し、`Ctrl + X` で閉じます。*

### Step 3.3: Caddyの再起動
```bash
# 設定を反映して再起動
sudo systemctl restart caddy
```
これで、Caddyが自動的に Let's Encrypt と通信し、数秒でSSL証明書（HTTPS/WSS）が適用されます。

---

## 4. 動作確認（テスト）

あなたの構築したリレーが、正しくコモンズのネットワークとして機能しているかテストします。

### ブラウザでの確認 (NIP-11)
ブラウザを開き、`https://relay.your-domain.com` にアクセスしてください。
「Please use a Nostr client to connect.」という文字が表示されれば成功です。

### WebSocket接続とフィルタリングのテスト
Nostrの接続確認ツールを使用して、WebSocket（`wss://`）が機能しているか、そして**指定したKind以外がちゃんと弾かれるか**を確認します。

手元のPC（またはサーバー上）で以下のNode.jsスクリプトを実行してみてください。
（※ `wss://relay.your-domain.com` をあなたのドメインに変更してください）

```javascript
// test_relay.js
const { generateSecretKey, finalizeEvent } = require('nostr-tools/pure');
const { Relay } = require('nostr-tools/relay');
const WebSocket = require('ws');
global.WebSocket = WebSocket;

async function test() {
    const relay = await Relay.connect('wss://relay.your-domain.com');
    console.log(`✅ リレーに接続成功`);

    const sk = generateSecretKey();

    // テスト1: 許可されている「問い」のイベント (Kind 11042)
    const validEvent = finalizeEvent({
        kind: 11042,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["t", "agroecology"], ["context", "test"]],
        content: "テストの問いです"
    }, sk);

    try {
        await relay.publish(validEvent);
        console.log(`🟢 Kind 11042 (問い) の送信に成功しました！`);
    } catch (e) {
        console.error(`🔴 失敗:`, e);
    }

    // テスト2: 許可されていない普通のSNS投稿 (Kind 1)
    const invalidEvent = finalizeEvent({
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags:[],
        content: "おはよう！これは弾かれるべき普通のツイートです。"
    }, sk);

    try {
        await relay.publish(invalidEvent);
        console.log(`🔴 失敗: Kind 1 が送信できてしまいました（設定ミス）`);
    } catch (e) {
        console.log(`🟢 成功: Kind 1 の送信が正しく拒否されました！（スパム防御機能が作動）: ${e}`);
    }

    relay.close();
}
test();
```

---

## 5. 運用と保守（データ・コモンズを守るために）

リレーの運営者としての作業はほぼゼロですが、データベースのバックアップは重要です。

### データのバックアップ（PostgreSQL）
蓄積された「問いの系譜」は地域の財産です。定期的に以下のコマンドでDBのダンプ（バックアップ）を取ることをお勧めします。

```bash
cd nostream
sudo docker exec -t nostream-db-1 pg_dumpall -c -U nostr_ts_relay > dump_`date +%Y-%m-%d`.sql
```
*(※ユーザー名等の環境によってエラーが出る場合は、適宜確認してください)*

### システムのアップデート
Nostreamの最新のセキュリティパッチを適用する場合は以下を実行します。

```bash
cd nostream
git pull origin main
sudo docker compose build
sudo docker compose up -d
```

### コミュニティへの参加表明
リレーが正常に稼働したら、システムのフロントエンド（ダッシュボード）にある「リレー追加」設定から、あなたの `wss://relay.your-domain.com` をネットワークに追加してください。
これで、世界中の農家とAIが、あなたのリレーをコモンズの一部として利用し始めます。

---

## 6. JSONLアーカイブとGit管理（知識の系譜を永続化する）

> **なぜこれが必要か？**
>
> PostgreSQLのダンプはリレーを復元するためのものです。一方、**JSONLアーカイブ**はNostrイベントをプロトコル中立なテキスト形式で保存します。Nostrのイベントはすでに秘密鍵で署名された自己完結データのため、このJSONLファイルさえあれば、リレーソフトウェアが変わっても、VPSが廃止されても、いつでもどこでも完全復元できます。Gitで管理することで、「問いの系譜」が**改ざん不可能な履歴**として残ります。

---

### Step 6.1: `nak` のインストール

`nak` はNostrイベントを操作するための軽量CLIツールです。

```bash
# Go製バイナリのダウンロード（最新版はGitHubリリースページを確認）
curl -L https://github.com/fiatjaf/nak/releases/latest/download/nak-linux-amd64 -o /usr/local/bin/nak
chmod +x /usr/local/bin/nak

# 動作確認
nak --version
```

---

### Step 6.2: Gitアーカイブリポジトリの初期化

アーカイブ専用のディレクトリとGitリポジトリを作成します。

```bash
# アーカイブ用ディレクトリの作成
mkdir -p ~/nostr-archive/agroecology-commons
cd ~/nostr-archive/agroecology-commons

# Gitリポジトリの初期化
git init
git config user.name "Agroecology Commons Relay"
git config user.email "admin@your-domain.com"

# .gitignoreの設定（一時ファイルを除外）
echo "*.tmp" > .gitignore
echo ".DS_Store" >> .gitignore
git add .gitignore
git commit -m "init: アグロエコロジー・コモンズ アーカイブリポジトリを初期化"
```

---

### Step 6.3: 手動エクスポート（初回・任意のタイミング）

リレーに蓄積されたKind: 11042のイベントをJSONL形式でエクスポートします。

```bash
cd ~/nostr-archive/agroecology-commons

# ── 全件エクスポート ──
nak req -k 11042 wss://relay.your-domain.com > archive_$(date +%Y-%m-%d).jsonl

# エクスポートされた件数を確認
wc -l archive_$(date +%Y-%m-%d).jsonl
```

> **JSONL形式とは？** 1行＝1イベントのJSON。`{"id":"...","pubkey":"...","kind":11042,"content":"問いの内容",...}` という形式で、各行が独立したNostrイベントです。テキストエディタでも読め、あらゆるツールで処理できます。

エクスポート後、Gitにコミットします。

```bash
git add archive_$(date +%Y-%m-%d).jsonl
git commit -m "archive: $(date +%Y-%m-%d) 時点のスナップショット（$(wc -l < archive_$(date +%Y-%m-%d).jsonl)件）"
```

---

### Step 6.4: 差分アーカイブスクリプト（cronで自動化）

毎回全件エクスポートではなく、**前回以降の新規イベントだけを追記する差分方式**にすることで、ファイルサイズと処理時間を最小化します。

以下のスクリプトを作成してください。

```bash
nano ~/nostr-archive/archive_diff.sh
```

```bash
#!/bin/bash
# =====================================================
# アグロエコロジー・コモンズ JSONL差分アーカイバ
# 前回コミット以降の新規イベントのみを取得し、Gitにコミットする
# =====================================================

RELAY="wss://relay.your-domain.com"       # ← あなたのリレーURLに変更
ARCHIVE_DIR="$HOME/nostr-archive/agroecology-commons"
ARCHIVE_FILE="$ARCHIVE_DIR/questions.jsonl"
LOG_FILE="$ARCHIVE_DIR/archive.log"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)

cd "$ARCHIVE_DIR" || exit 1

# 最後にエクスポートしたイベントのタイムスタンプを取得
# (ファイルが存在しない場合は0＝全件取得)
if[ -f "$ARCHIVE_FILE" ]; then
    # JSONLの最終行からcreated_atを取得
    LAST_TS=$(tail -1 "$ARCHIVE_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('created_at',0))" 2>/dev/null || echo 0)
else
    LAST_TS=0
fi

echo "[$TIMESTAMP] 前回タイムスタンプ: $LAST_TS" >> "$LOG_FILE"

# 前回以降の新規イベントを取得（since パラメータで差分取得）
TMP_FILE=$(mktemp)
nak req -k 11042 --since "$LAST_TS" "$RELAY" > "$TMP_FILE" 2>> "$LOG_FILE"

NEW_COUNT=$(wc -l < "$TMP_FILE")

if[ "$NEW_COUNT" -eq 0 ]; then
    echo "[$TIMESTAMP] 新規イベントなし。スキップ。" >> "$LOG_FILE"
    rm "$TMP_FILE"
    exit 0
fi

# 既存ファイルに追記（重複を避けるためIDで重複排除）
cat "$TMP_FILE" >> "$ARCHIVE_FILE"

# IDの重複排除（同じイベントが二重取得された場合の保険）
python3 - <<'EOF'
import json, sys

seen = set()
unique_lines =[]
with open("questions.jsonl", "r") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
            eid = event.get("id")
            if eid and eid not in seen:
                seen.add(eid)
                unique_lines.append(line)
        except json.JSONDecodeError:
            pass  # 壊れた行はスキップ

with open("questions.jsonl", "w") as f:
    f.write("\n".join(unique_lines) + "\n")

print(f"重複排除後の総イベント数: {len(unique_lines)}")
EOF

rm "$TMP_FILE"

# Gitにコミット
TOTAL=$(wc -l < "$ARCHIVE_FILE")
git add questions.jsonl
git commit -m "archive: $DATE +${NEW_COUNT}件追加（累計 ${TOTAL}件）" >> "$LOG_FILE" 2>&1

echo "[$TIMESTAMP] 完了: ${NEW_COUNT}件追加、累計 ${TOTAL}件" >> "$LOG_FILE"
```

```bash
# 実行権限を付与
chmod +x ~/nostr-archive/archive_diff.sh

# 動作テスト（手動実行）
~/nostr-archive/archive_diff.sh
```

---

### Step 6.5: cronで自動化（毎日深夜3時）

```bash
crontab -e
```

以下の行を追加します。

```cron
# アグロエコロジー・コモンズ JSONL差分アーカイブ（毎日03:00）
0 3 * * * /bin/bash $HOME/nostr-archive/archive_diff.sh
```

---

### Step 6.6: リモートリポジトリへのpush（任意・強く推奨）

Gitリポジトリをリモート（GitHub / Gitea / Forgejo など）にも push することで、VPS障害時の最終防衛ラインになります。

```bash
# GitHubの場合（プライベートリポジトリ推奨）
cd ~/nostr-archive/agroecology-commons
git remote add origin git@github.com:your-username/agroecology-commons-archive.git
git push -u origin main

# 以後、archive_diff.sh の末尾に以下を追加すれば自動pushも可能
# git push origin main >> "$LOG_FILE" 2>&1
```

> **プライバシーに関する注意：** Nostrのイベントはもともとパブリックなプロトコルのため、公開リポジトリにしても問題ありませんが、投稿者のpubkeyが含まれます。コミュニティの合意に基づいてプライベート/パブリックを選択してください。

---

### Step 6.7: アーカイブからの復元

リレーを新しいサーバーに移行した際や、データが失われた際は、JSONLファイルから直接再インポートできます。
`nak` の一括送信機能（ストリーミング）を利用するため、数万件のデータでも数秒〜数十秒で瞬時に復元可能です。

```bash
# アーカイブから新リレーへ全件インポート（一括処理）
cat ~/nostr-archive/agroecology-commons/questions.jsonl | nak event wss://new-relay.your-domain.com

echo "✅ インポート完了"
```

---

### アーカイブディレクトリの構成（完成イメージ）

```text
~/nostr-archive/agroecology-commons/
├── .git/                    # Gitリポジトリ（問いの系譜の歴史）
├── .gitignore
├── questions.jsonl          # 全イベントの蓄積（1行＝1問い）
├── archive.log              # 実行ログ
└── archive_diff.sh          # 差分アーカイブスクリプト
```

`git log` を実行すると、コミットメッセージが「問いの系譜」の年表になります。

```text
commit a3f9c2d  archive: 2026-06-01 +12件追加（累計 340件）
commit 7b1e804  archive: 2026-05-31 +8件追加（累計 328件）
commit 2c4a1f0  archive: 2026-05-30 +5件追加（累計 320件）
...
```

---

### 保存担保のレイヤー構成（まとめ）

| レイヤー | 手段 | リレー依存 | 可搬性 |
|---|---|---|---|
| L1 運用DB | PostgreSQL（Nostream標準） | ◎ 高 | △ 実装依存 |
| L2 DBダンプ | pg_dumpall → 外部ストレージ | ◎ 高 | △ 実装依存 |
| **L3 JSONLアーカイブ** | **nak + Gitで差分管理** | **✕ 不要** | **◎ 完全** |
| L4 リモートpush | GitHub / Gitea | ✕ 不要 | ◎ 完全 |

> **Nostrの本質的な強み：** イベントは署名済み自己完結データです。JSONLファイルさえ手元にあれば、リレーソフトウェアが廃止されても、VPSが消えても、「問いの系譜」はコモンズの手に残り続けます。

---

*このガイドはデジタル・アグロエコロジー・コモンズ推進プロジェクトの一環として作成されました。*
*v2.2 — 2026年4月改訂*