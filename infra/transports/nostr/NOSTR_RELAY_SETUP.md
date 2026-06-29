# 構築ガイド：Canonical Event 中心の Nostr リレー立ち上げ方

**Status: evolving** | **Last updated: 2026-06-29**

本ドキュメントは、Toitoi の Canonical Event を Nostr transport projection として受け取る専用リレーサーバーを構築するための公式ガイドです。

このリレーは、Nostr `kind: 1042` を中心とする inquiry transport を受け、保存された raw event を後段の canonicalization に渡すための入口として機能します。  
つまり、リレーは意味モデルそのものではなく、**Canonical Event を支える transport layer** です。Nostr 側で受けたイベントは、後続の adapter / normalizer によって canonicalized event へ変換され、Toitoi の内部中心モデルに接続されます。

## まず見るもの

- 立ち上げ手順の本体: このファイル
- 初期準備: [PREREQUISITE_INSTALLATION.md](./PREREQUISITE_INSTALLATION.md)
- 運用監視: [MONITOR_SETUP.md](./MONITOR_SETUP.md)
- バックアップ: [NOSTR_STORAGE_AND_REPLAY.md](../../docs/operations/NOSTR_STORAGE_AND_REPLAY.md)
- 異常時の初期化手順: [CLEAN_START.md](./CLEAN_START.md)
- 取り込みワーカー: [relay_ingest_worker.js](./relay_ingest_worker.js)（adapter / normalizer を通して canonicalized event 化する入口）

---

## 0. 最終的なディレクトリ構成

このガイドを最後まで進めた後の、ホスト側の配置イメージは次のとおりです。

```text
~/nostream/
├── .env
├── docker-compose.yml
├── postgresql.conf
└── .nostr/
    ├── data/
    ├── db-logs/
    └── settings.yaml

~/nostr-archive/
└── agroecology-commons/
    ├── .git/
    ├── .gitignore
    └── inquiry_YYYY-MM-DD.jsonl
```

`~/nostream/` はリレー本体と PostgreSQL の永続データを抱える作業ディレクトリで、`~/nostr-archive/agroecology-commons/` は raw transport event の JSONL アーカイブを Git で管理するための別ディレクトリです。

このガイドでは、次の 2 系統を分けて扱います。

- `~/nostr-archive/agroecology-commons/`: `nak req -k 1042` で取る transport archive。リレーから直接回収した raw transport event の履歴です。
- `packages/nostr/storage` 相当の storageDir: `@toitoi/nostr/storage/` が保持する append-only storage。`raw-events.jsonl` / `canonical-events.jsonl` / `ingest-log.jsonl` / `index-snapshot.json` を含み、`NOSTR_STORAGE_AND_REPLAY.md` の対象です。

つまり、transport archive は「リレーの外側に残す長期保全」、storage は「canonicalized event を再構築するための運用バックアップ」です。両方を併用すると、リレーの再取得と内部モデルの復旧を別々に扱えます。

---

## 1. 事前準備（システム要件）

サーバーを構築する前に、以下の準備をお願いします。

*   **Linuxサーバー（VPSなど）:**
    *   OS: Ubuntu 24.04 LTS または Debian 12 (推奨)
    *   Ubuntu 26.04 LTS も Docker 公式対応範囲ですが、導入前に本ガイドの手順で動作確認することを推奨します
    *   スペック: 最小 1vCPU / 1GB RAM / 20GB SSD（月額500円〜1000円程度のVPSで十分稼働します）
*   **ドメインの取得:**
    *   例: `relay.your-domain.com`（取得したドメインのAレコードを、VPSのIPアドレスに向けておいてください）
*   **必須ソフトウェア:**
    *   Git, Docker, Docker Compose v2, nak がインストールされていること。
    *   インストール手順は [PREREQUISITE_INSTALLATION.md](./PREREQUISITE_INSTALLATION.md) を参照してください。
    *   **重要:** PREREQUISITE_INSTALLATION.md の手順完了後、必ずSSHセッションを切断して再接続してからこのガイドに進んでください。

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
Nostreamを安全に稼働させるための「シークレットキー」を生成して `.env` ファイルに記述します。

