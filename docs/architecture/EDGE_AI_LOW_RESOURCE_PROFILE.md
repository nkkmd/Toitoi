# Toitoi Edge AI Low-Resource Profile

**Version: 0.1.5** | **Status: evolving** | **Last updated: 2026-06-02**

この文書は、`RAM 4GB / Ubuntu 24.04 LTS` のエッジ端末で Toitoi の AI 要約・タグ付けを安定運用するための**参考用の最小構成例**です。

目的は、イベントを先に保存し、AI は後段の非同期処理として扱う設計を示すことです。  
この構成は**推奨例**であり、Toitoi の Edge AI は各実装者が別の構成で設計しても構いません。

---

## 1. 目的

```text
Canonical Event
  ↓
要約
タグ
  ↓
SQLite 保存
```

初期段階では次を導入しません。

- chat UI
- RAG
- vector DB
- embedding
- 問い生成

AI は「保存済みイベントを後から知識化する補助機能」として扱います。

---

## 2. 採用方針

### 採用するもの

- Ubuntu 24.04 LTS
- Node.js
- SQLite
- `llama-server`
- 小型の量子化モデル

### 採用しないもの

- 同期的な AI 処理
- イベント受信の中での推論完結
- ベクトル検索前提の設計
- 重い常駐ワーカーの多重起動

---

## 3. 推奨パイプライン

```text
Event 受信
  ↓
events 保存
  ↓
ai_queue へ投入
  ↓
llama-server へ非同期送信
  ↓
summary / tags 生成
  ↓
ai_annotations 保存
```

重要なのは、AI をイベント受信経路の前段に置かないことです。

---

## 4. モデル選定

現時点の第一候補は `Qwen3 1.7B` の `Q4_K_M` です。

採用理由:

- 日本語性能が比較的高い
- 4GB RAM でも扱いやすいサイズ帯
- 要約と分類の用途に寄せやすい

運用上の注意:

- 重みサイズだけでなく KV cache が効く
- `ctx` を大きくしすぎない
- 並列度を上げすぎない

### 推奨初期値

- `ctx`: `1024` から開始
- `parallel`: `1`
- `temperature`: 低め
- 出力形式: JSON 固定

---

## 5. SQLite 設計

最小構成は `events`, `ai_queue`, `ai_annotations` の 3 テーブルです。

### `events`

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### `ai_queue`

```sql
CREATE TABLE ai_queue (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  next_attempt_at TEXT,
  last_error TEXT
);
```

### `ai_annotations`

```sql
CREATE TABLE ai_annotations (
  event_id INTEGER PRIMARY KEY,
  summary TEXT NOT NULL,
  tags TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT,
  raw_output TEXT,
  created_at TEXT NOT NULL
);
```

### 設計上の注意

- `events` への保存と `ai_queue` への投入は同一トランザクションで行う
- `ai_annotations.event_id` は `UNIQUE` または `PRIMARY KEY` にする
- 再処理のために `raw_output` を残す
- 失敗時のために `last_error` を残す

---

## 6. ローカル推論サーバー

`llama-server` は、ローカルで OpenAI 互換 API を提供する推論サーバーとして使います。

起動コマンド例:

```bash
./build/bin/llama-server \
  -m ~/models/Qwen3-1.7B-Q4_K_M.gguf \
  -c 1024 \
  -np 1 \
  --host 127.0.0.1 \
  --port 8080
```

### 応答フォーマット

要約とタグ付けの応答は JSON 固定にします。

```json
{
  "summary": "",
  "tags": []
}
```

Node.js 側では、API 応答を受け取ったあとに必ず JSON パースとスキーマ検証を行います。

---

## 7. リトライ方針

AI の失敗はイベント処理全体の失敗と切り離します。

推奨ルール:

- JSON パース失敗時は `retry_count += 1`
- 最大 3 回まで再試行
- 3 回失敗したら `status = failed`
- 失敗理由は `last_error` に保存する

---

## 8. systemd サービス例

AI サーバーは systemd で単独管理します。  
この例は、`home` 配下に `llama.cpp` とモデルを置く前提で、そのまま編集しやすい形にしています。

