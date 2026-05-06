# 運用ガイド：サーバー負荷監視・自動回復システムの導入
**バージョン：0.1.0**　｜　初版

本ドキュメントは、「デジタル・アグロエコロジー・コモンズ」の専用リレーサーバーに、**負荷監視と自動回復の仕組み**を導入するための手順書です。

このシステムは、Toitoiサーバー固有の構成（Nostream / PostgreSQL / Redis / PM2 / Caddy）を熟知した上で設計されており、**各サービスの性質に応じた最適な回復手段**を自動的に選択します。高負荷を検知した場合でも、データベースには原則として触れず、PM2プロセスの無停止リロードを優先することで、「問いの系譜」の損失リスクを最小化します。

---

## 1. システム概要

### 監視対象

| サービス | 種別 | 役割 |
|---|---|---|
| `toitoi-worker` | PM2 | リレーからKind 1042を定期収集しDBに保存 |
| `toitoi-api` | PM2 | REST APIサーバー（ポート3000） |
| `nostream` | Docker | Nostrリレーエンジン（ポート8008） |
| `nostream-db` | Docker | PostgreSQL（リレーDB・ToitoiDB共有） |
| `nostream-cache` | Docker | Redis（Nostreamキャッシュ） |
| `caddy` | systemd | リバースプロキシ・SSL終端 |

### 回復ロジックの原則

> **なぜDBには高負荷だけでは触れないのか？**
>
> `toitoi-worker` はプロセス起動直後に全件同期を実行するため、初回起動時やアーカイブ復元時にCPU・メモリが閾値を一時的に超えることがあります。この「正常な高負荷」に対してDockerコンテナを再起動すると、PostgreSQLのトランザクションが中断され、データが破損するリスクがあります。そのため、**高負荷への対処はPM2プロセスのreloadのみ**に限定し、Dockerコンテナは「停止を検知した場合のみ」再起動します。

```text
【監視サイクル（60秒ごと）】

  ① ヘルスチェック（毎サイクル・負荷に関わらず常時実施）
       │
       ├─ PM2プロセスの状態が online でない → pm2 reload → 失敗なら pm2 restart
       ├─ /health エンドポイントが応答しない → toitoi-api を pm2 reload
       ├─ ポート8008 が応答しない → nostream コンテナを docker restart
       ├─ nostream-db が停止 → コンテナ restart → 10秒後にPM2も再起動
       ├─ nostream-cache が停止 → コンテナ restart
       └─ caddy が停止 → systemctl restart caddy
       │
       ↓ すべて正常
  ② 高負荷チェック（vmstat 3回平均）
       │
       ├─ CPU > 85% または MEM > 90%
       │    └─ toitoi-worker を pm2 reload → toitoi-api を pm2 reload
       │
       └─ 正常 → 60秒待機して①へ
```

---

## 2. 前提条件

- [NOSTR_RELAY_SETUP.md](./NOSTR_RELAY_SETUP.md) に従い、Nostreamリレーの構築が完了していること。
- [INDEXER_API_SETUP.md](./INDEXER_API_SETUP.md) に従い、ToitoiインデクサーAPIのPM2起動が完了していること。
- `python3` がインストールされていること（PM2プロセス状態の取得に使用）。

---

## 3. 導入ステップ

### Step 3.1: 監視スクリプト（load-monitor.sh）の作成

以下のコマンドでスクリプトファイルを作成します。

```bash
sudo nano /usr/local/bin/toitoi-monitor.sh
```

**ファイルの内容をすべて削除し、以下の全文をそのまま貼り付けてください。**