```bash
# デフォルトの設定ファイルをコピー
cp .env.example .env

# 128文字のランダムなシークレットキーを生成して .env に追記
echo "SECRET=$(openssl rand -hex 128)" >> .env
```

※ このコマンドは **一度だけ** 実行してください。複数回実行すると `SECRET=` の行が重複します。重複した場合は `nano .env` で開いて余分な行を削除してください。

### Step 2.3: 設定ディレクトリと postgresql.conf の準備
Nostreamが使用するディレクトリと、PostgreSQLの設定ファイルを事前に作成します。

**この手順を省略すると、Dockerが `postgresql.conf` を誤ってディレクトリとして作成してしまい、データベースが起動できなくなります。必ず実行してください。**

```bash
# 設定ディレクトリを作成
mkdir -p .nostr/data
mkdir -p .nostr/db-logs

# postgresql.conf をファイルとして事前生成（重要）
docker run --rm postgres:15 cat /usr/share/postgresql/postgresql.conf.sample > postgresql.conf
```

### Step 2.4: docker-compose.yml の調整（ネットワーク競合回避）
Nostreamのデフォルト設定のまま起動すると、VPSの環境によってはネットワーク競合によるエラー（起動ループ）が発生します。これを未然に防ぐため、固定IP設定を解除してDockerに自動割り当てさせます。

```bash
nano docker-compose.yml
```
ファイルを開き、以下の部分を `#` でコメントアウトするか、行ごと削除してください。

1. 各コンテナ（`nostream`, `nostream-db`, `nostream-cache`）の `ipv4_address: 10.10.10.x` の行
2. ファイルの一番下にある `subnet: 10.10.10.0/24` およびその上の `ipam:` 関連の行

*(※さらに安全性を高めるため、外部公開が不要な `nostream-db` の `5432:5432` と `nostream-cache` の `6379:6379` のポート指定もコメントアウトしておくことを推奨します)*

### Step 2.5: パーミッションの設定
Dockerコンテナ内のプロセスは特定のユーザーで動作するため、ホスト側のディレクトリのオーナーを合わせておく必要があります。

```bash
# nostreamコンテナ用（node ユーザー: UID=1000）
sudo chown -R 1000:1000 .nostr

# PostgreSQLコンテナ用（postgres ユーザー: UID=999）
sudo chown -R 999:999 .nostr/data
sudo chown -R 999:999 .nostr/db-logs
```

**注意：** ホスト側に `lxd` などUID=999のシステムユーザーが存在する場合、`ls -la` の表示がそのユーザー名になりますが、コンテナ内では正しくpostgresユーザーとして動作します。`ls -lan` でUID番号が `999` になっていれば問題ありません。

### Step 2.6: データベースのセットアップと初回起動

```bash
# Nostream本体とデータベース(PostgreSQL)のビルドと起動（バックグラウンド実行）
sudo docker compose up -d
```

起動後、以下のコマンドでログを確認してください。

```bash
sudo docker compose logs -f nostream
```

以下のようなログが出力されていれば起動成功です。（監視から抜けるには `Ctrl + C`）

```
nostream  | ... "2 client workers started"
nostream  | ... "1 maintenance worker started"
nostream  | ... "Tor hidden service: disabled"
```

**起動直後に `Error: ENOENT: no such file or directory, watch '/home/node/.nostr/settings.yaml'` が出ることがありますが、これは次のStep 2.7で設定ファイルを配置する前の一時的なエラーです。その後に上記の正常ログが続いていれば問題ありません。**

### Step 2.7: Canonical Event projection に対応した設定（settings.yaml）

Nostream v2.1.1 は設定ファイルとして `settings.yaml` を使用します。ここでは、Nostr inquiry event を Canonical Event の transport projection として受ける前提で設定します。コンテナ内のテンプレートをホスト側にコピーして編集します。

```bash
# テンプレートをコンテナからコピー
sudo docker cp nostream:/app/resources/default-settings.yaml .nostr/settings.yaml

# オーナーをnodeユーザー(UID=1000)に設定
sudo chown 1000:1000 .nostr/settings.yaml
```

