# Toitoi Edge AI Hub

**Version: 0.6.5** | **Status: current** | **Last updated: 2026-06-24**

この文書は、`apps/edge-ai/` に置くエッジ AI 関連文書の案内ハブです。

実装手順そのものは、低リソース向けの最小構成を含めて分離しています。  
特に [`docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md`](../../docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md) は参考用の構成例です。

Phase 15 完了後は、AI 側は multi-transport の差分を直接扱わず、`apps/api/` が返す canonical view と provenance summary を参照する前提です。  
transport ごとの差分や identity mapping は、API / infra / ops 側に閉じます。canonical identity と provenance の役割分担は、ここでは API 契約として受け取る側に徹します。

> まずここから読む
> 1. `RAM 4GB / Ubuntu 24.04 LTS` で導入するなら [Edge AI Low-Resource Profile](../../docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md)
> 1. AI の役割や責務を知りたいなら [AI System Overview](../../docs/architecture/AI_SYSTEM_OVERVIEW.md)
> 1. 仕様や契約を確認したいなら [Canonical Event](../../docs/protocols/CANONICAL_EVENT.md) と transport schema 群

---

## 読み順

1. [Edge AI Low-Resource Profile](../../docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md)
1. [AI System Overview](../../docs/architecture/AI_SYSTEM_OVERVIEW.md)
1. [Canonical Event](../../docs/protocols/CANONICAL_EVENT.md)
1. [Nostr Inquiry Schema](../../docs/protocols/NOSTR_INQUIRY_SCHEMA.md)
1. [Lingonberry Inquiry Schema](../../docs/protocols/LINGONBERRY_INQUIRY_SCHEMA.md)
1. [ATProto Inquiry Schema](../../docs/protocols/ATPROTO_INQUIRY_SCHEMA.md)
1. 必要に応じて [Standard API README](../api/README.md) を参照し、canonical view の返り方を確認する

`RAM 4GB / Ubuntu 24.04 LTS` の端末に導入する場合は、最初に [Edge AI Low-Resource Profile](../../docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md) を読んでください。

---

## 何をどこに置くか

- AI の責務や設計原則: `docs/architecture/AI_SYSTEM_OVERVIEW.md`
- `RAM 4GB / Ubuntu 24.04 LTS` の導入手順と最小構成: `docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md`
- Canonical Event の契約: `docs/protocols/CANONICAL_EVENT.md`
- transport 側の投影仕様: `docs/protocols/NOSTR_INQUIRY_SCHEMA.md` / `docs/protocols/LINGONBERRY_INQUIRY_SCHEMA.md` / `docs/protocols/ATPROTO_INQUIRY_SCHEMA.md`
- canonical view と provenance の API 契約: `apps/api/README.md`
- multi-transport の詳細: `docs/roadmap/IMPLEMENTATION_PLAN.md` と `docs/operations/MULTI_TRANSPORT_OUTBOUND_AND_DELIVERY.md`

---

## この文書の使い方

`apps/edge-ai/` を触るときは、まずこのファイルを入口にしてください。

今後ここに追記するのは、以下のような「導線情報」だけです。

- 新しい edge-ai サブ文書へのリンク
- 文書の責務分担の変更
- 廃止された手順への移行案内