```bash
#!/bin/bash
# =====================================================
# Toitoi サーバー専用 負荷監視・自動回復スクリプト
# 対象構成:
#   - Caddy          (systemd: caddy.service)
#   - Nostream       (Docker:  nostream)
#   - nostream-db    (Docker:  nostream-db)        ← PostgreSQL共有DB
#   - nostream-cache (Docker:  nostream-cache)     ← Redis
#   - toitoi-api     (PM2)
#   - toitoi-worker  (PM2)
# =====================================================

# ── 設定値 ──────────────────────────────────────────
CPU_THRESHOLD=85      # CPU使用率の閾値（%）: vmstat 3回平均
MEM_THRESHOLD=90      # メモリ使用率の閾値（%）
CHECK_INTERVAL=60     # 通常監視の間隔（秒）
COOLDOWN=300          # 対処後のクールダウン（秒）: 5分

# ヘルスチェック設定
API_HEALTH_URL="http://127.0.0.1:3000/health"
RELAY_HOST="127.0.0.1"
RELAY_PORT=8008
HEALTH_TIMEOUT=5      # ヘルスチェックのタイムアウト（秒）

# ログ
LOG_TAG="toitoi-monitor"
# ────────────────────────────────────────────────────

log() {
    local level="$1"
    local msg="$2"
    local line="$(date '+%Y-%m-%d %H:%M:%S') [$level] $msg"
    logger -t "$LOG_TAG" "[$level] $msg"
    echo "$line"
}

# ── CPU・メモリ使用率の取得 ──────────────────────────
# top の1ショットより正確な vmstat 3回平均を使用
get_cpu_usage() {
    vmstat 1 3 | tail -1 | awk '{print 100 - $15}'
}

get_mem_usage() {
    free | awk '/^Mem:/ {printf "%d", ($3/$2)*100}'
}

# ── 閾値チェック ─────────────────────────────────────
check_load() {
    local cpu
    local mem
    cpu=$(get_cpu_usage)
    mem=$(get_mem_usage)
    log "INFO" "CPU: ${cpu}%  MEM: ${mem}%"

    if [ "$cpu" -gt "$CPU_THRESHOLD" ] || [ "$mem" -gt "$MEM_THRESHOLD" ]; then
        log "WARN" "高負荷を検知 — CPU: ${cpu}%（閾値: ${CPU_THRESHOLD}%）/ MEM: ${mem}%（閾値: ${MEM_THRESHOLD}%）"
        return 0   # 閾値超過
    fi
    return 1       # 正常
}

# ── ヘルスチェック ───────────────────────────────────

# PM2プロセスの状態確認（online / stopped / errored）
pm2_status() {
    local name="$1"
    pm2 jlist 2>/dev/null | \
        python3 -c "
import sys, json
procs = json.load(sys.stdin)
for p in procs:
    if p.get('name') == '$name':
        print(p.get('pm2_env', {}).get('status', 'unknown'))
        sys.exit(0)
print('not_found')
" 2>/dev/null || echo "error"
}

# HTTPヘルスチェック（toitoi-api の /health エンドポイント）
check_api_health() {
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time "$HEALTH_TIMEOUT" "$API_HEALTH_URL" 2>/dev/null)
    [ "$code" = "200" ]
}

# TCPポート疎通確認（Nostream リレー ポート8008）
check_relay_port() {
    timeout "$HEALTH_TIMEOUT" bash -c \
        "echo >/dev/tcp/${RELAY_HOST}/${RELAY_PORT}" 2>/dev/null
}

# Dockerコンテナの稼働確認
check_docker_container() {
    local name="$1"
    local status
    status=$(docker inspect --format '{{.State.Status}}' "$name" 2>/dev/null)
    [ "$status" = "running" ]
}

# ── 個別回復処理 ─────────────────────────────────────

# PM2プロセス回復: reload（ゼロダウンタイム） → 失敗なら restart
recover_pm2() {
    local name="$1"
    log "WARN" "[PM2] ${name} を reload します"
    if ! pm2 reload "$name" 2>&1 | logger -t "$LOG_TAG"; then
        log "WARN" "[PM2] reload 失敗。restart にフォールバック: ${name}"
        pm2 restart "$name" 2>&1 | logger -t "$LOG_TAG"
    fi
}

# Caddy回復: reload（設定ファイル再読み込み） → 失敗なら restart
recover_caddy() {
    log "WARN" "[Caddy] 設定をリロードします"
    if ! sudo systemctl reload caddy 2>&1 | logger -t "$LOG_TAG"; then
        log "WARN" "[Caddy] reload 失敗。restart にフォールバック"
        sudo systemctl restart caddy 2>&1 | logger -t "$LOG_TAG"
    fi
}

# Dockerコンテナ回復: docker compose restart
recover_docker_container() {
    local name="$1"
    log "WARN" "[Docker] コンテナ ${name} を restart します"
    (cd ~/nostream && sudo docker compose restart "$name") 2>&1 | logger -t "$LOG_TAG"
}

# ── 高負荷時の対処ロジック ───────────────────────────
# 高負荷が検知された場合、PM2プロセスのreloadのみを行う。
# DBやDockerには原則触れない（データ整合性保護）。
handle_high_load() {
    log "WARN" "=== 高負荷対処を開始します ==="

    # workerを先にreload（最も負荷の原因になりやすい）
    recover_pm2 "toitoi-worker"
    sleep 5

    # apiも念のためreload
    recover_pm2 "toitoi-api"

    log "INFO" "=== 高負荷対処完了。${COOLDOWN}秒クールダウン ==="
}

# ── 各サービスのヘルス確認と回復 ────────────────────
check_and_recover_services() {
    local recovered=false

    # 1. toitoi-worker の状態確認
    local worker_status
    worker_status=$(pm2_status "toitoi-worker")
    if [ "$worker_status" != "online" ]; then
        log "ERROR" "[PM2] toitoi-worker が異常 (status: ${worker_status})。回復を試みます"
        recover_pm2 "toitoi-worker"
        recovered=true
    fi

    # 2. toitoi-api の状態確認（PM2 + HTTPエンドポイント）
    local api_status
    api_status=$(pm2_status "toitoi-api")
    if [ "$api_status" != "online" ]; then
        log "ERROR" "[PM2] toitoi-api が異常 (status: ${api_status})。回復を試みます"
        recover_pm2 "toitoi-api"
        recovered=true
    elif ! check_api_health; then
        log "ERROR" "[API] /health が応答しません。toitoi-api を reload します"
        recover_pm2 "toitoi-api"
        recovered=true
    fi

    # 3. Nostream リレーのTCP疎通確認
    if ! check_relay_port; then
        log "ERROR" "[Relay] ポート${RELAY_PORT}が応答しません。Nostreamコンテナを確認します"
        if ! check_docker_container "nostream"; then
            log "ERROR" "[Docker] nostream コンテナが停止しています。restart します"
            recover_docker_container "nostream"
            recovered=true
        fi
    fi

    # 4. PostgreSQL（共有DB）の死活確認
    #    nostream-db が停止するとリレー・APIの両方が機能不全になる
    if ! check_docker_container "nostream-db"; then
        log "ERROR" "[Docker] nostream-db（PostgreSQL）が停止しています！restart します"
        recover_docker_container "nostream-db"
        # DBが戻ったらworker/apiも再起動して接続をリセット
        sleep 10
        recover_pm2 "toitoi-worker"
        recover_pm2 "toitoi-api"
        recovered=true
    fi

    # 5. Redis（nostream-cache）の確認
    if ! check_docker_container "nostream-cache"; then
        log "ERROR" "[Docker] nostream-cache（Redis）が停止しています。restart します"
        recover_docker_container "nostream-cache"
        recovered=true
    fi

    # 6. Caddy の確認
    if ! systemctl is-active --quiet caddy; then
        log "ERROR" "[Caddy] が停止しています。restart します"
        recover_caddy
        recovered=true
    fi

    $recovered
}

# ── メインループ ─────────────────────────────────────
log "INFO" "============================================"
log "INFO" " Toitoi 監視スクリプト 起動"
log "INFO" " CPU閾値: ${CPU_THRESHOLD}%  MEM閾値: ${MEM_THRESHOLD}%"
log "INFO" " チェック間隔: ${CHECK_INTERVAL}s  クールダウン: ${COOLDOWN}s"
log "INFO" "============================================"

while true; do

    # ① 常時ヘルスチェック（負荷に関わらず毎サイクル実施）
    if check_and_recover_services; then
        log "INFO" "サービス回復アクションを実行しました。${COOLDOWN}秒待機"
        sleep "$COOLDOWN"
        continue
    fi

    # ② 高負荷チェック
    if check_load; then
        handle_high_load
        sleep "$COOLDOWN"
        continue
    fi

    sleep "$CHECK_INTERVAL"
done
```

