# Toitoi Edge AI Setup

**Version: 0.6.0** | **Status: evolving** | **Last updated: 2026-06-01**

この文書は、`apps/edge-ai/` に置くエッジ AI 関連文書の案内ハブです。

実装手順そのものは、低リソース向けの最小構成を含めて分離しています。

---

## 役割

`EDGE_AI_SETUP.md` は、エッジ AI に関する入口をまとめるだけの文書にします。

このファイルに詳細な手順や重い設計判断を重ねず、必要な内容は次の文書へ誘導します。

---

## 読み順

1. [AI System Overview](../../docs/architecture/AI_SYSTEM_OVERVIEW.md)
2. [Edge AI Low-Resource Profile](../../docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md)
3. [Canonical Event](../../docs/protocols/CANONICAL_EVENT.md)
4. [Nostr Inquiry Schema](../../docs/protocols/NOSTR_INQUIRY_SCHEMA.md)

---

## 何をどこに置くか

- AI の責務や設計原則は `docs/architecture/AI_SYSTEM_OVERVIEW.md`
- `RAM 4GB / Ubuntu 24.04 LTS` の具体的な最小構成は `docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md`
- Canonical Event の契約は `docs/protocols/CANONICAL_EVENT.md`
- Nostr 側のタグ・投影仕様は `docs/protocols/NOSTR_INQUIRY_SCHEMA.md`

---

## この文書の使い方

`apps/edge-ai/` を触るときは、まずこのファイルから関連文書へ移動してください。

今後ここに追記するのは、以下のような「導線情報」だけです。

- 新しい edge-ai サブ文書へのリンク
- 文書の責務分担の変更
- 廃止された手順への移行案内

---

## 補助メモ

`EDGE_AI_SETUP.md` は、仕様の正本ではありません。

正本を置くべき場所は以下です。

- 設計原則: `docs/architecture/AI_SYSTEM_OVERVIEW.md`
- 低リソース運用: `docs/architecture/EDGE_AI_LOW_RESOURCE_PROFILE.md`
- プロトコル: `docs/protocols/`
