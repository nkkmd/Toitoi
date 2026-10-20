# Edge AI Quick Start

**Status:** v1.0.0 candidate
**Language status:** English and Japanese sections are maintained as equivalent.
**Last synchronized:** 2026-10-20

This guide explains the shortest supported path for enabling Toitoi's AI inspection and review boundary. The v1.0.0 candidate does not provide a standalone `@toitoi/edge-ai` start command. Edge AI is integrated through the Standard API and AI storage boundary, while local-model deployment remains an optional adapter profile.

## 1. Start the API with AI inspection storage

```bash
mkdir -p .local/canonical-storage .local/ai-storage

TOITOI_PROTOCOL=nostr \
TOITOI_STORAGE_DIR="$PWD/.local/canonical-storage" \
TOITOI_AI_STORAGE_DIR="$PWD/.local/ai-storage" \
TOITOI_SEARCH_INDEX_FILE="$PWD/.local/search.sqlite" \
PORT=3000 \
corepack pnpm --filter @toitoi/api start
```

Expected log state includes:

```text
ai-inspection:enabled
workflow:enabled
```

## 2. Confirm health

```bash
curl -s http://127.0.0.1:3000/health/live
curl -s http://127.0.0.1:3000/health/ready
```

## 3. Understand the v1 boundary

```text
saved observation or published Canonical Event
  -> asynchronous AI job
  -> AI annotation candidate
  -> human inspection / review
  -> optional Inquiry Draft promotion
  -> independent publication approval
```

AI output is not authoritative knowledge, agronomic correctness, identity resolution, or publication approval. Failure of a model or malformed model output must not invalidate already persisted observations.

## 4. Validate the deterministic implementation

The repository test suite is the supported model-free developer path:

```bash
corepack pnpm --filter @toitoi/ai test
corepack pnpm --filter @toitoi/api test
corepack pnpm test
```

This validates storage, inspection, review, workflow, and authority boundaries without requiring a model download.

## 5. Optional local-model path

A local OpenAI-compatible inference server can be run separately. Example:

```bash
./build/bin/llama-server \
  -m /path/to/model.gguf \
  -c 1024 \
  -np 1 \
  --host 127.0.0.1 \
  --port 8080
```

The current repository candidate documents this as an implementation profile, not a release-certified default provider. Before production use, an adapter must validate JSON output, record model and prompt provenance, apply retry limits, preserve raw output for diagnosis, and keep publication approval separate.

See [`../architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md`](../architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md) for the 4 GB RAM reference profile and [`../architecture/AI_SYSTEM_OVERVIEW.md`](../architecture/AI_SYSTEM_OVERVIEW.md) for responsibility boundaries.

## Known limitation

Live local-model reproducibility evidence is not yet part of deterministic default CI. The v1.0.0 release must either record verified model/runtime evidence or disclose this limitation.

---

# Edge AI Quick Start

**状態:** v1.0.0候補
**言語状態:** 英語版と日本語版は同等の内容として管理します。
**最終同期日:** 2026-10-20

このガイドでは、ToitoiのAI処理を確認し、人間が審査する機能を有効にする最短の手順を説明します。v1.0.0候補には、独立した`@toitoi/edge-ai`の起動コマンドはありません。Edge AIは、Standard APIとAI用の保存機能を通じて統合されています。ローカルモデルの配備は、任意で利用するアダプター構成として扱います。

## 1. AI処理の確認用保存領域を有効にしてAPIを起動する

```bash
mkdir -p .local/canonical-storage .local/ai-storage

TOITOI_PROTOCOL=nostr \
TOITOI_STORAGE_DIR="$PWD/.local/canonical-storage" \
TOITOI_AI_STORAGE_DIR="$PWD/.local/ai-storage" \
TOITOI_SEARCH_INDEX_FILE="$PWD/.local/search.sqlite" \
PORT=3000 \
corepack pnpm --filter @toitoi/api start
```

想定されるログの状態には、次が含まれます。

```text
ai-inspection:enabled
workflow:enabled
```

## 2. 稼働状態を確認する

```bash
curl -s http://127.0.0.1:3000/health/live
curl -s http://127.0.0.1:3000/health/ready
```

## 3. v1の処理と権限の分離を理解する

```text
保存済みの観察記録または公開済みCanonical Event
  -> 非同期AIジョブ
  -> AI注釈の候補
  -> 人間による内容確認・審査
  -> 必要に応じてInquiry Draftを作成
  -> 独立した公開承認
```

AI出力は、権威ある知識、農業上の正しさ、記録の同一性の確定、公開承認（publication approval）を意味しません。モデルの失敗や不正な形式の出力によって、保存済みの観察記録が無効になってはいけません。

## 4. 再現可能な参照実装を検証する

モデルをダウンロードせずに検証する場合は、リポジトリのテストを実行します。

```bash
corepack pnpm --filter @toitoi/ai test
corepack pnpm --filter @toitoi/api test
corepack pnpm test
```

保存、AI処理の確認、人間による審査、ワークフロー、権限の分離を検証します。

## 5. 任意でローカルモデルを利用する

OpenAI互換のローカル推論サーバーは、別プロセスで起動できます。起動例:

```bash
./build/bin/llama-server \
  -m /path/to/model.gguf \
  -c 1024 \
  -np 1 \
  --host 127.0.0.1 \
  --port 8080
```

現在のリリース候補では、これは実装構成の一例です。リリースで認定済みの標準プロバイダーではありません。本番利用前に、アダプターはJSON出力を検証し、モデルとプロンプトの来歴を記録し、再試行回数を制限し、診断用の未加工出力を保持し、公開承認を別に扱う必要があります。

4GB RAM向けの参照構成は[`../architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md`](../architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md)、責務の分離は[`../architecture/AI_SYSTEM_OVERVIEW.md`](../architecture/AI_SYSTEM_OVERVIEW.md)を参照してください。

## 既知の制約

実際のローカルモデルによる再現性の証拠は、固定入力で再現可能な標準CIには含まれていません。v1.0.0の公開時には、検証済みのモデルと実行環境の証拠を記録するか、この制約を明示する必要があります。