次に編集します。

```bash
nano .nostr/settings.yaml
```

**ファイルの内容をすべて削除し、以下の全文をそのまま貼り付けてください。**

`pubkey` にはリレー運営者自身のNostr公開鍵（hex形式）を記載します。これは運用主体の識別であり、Canonical Event の semantic identity とは別です。まだ鍵ペアを持っていない場合は `nak` で生成してください。

```bash
# 鍵ペアを生成（一度だけ実行。秘密鍵は厳重に保管すること）
SECRET=$(nak key generate)
echo "nsec: $(echo $SECRET | nak encode nsec)"
echo "npub: $(echo $SECRET | nak key public | nak encode npub)"

# 出力例:
# nsec: nsec1abc...  ← 秘密鍵（絶対に他人に見せない）
# npub: npub1xyz...  ← 公開鍵

# npub を settings.yaml に記載できるhex形式に変換
nak decode npub1xyz...
```

変換されたhex文字列を `pubkey:` に記載したうえで、以下の全文を貼り付けてください。

```yaml
info:
  relay_url: wss://relay.your-domain.com
  name: your-domain.com
  description: Dedicated relay for Toitoi Canonical Event projections. Nostr kind 1042 inquiry events are accepted as transport input.
  banner: https://your-domain.com/logo.png
  icon: https://your-domain.com/logo.png
  pubkey: （nak decode で得たhex形式の公開鍵）
  contact: mailto:admin@your-domain.com
  terms_of_service: https://github.com/nkkmd/Toitoi/
payments:
  enabled: false
nip05:
  mode: disabled
nip45:
  enabled: true
network:
  maxPayloadSize: 524288
  trustedProxies:
    - "127.0.0.1"
    - "::ffff:127.0.0.1"
    - "::1"
workers:
  count: 0
limits:
  rateLimiter:
    strategy: ewma
  connection:
    rateLimits:
      - period: 1000
        rate: 12
      - period: 60000
        rate: 48
    ipWhitelist:
      - "::1"
  event:
    retention:
      maxDays: -1
      kind:
        whitelist: []
      pubkey:
        whitelist: []
    eventId:
      minLeadingZeroBits: 0
    kind:
      whitelist:
        - 1042
      blacklist: []
    pubkey:
      minBalance: 0
      minLeadingZeroBits: 0
      whitelist: []
      blacklist: []
    createdAt:
      maxPositiveDelta: 900
      maxNegativeDelta: 31536000
    content:
      - description: 20 KB limit for Kind 1042 (agroecology inquiry)
        maxLength: 20480
        kinds:
          - - 1042
            - 1042
    rateLimits:
      - description: 60 events/min for all events
        period: 60000
        rate: 60
    whitelists:
      pubkeys: []
      ipAddresses:
        - "::1"
  client:
    subscription:
      maxSubscriptions: 10
      maxFilters: 10
      maxFilterValues: 2500
      maxSubscriptionIdLength: 256
      maxLimit: 5000
      minPrefixLength: 4
  message:
    rateLimits:
      - description: 240 raw messages/min
        period: 60000
        rate: 240
    ipWhitelist:
      - "::1"
```

**各設定項目の意図（参考）：**

| セクション | 設定値 | 意図 |
|---|---|---|
| `payments.enabled` | `false` | 投稿に課金しない。コモンズとして完全オープンに運用する |
| `nip05.mode` | `disabled` | NIP-05（ドメイン認証）を要求しない。参加障壁をゼロにする |
| `nip45.enabled` | `true` | COUNTクエリを許可。インデクサーAPIからの件数取得に使用 |
| `workers.count` | `0` | CPUコア数に応じて自動決定（1vCPU環境では実質1ワーカー） |
| `kind.whitelist` | `[1042]` | Canonical Event projection の transport input を Kind 1042 に限定する |
| `retention.maxDays` | `-1` | raw event を永続保存し、後段の再 canonicalize を可能にする |
| `retention.kind.whitelist` | `[]` | 保存対象kindの追加制限なし（kind.whitelistで制御済み） |
| `createdAt.maxNegativeDelta` | `31536000` | 1年前までの過去イベントを受け付ける。アーカイブ復元時に必要 |
| `content.maxLength` | `20480` | Canonical Event の body を運ぶ transport content の上限を抑える |
| `trustedProxies` | ループバックのみ | docker-compose.ymlで固定IP設定を削除済みのため`10.10.10.x`系は不要 |

