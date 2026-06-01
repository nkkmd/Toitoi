# Toitoi Edge AI Hub

**Version: 0.6.2** | **Status: evolving** | **Last updated: 2026-06-02**

この文書は、`apps/edge-ai/` に置くエッジ AI 関連文書の案内ハブです。

実装手順そのものは、低リソース向けの最小構成を含めて分離しています。  
特に [`docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md`](../../docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md) は参考用の構成例です。

> まずここから読む
> 1. `RAM 4GB / Ubuntu 24.04 LTS` で導入するなら [Edge AI Low-Resource Profile](../../docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md)
> 1. AI の役割や責務を知りたいなら [AI System Overview](../../docs/architecture/AI_SYSTEM_OVERVIEW.md)
> 1. 仕様や契約を確認したいなら [Canonical Event](../../docs/protocols/CANONICAL_EVENT.md) と [Nostr Inquiry Schema](../../docs/protocols/NOSTR_INQUIRY_SCHEMA.md)

---

## 読み順

1. [Edge AI Low-Resource Profile](../../docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md)
1. [AI System Overview](../../docs/architecture/AI_SYSTEM_OVERVIEW.md)
1. [Canonical Event](../../docs/protocols/CANONICAL_EVENT.md)
1. [Nostr Inquiry Schema](../../docs/protocols/NOSTR_INQUIRY_SCHEMA.md)

`RAM 4GB / Ubuntu 24.04 LTS` の端末に導入する場合は、最初に [Edge AI Low-Resource Profile](../../docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md) を読んでください。

---

## 何をどこに置くか

- AI の責務や設計原則: `docs/architecture/AI_SYSTEM_OVERVIEW.md`
- `RAM 4GB / Ubuntu 24.04 LTS` の導入手順と最小構成: `docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md`
- Canonical Event の契約: `docs/protocols/CANONICAL_EVENT.md`
- Nostr 側のタグ・投影仕様: `docs/protocols/NOSTR_INQUIRY_SCHEMA.md`

---

## この文書の使い方

`apps/edge-ai/` を触るときは、まずこのファイルを入口にしてください。

今後ここに追記するのは、以下のような「導線情報」だけです。

- 新しい edge-ai サブ文書へのリンク
- 文書の責務分担の変更
- 廃止された手順への移行案内
