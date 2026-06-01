# Toitoi Edge AI Low-Resource Profile

**Version: 0.1.0** | **Status: evolving** | **Last updated: 2026-06-01**

この文書は、`RAM 4GB / Ubuntu 24.04 LTS` のエッジ端末で Toitoi の AI 要約・タグ付けを安定運用するための最小構成を定義します。

目的は、イベントを先に保存し、AI は後段の非同期処理として扱うことです。

---

## 1. 目的

```text
Canonical Event
  ↓
AI summary
AI tags
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

## 6. llama-server

`llama-server` はローカルで OpenAI 互換 API を提供する前提で使います。

推奨起動イメージ:

```bash
./build/bin/llama-server \
  -m ~/models/qwen3-1.7b-q4_k_m.gguf \
  -c 1024 \
  -np 1 \
  --host 127.0.0.1 \
  --port 8080
```

### 出力形式

要約とタグ付けは JSON 固定にします。

```json
{
  "summary": "",
  "tags": []
}
```

Node.js 側では API 応答を受けた後、必ず JSON パースとスキーマ検証を行います。

---

## 7. リトライ方針

AI の失敗はイベント処理全体の失敗と切り離します。

推奨ルール:

- JSON パース失敗時は `retry_count += 1`
- 最大 3 回まで再試行
- 3 回失敗したら `status = failed`
- 失敗理由は `last_error` に保存する

---

## 8. systemd

AI サーバーは systemd で単独管理します。

```ini
[Unit]
Description=Toitoi Edge AI
After=network.target

[Service]
User=YOUR_USER
WorkingDirectory=/home/YOUR_USER/llama.cpp
ExecStart=/home/YOUR_USER/llama.cpp/build/bin/llama-server \
  -m /home/YOUR_USER/models/qwen3-1.7b-q4_k_m.gguf \
  -c 1024 \
  -np 1 \
  --host 127.0.0.1 \
  --port 8080
Restart=always
RestartSec=5

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
- [`apps/edge-ai/EDGE_AI_SETUP.md`](../../apps/edge-ai/EDGE_AI_SETUP.md)

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