編集が終わったら `Ctrl + O` → `Enter` で保存し、`Ctrl + X` で閉じます。その後、設定を反映するためにnostreamを再起動します。

```bash
sudo docker compose restart nostream
```

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

あなたの構築したリレーが、Canonical Event projection の transport 入口として正しく機能しているかテストします。

### ブラウザでの確認 (NIP-11)
ブラウザを開き、`https://relay.your-domain.com` にアクセスしてください。

リレー情報のJSONが表示されれば成功です。（Nostream v2.1.1ではブラウザからのアクセスに対してJSONを返します。これは正常な動作です。）

### WebSocket接続とフィルタリングのテスト
Nostrの接続確認ツールを使用して、WebSocket（`wss://`）が機能しているか、そして**Canonical Event projection として想定した Kind 1042 以外が弾かれるか**を確認します。

ここではシンプルな接続テストを紹介します。より高度な検証やスキーマ準拠テストについては、`infra/transports/nostr/test_relay.js` を参照してください。

`test_relay.js` は、現行の Nostr Inquiry Schema（kind 1042 / `context` / `relationship` / `phase` / `trigger` / `e` / `dsl:*`）に合わせて組んであります。  
特に `e` は 4 要素の lineage タグとして扱い、`dsl:*` は optional の補助 projection として確認します。

最小の現行 schema 例としては、`trigger` を含めて次の形で送れます。

```javascript
const validEvent = finalizeEvent({
    kind: 1042,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
        ["t", "agroecology"],
        ["context", "climate_zone", "warm-temperate"],
        ["relationship", "microclimate", "weed_flora"],
        ["phase", "intermediate"],
        ["trigger", "farmer_observation", "weed_change"]
    ],
    content: "農家の観察がきっかけで、微気候と雑草相の違いを考えた。"
}, sk);
```

手元のPC（またはサーバー上）で以下のNode.jsスクリプトを実行してみてください。
（※ `wss://relay.your-domain.com` をあなたのドメインに変更してください）

```javascript
// test_relay.js
const { generateSecretKey, finalizeEvent, Relay } = require('nostr-tools');
const WebSocket = require('ws');
global.WebSocket = WebSocket;

async function test() {
    const relay = await Relay.connect('wss://relay.your-domain.com');
    console.log(`✅ リレーに接続成功`);

    const sk = generateSecretKey();

    // テスト1: 許可されている inquiry transport event (Kind 1042)
    const validEvent = finalizeEvent({
        kind: 1042,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["t", "agroecology"], ["context", "test"]],
        content: "テストの問いです"
    }, sk);

    try {
        await relay.publish(validEvent);
        console.log(`🟢 Kind 1042 の transport input 送信に成功しました！`);
    } catch (e) {
        console.error(`🔴 失敗:`, e);
    }

    // テスト2: 許可されていない普通のSNS投稿 (Kind 1)
    const invalidEvent = finalizeEvent({
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags:[],
        content: "おはよう！これは弾かれるべき普通の投稿です。"
    }, sk);

    try {
        await relay.publish(invalidEvent);
        console.log(`🔴 失敗: Kind 1 が送信できてしまいました（transport filter の設定ミス）`);
    } catch (e) {
        console.log(`🟢 成功: Kind 1 の送信が正しく拒否されました！（スパム防御機能が作動）: ${e}`);
    }

    relay.close();
}
test();
```

---

## 5. 運用と保守（データ・コモンズを守るために）

リレーの運営者としての作業はほぼゼロですが、raw event と Canonical Event の再構築可能性を守るため、バックアップは重要です。

