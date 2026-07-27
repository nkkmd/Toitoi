# Edge AI Quick Start

**Status:** v1.0.0 candidate  
**Language status:** English and Japanese sections are maintained as equivalent.  
**Last synchronized:** 2026-07-27

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
**最終同期日:** 2026-07-27

このガイドでは、ToitoiのAI inspectionとreview境界を有効にする最短経路を説明します。v1.0.0候補には独立した`@toitoi/edge-ai` start commandはありません。Edge AIはStandard APIとAI storage境界を通して統合され、local-model deploymentはoptional adapter profileとして扱います。

## 1. AI inspection storageを有効にしてAPIを起動する

```bash
mkdir -p .local/canonical-storage .local/ai-storage

TOITOI_PROTOCOL=nostr \
TOITOI_STORAGE_DIR="$PWD/.local/canonical-storage" \
TOITOI_AI_STORAGE_DIR="$PWD/.local/ai-storage" \
TOITOI_SEARCH_INDEX_FILE="$PWD/.local/search.sqlite" \
PORT=3000 \
corepack pnpm --filter @toitoi/api start
```

想定されるlog stateには次が含まれます。

```text
ai-inspection:enabled
workflow:enabled
```

## 2. Healthを確認する

```bash
curl -s http://127.0.0.1:3000/health/live
curl -s http://127.0.0.1:3000/health/ready
```

## 3. v1の境界を理解する

```text
保存済みobservationまたは公開済みCanonical Event
  -> 非同期AI job
  -> AI annotation candidate
  -> 人間によるinspection / review
  -> 必要に応じてInquiry Draftへ昇格
  -> 独立したpublication approval
```

AI outputは、権威ある知識、農業上の正しさ、identity resolution、publication approvalではありません。model failureやmalformed outputが、保存済みobservationを無効にしてはいけません。

## 4. Deterministic implementationを検証する

model downloadを必要としないdeveloper pathはrepository test suiteです。

```bash
corepack pnpm --filter @toitoi/ai test
corepack pnpm --filter @toitoi/api test
corepack pnpm test
```

storage、inspection、review、workflow、authority boundaryを検証します。

## 5. Optional local-model path

local OpenAI-compatible inference serverは別processとして起動できます。例:

```bash
./build/bin/llama-server \
  -m /path/to/model.gguf \
  -c 1024 \
  -np 1 \
  --host 127.0.0.1 \
  --port 8080
```

現在のrepository candidateでは、これはrelease-certifiedなdefault providerではなくimplementation profileです。production利用前にadapterはJSON outputを検証し、modelとprompt provenanceを記録し、retry limitを適用し、診断用raw outputを保持し、publication approvalを分離する必要があります。

4GB RAM向けreference profileは[`../architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md`](../architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md)、責務境界は[`../architecture/AI_SYSTEM_OVERVIEW.md`](../architecture/AI_SYSTEM_OVERVIEW.md)を参照してください。

## 既知の制約

実local modelの再現性証拠はdeterministic default CIに含まれていません。v1.0.0 releaseでは、検証済みmodel/runtime evidenceを記録するか、この制約を明示する必要があります。