```ini
[Unit]
Description=Toitoi Edge AI local inference server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=YOUR_USER
Group=YOUR_USER
WorkingDirectory=/home/YOUR_USER/llama.cpp
ExecStart=/home/YOUR_USER/llama.cpp/build/bin/llama-server \
  -m /home/YOUR_USER/models/Qwen3-1.7B-Q4_K_M.gguf \
  -c 1024 \
  -np 1 \
  --host 127.0.0.1 \
  --port 8080
Restart=on-failure
RestartSec=5
TimeoutStartSec=120
TimeoutStopSec=20
StandardOutput=journal
StandardError=journal
UMask=0077
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

---

## 9. 今後の拡張

Phase 1:

- summary
- tags
- queue/retry

Phase 2:

- SQLite FTS5

Phase 3:

- embedding
- similarity search

Phase 4:

- RAG

---

## 10. 参照

- [AI System Overview](./AI_SYSTEM_OVERVIEW.md)
- [`apps/edge-ai/README.md`](../../apps/edge-ai/README.md)

---

## 11. 運用前提

4GB クラスの端末では、次の前提を守ると安定しやすくなります。

- swap は必須に近い
- `llama-server` は 1 プロセスに絞る
- 同時に複数の AI ワーカーを起動しない
- サーバーは localhost バインドのまま公開しない
- メモリ逼迫時は `ctx` を先に下げる

推奨の確認項目:

- `free -h`
- `swapon --show`
- `systemctl status toitoi-llm`
- `journalctl -u toitoi-llm -f`

---

## 12. 導入手順

ここからは、`Ubuntu 24.04 LTS` の端末に初めて導入する人向けの手順です。  
この章は「とりあえず動く」ことを優先した最小構成です。

### 12.1 前提確認

まず、メモリと swap の状態を確認します。

```bash
free -h
swapon --show
uname -a
lsb_release -a
```

4GB クラスで swap がない場合は、先に 4GB から 8GB ほど確保しておくと安定しやすいです。

### 12.2 必要パッケージの導入

ビルドに必要な最低限のパッケージを入れます。

```bash
sudo apt update
sudo apt install -y \
  git \
  cmake \
  ninja-build \
  build-essential \
  pkg-config \
  curl \
  jq \
  sqlite3
```

Node.js は `nvm` 経由で入れると、他のプロジェクトと衝突しにくいです。  
すでに Node.js が入っている場合でも、この手順に合わせて `corepack` を有効化しておくと楽です。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm alias default 'lts/*'
node --version
corepack enable
corepack pnpm --version
```

`bash` ではなく `zsh` を使っている場合は、`source ~/.zshrc` に読み替えます。  
すでに別の方法で Node.js を入れているなら、少なくとも次が通ることを確認してください。

```bash
node --version
corepack --version
corepack pnpm --version
```

### 12.3 `llama.cpp` の取得とビルド

`llama-server` は `llama.cpp` からビルドします。  
既存の作業ディレクトリを使うなら、ホーム配下に置くのが分かりやすいです。

```bash
mkdir -p ~/src
cd ~/src
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp
cmake -S . -B build -G Ninja
cmake --build build -j 2
```

4GB クラスでは並列数を上げすぎないほうが安全です。  
ビルドが重い場合は `-j 1` に落として構いません。

ビルド後、`llama-server` が作れているか確認します。

```bash
ls -l ./build/bin/llama-server
```

### 12.4 モデルの配置

モデルは別ディレクトリに置きます。

```bash
mkdir -p ~/models
```

`Qwen3 1.7B` の `Q4_K_M` 量子化 GGUF を `~/models/` に保存してください。  
第一候補は `ggml-org/Qwen3-1.7B-GGUF` です。Hugging Face のモデルページには `Qwen3-1.7B-Q4_K_M.gguf` があり、`llama.cpp` 側でも `-hf ggml-org/Qwen3-1.7B-GGUF:Q4_K_M` の形で案内されています。予備候補として `jc-builds/Qwen3-1.7B-Q4_K_M-GGUF` も使えます。

ファイル名はこの文書では次のように扱います。

```text
~/models/Qwen3-1.7B-Q4_K_M.gguf
```

取得方法は 2 通りあります。どちらでも構いません。

1. 直接ダウンロード URL がある場合

```bash
curl -L "https://huggingface.co/ggml-org/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf" \
  -o ~/models/Qwen3-1.7B-Q4_K_M.gguf
```

2. Hugging Face の CLI を使う場合

```bash
python3 -m pip install --user -U huggingface_hub
~/.local/bin/huggingface-cli download ggml-org/Qwen3-1.7B-GGUF \
  Qwen3-1.7B-Q4_K_M.gguf \
  --local-dir ~/models \
  --local-dir-use-symlinks False
```

ダウンロード後に確認します。

```bash
ls -lh ~/models/Qwen3-1.7B-Q4_K_M.gguf
sha256sum ~/models/Qwen3-1.7B-Q4_K_M.gguf
```

### 12.5 単体起動テスト

まずは systemd に入れる前に、手元で 1 回だけ起動します。

```bash
cd ~/src/llama.cpp
./build/bin/llama-server \
  -m ~/models/Qwen3-1.7B-Q4_K_M.gguf \
  -c 1024 \
  -np 1 \
  --host 127.0.0.1 \
  --port 8080
```

別ターミナルで疎通を確認します。

```bash
curl http://127.0.0.1:8080/health
```

もし OpenAI 互換の `chat/completions` を叩くなら、最小例は次の通りです。

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "Qwen3-1.7B-Q4_K_M",
    "messages": [
      { "role": "system", "content": "Return JSON only." },
      { "role": "user", "content": "要約してください。" }
    ],
    "temperature": 0.2,
    "stream": false
  }'