### データのバックアップ（PostgreSQL）
蓄積された raw event は、canonicalization ルール変更後の再処理に必要な地域の財産です。定期的に以下のコマンドでDBのダンプ（バックアップ）を取ることをお勧めします。

```bash
cd nostream
sudo docker exec -t nostream-db-1 pg_dumpall -c -U nostr_ts_relay > dump_`date +%Y-%m-%d`.sql
```
*(※ユーザー名等の環境によってエラーが出る場合は、適宜確認してください)*

### 保存データの確認（nak req）

リレーに蓄積された transport event を `nak req` コマンドで確認します。ここで見ているのは Canonical Event の元になる raw projection です。

```bash
# 全件取得（Ctrl+C で停止）
nak req -k 1042 wss://relay.your-domain.com

# 件数だけ確認（NIP-45 COUNT）
nak count -k 1042 wss://relay.your-domain.com

# jqで整形して読む
nak req -k 1042 wss://relay.your-domain.com | jq .

# contentだけ抜き出す
nak req -k 1042 wss://relay.your-domain.com | jq -r .content

# 新しい順に10件だけ
nak req -k 1042 --limit 10 wss://relay.your-domain.com | jq .

# 今日以降に絞る
nak req -k 1042 --since $(date -d "today 00:00" +%s) wss://relay.your-domain.com | jq .
```

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
> PostgreSQLのダンプはリレーを復元するためのものです。一方、**JSONLアーカイブ**は Nostr transport event をプロトコル中立なテキスト形式で保存します。Nostr のイベントは署名済み自己完結データなので、この JSONL ファイルさえあれば、リレーソフトウェアが変わっても、VPSが廃止されても、再投入して Canonical Event を再構築できます。Gitで管理することで、raw event と projection の履歴が**改ざん不可能な形**で残ります。

---

### Step 6.1: `nak` のインストール確認

`nak` は [PREREQUISITE_INSTALLATION.md](./PREREQUISITE_INSTALLATION.md) でインストール済みです。念のため動作を確認してください。

```bash
nak --version
```

インストールされていない場合は以下を実行してください。

```bash
sudo curl -L https://github.com/fiatjaf/nak/releases/latest/download/nak-linux-amd64 -o /usr/local/bin/nak
sudo chmod +x /usr/local/bin/nak
```

---

### Step 6.2: Transport archive の初期化

transport archive は、`nak req -k 1042` でリレーから直接回収した raw transport event を Git で保全する層です。`packages/nostr/storage` とは別管理にします。

```bash
mkdir -p ~/nostr-archive/agroecology-commons
cd ~/nostr-archive/agroecology-commons

git init
echo "*.tmp" > .gitignore
echo ".DS_Store" >> .gitignore
git add .gitignore
git commit -m "init: Initialize Agroecology Commons archive repository"
```

※ Git のユーザー名・メールアドレスは [PREREQUISITE_INSTALLATION.md](./PREREQUISITE_INSTALLATION.md) の Step 3 でグローバル設定済みのため、ここでの設定は不要です。

### Step 6.3: Canonical スクリプトを配置

このリポジトリには、transport archive 用の実ファイル版スクリプトを `scripts/nostr/` に置いてあります。

```bash
cp scripts/nostr/archive_diff.sh ~/nostr-archive/archive_diff.sh
cp scripts/nostr/split_archive.sh ~/nostr-archive/split_archive.sh
chmod +x ~/nostr-archive/archive_diff.sh ~/nostr-archive/split_archive.sh
```

`archive_diff.sh` は差分追記と重複排除を担当し、`split_archive.sh` は `inquiry.jsonl` を年別ファイルへ分割する補助です。どちらも `inquiry` 命名を前提にしています。

### Step 6.4: 初回の transport archive

最初の 1 回は、リレーの現在状態を `inquiry.jsonl` に保存します。

```bash
cd ~/nostr-archive/agroecology-commons
nak req -k 1042 wss://relay.your-domain.com > inquiry.jsonl
wc -l inquiry.jsonl
git add inquiry.jsonl
git commit -m "archive: initial inquiry snapshot ($(wc -l < inquiry.jsonl) entries)"
```

### Step 6.5: 差分アーカイブを自動化