*`Ctrl + O` → `Enter` で保存し、`Ctrl + X` で閉じます。*

```bash
# 実行権限を付与
sudo chmod +x /usr/local/bin/toitoi-monitor.sh
```

---

### Step 3.2: systemdサービスファイルの作成

監視スクリプトをデーモンとして常時稼働させるためのサービスファイルを作成します。

```bash
sudo nano /etc/systemd/system/toitoi-monitor.service
```

**ファイルの内容をすべて削除し、以下の全文をそのまま貼り付けてください。**

```ini
[Unit]
Description=Toitoi Server Monitor — Load & Health Watchdog
After=network.target caddy.service docker.service

[Service]
Type=simple
ExecStart=/usr/local/bin/toitoi-monitor.sh
Restart=always
RestartSec=60
User=<your-username>
StandardOutput=journal
StandardError=journal
SyslogIdentifier=toitoi-monitor

[Install]
WantedBy=multi-user.target
```

*`Ctrl + O` → `Enter` で保存し、`Ctrl + X` で閉じます。*

---

### Step 3.3: サービスの有効化と起動

```bash
# systemdに新しいサービスファイルを認識させる
sudo systemctl daemon-reload

# OS起動時に自動起動するよう登録
sudo systemctl enable toitoi-monitor

# 監視を開始
sudo systemctl start toitoi-monitor
```