```

### 12.6 SQLite 初期化

アプリ側で DB を作る想定ですが、初回導入時は手で形を作っておくと分かりやすいです。

```bash
mkdir -p ~/toitoi-data
sqlite3 ~/toitoi-data/edge-ai.db <<'SQL'
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_queue (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  next_attempt_at TEXT,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS ai_annotations (
  event_id INTEGER PRIMARY KEY,
  summary TEXT NOT NULL,
  tags TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT,
  raw_output TEXT,
  created_at TEXT NOT NULL
);
SQL
```

作成後はテーブル一覧を見ます。

```bash
sqlite3 ~/toitoi-data/edge-ai.db '.tables'
```

### 12.7 systemd サービスの登録

`toitoi-llm` というサービス名で管理する完成例です。  
`YOUR_USER` は自分のユーザー名に置き換えます。  
このファイルは `/etc/systemd/system/toitoi-llm.service` に置きます。

```bash
sudo tee /etc/systemd/system/toitoi-llm.service > /dev/null <<'EOF'
[Unit]
Description=Toitoi Edge AI
After=network.target
Wants=network.target

[Service]
User=YOUR_USER
WorkingDirectory=/home/YOUR_USER/src/llama.cpp
ExecStart=/home/YOUR_USER/src/llama.cpp/build/bin/llama-server \
  -m /home/YOUR_USER/models/Qwen3-1.7B-Q4_K_M.gguf \
  -c 1024 \
  -np 1 \
  --host 127.0.0.1 \
  --port 8080
KillSignal=SIGINT
Restart=always
RestartSec=5
TimeoutStopSec=20
LimitNOFILE=65535
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF
```

反映して起動します。最初の導入では、`enable` と `start` を分けて実行しても構いません。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now toitoi-llm
sudo systemctl is-active toitoi-llm
sudo systemctl status toitoi-llm
```

ログ確認は別ターミナルで行います。

```bash
journalctl -u toitoi-llm -f
```

### 12.8 アプリ側の接続確認

AI サーバーが立ち上がったら、アプリ側から localhost に向けて接続します。  
この段階では、外部公開せず `127.0.0.1:8080` のままで使います。

確認ポイントは次の通りです。

```bash
curl http://127.0.0.1:8080/health
```

```bash
free -h
```

```bash
systemctl status toitoi-llm
```

```bash
journalctl -u toitoi-llm --since "10 minutes ago"
```

Node.js 側のワーカーや API から呼ぶ場合は、環境変数にローカル URL を入れる形にすると扱いやすいです。

```bash
export TOITOI_LLM_BASE_URL=http://127.0.0.1:8080
```

systemd 側で環境変数を持たせたい場合は、次のような別ファイル運用にすると編集しやすくなります。

```bash
sudo install -d /etc/toitoi
sudo tee /etc/toitoi/edge-ai.env > /dev/null <<'EOF'
TOITOI_LLM_BASE_URL=http://127.0.0.1:8080
EOF
```

その場合は service file に `EnvironmentFile=/etc/toitoi/edge-ai.env` を追加してください。

### 12.9 導入後の確認手順

導入直後は、まず次の順で確認します。

1. `llama-server` が起動している
1. `curl http://127.0.0.1:8080/health` が返る
1. `sqlite3 ~/toitoi-data/edge-ai.db '.tables'` でテーブルが見える
1. `journalctl -u toitoi-llm -f` で再起動ループが起きていない

もし不安定なら、最初に下げるのは次です。

- `-c 1024` を `-c 768` に下げる
- `RestartSec` を少し伸ばす
- `parallel` を 1 のまま固定する
- swap を増やす

### 12.10 Node.js 側の最小接続例

Node.js 18 以降なら、`fetch` でそのまま接続できます。まずは health check から始めるのが扱いやすいです。

```bash
TOITOI_LLM_BASE_URL=http://127.0.0.1:8080 node --input-type=module <<'EOF'
const baseUrl = process.env.TOITOI_LLM_BASE_URL ?? 'http://127.0.0.1:8080';
const healthRes = await fetch(new URL('/health', baseUrl));
console.log(await healthRes.text());
EOF
```

要約とタグ付けを投げる最小例は次の通りです。

```bash
TOITOI_LLM_BASE_URL=http://127.0.0.1:8080 node --input-type=module <<'EOF'
const baseUrl = process.env.TOITOI_LLM_BASE_URL ?? 'http://127.0.0.1:8080';
const res = await fetch(new URL('/v1/chat/completions', baseUrl), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'Qwen3-1.7B-Q4_K_M',
    messages: [
      { role: 'system', content: 'Return JSON only.' },
      { role: 'user', content: '要約してください。' }
    ],
    temperature: 0.2,
    stream: false
  })
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
EOF
```

---

## 13. つまずきやすい点

- モデルの置き場所と `ExecStart` のパスが一致していない
- `llama-server` の実行権限がない
- `ctx` を上げすぎて OOM になる
- systemd で `User` のホームディレクトリが違う
- 既に同じポートで別プロセスが起動している

まずは次を見れば原因を切り分けやすいです。

```bash
systemctl status toitoi-llm
journalctl -u toitoi-llm -xe
ss -ltnp | grep 8080
```