以後は `archive_diff.sh` で新規分だけを追記します。

```bash
~/nostr-archive/archive_diff.sh
```

cron で毎日 03:00 に回すなら、対象ユーザーの `crontab -e` を開いて、次の行を追記します。標準出力と標準エラーを `archive_diff.log` に残しておくと、失敗時の確認がしやすくなります。

```cron
0 3 * * * /bin/bash $HOME/nostr-archive/archive_diff.sh >> $HOME/nostr-archive/archive_diff.log 2>&1
```

### Step 6.6: リモートリポジトリへの push

Git リポジトリをリモートにも push すると、VPS 障害時の最終防衛ラインになります。
この手順は `PREREQUISITE_INSTALLATION.md` で準備した SSH 鍵による GitHub 認証を前提にしています。

```bash
cd ~/nostr-archive/agroecology-commons
git remote add origin git@github.com:your-username/agroecology-commons-archive.git
git push -u origin main
```

以後の push も自動化する場合は、Step 6.5 の cron を次のようにして、差分アーカイブの完了後に push します。

```cron
0 3 * * * /bin/bash $HOME/nostr-archive/archive_diff.sh && git -C $HOME/nostr-archive/agroecology-commons push origin main >> $HOME/nostr-archive/archive_diff.log 2>&1
```

`archive_diff.sh` は新規イベントがあれば `git add` と `git commit` まで行います。上記は SSH 鍵による GitHub 認証が、cron を実行するユーザーで利用できることを前提とします。

### Step 6.7: transport archive からの復元

transport archive は raw transport event の再投入に使います。`packages/nostr/storage` の復旧とは切り離して考えてください。

```bash
cat ~/nostr-archive/agroecology-commons/inquiry*.jsonl | nak event wss://new-relay.your-domain.com
```

### Step 6.8: 年別分割

`inquiry.jsonl` が大きくなったら、`split_archive.sh` で年別ファイルに分けます。

```bash
~/nostr-archive/split_archive.sh
ls -lh ~/nostr-archive/agroecology-commons/inquiry_*.jsonl
```

分割後の復元は、ワイルドカードで年順に連結すれば同じです。

```bash
cat ~/nostr-archive/agroecology-commons/inquiry_*.jsonl | nak event wss://new-relay.your-domain.com
```

---

## 7. storage backup / restore

`packages/nostr/storage` の storage backup は、transport archive とは独立した canonicalized event 復旧用の層です。こちらは [NOSTR_STORAGE_AND_REPLAY.md](../../docs/operations/NOSTR_STORAGE_AND_REPLAY.md) を正規手順として使います。

最小限の流れだけ書くと、次のとおりです。

```bash
tar -czf toitoi-storage-backup-$(date +%Y%m%d-%H%M%S).tgz -C /path/to/storage .
pnpm --filter @toitoi/nostr replay -- --protocol nostr --storage-dir /path/to/storage --verify
```

`pnpm` の `--` 区切りは replay CLI 側で無視されるので、この書き方で使えます。

transport archive は「再投入できる raw transport event の履歴」、storage backup は「canonicalized event / provenance / rawRef / index snapshot の復旧」に使います。役割を混ぜないのが大事です。

---

## 関連リンク

- 運用の入口一覧: [README.md](../../../README.md)
- ディレクトリ責務: [DIRECTORY_BOUNDARIES.md](../../../docs/architecture/DIRECTORY_BOUNDARIES.md)
- 事前準備の詳細: [PREREQUISITE_INSTALLATION.md](./PREREQUISITE_INSTALLATION.md)
- 監視設定: [MONITOR_SETUP.md](./MONITOR_SETUP.md)
- バックアップと復元: [NOSTR_STORAGE_AND_REPLAY.md](../../docs/operations/NOSTR_STORAGE_AND_REPLAY.md)
- 初回立ち上げのやり直し: [CLEAN_START.md](./CLEAN_START.md)
- リレー取り込みワーカー: [relay_ingest_worker.js](./relay_ingest_worker.js)（adapter / normalizer を通して canonicalized event 化する入口）