---

### Step 3.4: sudo権限の設定（NOPASSWD）

スクリプト内で `docker compose` や `systemctl` コマンドが `sudo` 経由で実行されます。パスワード入力のプロンプトが出ないよう、sudoers ファイルを設定します。

**ユーザーが `<your-username>` の場合：**

```bash
sudo visudo -f /etc/sudoers.d/toitoi-monitor
```

以下の行を追加します。`<your-username>` をあなたの実際のユーザー名に置き換えてください。

```sudoers
# Toitoi Monitor: PM2, Docker, Caddy の操作をパスワード不要で実行可能にする
<your-username> ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /bin/systemctl, /usr/bin/systemctl, /bin/chown
```

*`Ctrl + O` → `Enter` で保存し、`Ctrl + X` で閉じます。*

設定を確認します。

```bash
sudo -l | grep docker
```

以下のように表示されていれば成功です（`(ALL)` は「全ユーザーとして実行可能」を意味します）。

```
    (ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /bin/systemctl, /usr/bin/systemctl, /bin/chown
```

**出力にこの行が含まれていれば、sudoers 設定は正しく機能しています。**

---

## 4. 動作確認

### サービスの状態確認

```bash
sudo systemctl status toitoi-monitor
```

以下のように `active (running)` と表示されていれば起動成功です。

```
● toitoi-monitor.service - Toitoi Server Monitor — Load & Health Watchdog
     Loaded: loaded (/etc/systemd/system/toitoi-monitor.service; enabled)
     Active: active (running) since ...
```

### ログのリアルタイム確認

```bash
sudo journalctl -u toitoi-monitor -f
```

正常稼働中は以下のようなINFOログが60秒ごとに記録されます。（確認後 `Ctrl + C` で抜けてください）

```
2026-05-03 03:12:00 [INFO]  CPU: 12%  MEM: 45%
2026-05-03 03:13:00 [INFO]  CPU: 14%  MEM: 46%
```

---

## 5. 設定パラメータのカスタマイズ

スクリプト冒頭の設定値を環境に合わせて調整してください。

```bash
sudo nano /usr/local/bin/toitoi-monitor.sh
```

| パラメータ | デフォルト値 | 説明 |
|---|---|---|
| `CPU_THRESHOLD` | `85` | CPU使用率の閾値（%）。1vCPU環境では75程度に下げることも可 |
| `MEM_THRESHOLD` | `90` | メモリ使用率の閾値（%）。RAM 1GBの場合は80程度を推奨 |
| `CHECK_INTERVAL` | `60` | 通常監視の間隔（秒） |
| `COOLDOWN` | `300` | 対処後のクールダウン（秒）。ワーカーの完走を待つため5分を推奨 |
| `HEALTH_TIMEOUT` | `5` | 各ヘルスチェックのタイムアウト（秒） |

設定変更後は再起動してください。

```bash
sudo systemctl restart toitoi-monitor
```

---

## 6. 運用方法

### 6.1 ログの確認

```bash
# 直近1時間のログを確認
sudo journalctl -u toitoi-monitor --since "1 hour ago"

# 異常（ERROR）だけ抽出
sudo journalctl -u toitoi-monitor | grep "\[ERROR\]"

# 対処アクション（WARNとERROR）を抽出
sudo journalctl -u toitoi-monitor | grep -E "\[WARN\]|\[ERROR\]"
```

ログの形式は以下の通りです。

```
2026-05-03 03:14:00 [WARN]  高負荷を検知 — CPU: 87%（閾値: 85%）/ MEM: 62%（閾値: 90%）
2026-05-03 03:14:01 [WARN]  [PM2] toitoi-worker を reload します
2026-05-03 03:14:06 [WARN]  [PM2] toitoi-api を reload します
2026-05-03 03:14:07 [INFO]  高負荷対処完了。300秒クールダウン
```

### 6.2 手動メンテナンス時の停止

リレーの設定変更やDockerコンテナの操作など、手動でサービスを停止・再起動する際は、**監視スクリプトを先に停止**してから作業することを推奨します。監視が稼働したまま作業すると、意図した停止状態が異常と判定され、自動回復が介入する場合があります。

```bash
# メンテナンス前：監視を停止
sudo systemctl stop toitoi-monitor

# （メンテナンス作業）

# メンテナンス後：監視を再開
sudo systemctl start toitoi-monitor
```

### 6.3 サービスの停止・無効化

```bash
# 一時停止（OS再起動後も自動起動は維持）
sudo systemctl stop toitoi-monitor

# 自動起動の解除（サービス定義は残す）
sudo systemctl disable toitoi-monitor
```

---

## 7. 各サービスの回復動作の詳細

### nostream-db が停止した場合

**注意：** `nostream-db`（PostgreSQL）はリレーのイベントデータ（`nostr_ts_relay`）とToitoiのインデクサーデータ（`toitoi_db`）を同一コンテナで共有しています。このコンテナが停止した場合、Nostreamリレーと `toitoi-api` / `toitoi-worker` の両方が機能不全になります。

スクリプトはDBコンテナの再起動後に10秒待機してからPM2プロセスも再起動します。これはPrismaの接続プールが古い接続情報を保持したままにならないようにするためです。

### toitoi-worker の高負荷について

`toitoi-worker` は起動直後にリレーの全件同期を実行するため、初回起動時やアーカイブ復元後はCPUが閾値を一時的に超えることがあります。この場合、スクリプトは `pm2 reload` で対処しますが、workerは `SyncState` テーブルに保存された最終同期タイムスタンプを参照して差分から処理を再開するため、データは失われません。

---

*このガイドはデジタル・アグロエコロジー・コモンズ推進プロジェクトの一環として作成されました。*
*v0.1.0 — 2026年5月*
