# Nostr Transport

## 概要

Toitoi は現在、Nostr を最初の operational transport として利用しています。

Nostr は、

- event-centric
- relay-based
- append-only friendly
- self-hostable

という性質を持ち、Toitoi の初期 transport と相性がよいです。

---

## Toitoi における役割

Toitoi は Nostr を、

- SNS
- social graph
- timeline system

としてではなく、

```text
Canonical Event を配送・同期するための transport
```

として利用します。

---

## Nostr が担うもの

- event delivery
- relay-based fan-out
- signature verification の前提
- append-only archive source
- federation の初期 transport

---

## Nostr が内部中心として担わないもの

- Toitoi の意味論的中心モデル
- multi-protocol 共通表現
- UI / AI 向けの統一アクセス面

これらはそれぞれ、

- Canonical Event
- Adapter / Normalizer
- Standard API

が担います。

---

## Nostr inquiry event との関係

Toitoi が Nostr で流す inquiry は transport event です。

詳細な shape は [NOSTR_INQUIRY_SCHEMA.md](./NOSTR_INQUIRY_SCHEMA.md) を参照してください。

重要なのは、

- Nostr event は transport representation
- Canonical Event は semantic representation

という分離です。

---

## 利用理由

現在 Nostr を使う理由:

- 軽量な relay モデル
- append-only 的な運用との相性
- 公開鍵署名ベースの検証
- self-hosting のしやすさ
- 実装の単純さ

---

## 長期的方針

Toitoi は長期的に protocol-independent な構造を目指します。

したがって、

- Nostr は replaceable transport
- internal semantics は Canonical Event に集約
- 将来 protocol を追加しても API と AI の中心を維持

という方針で進めます。

---

## 関連

- [NOSTR_INQUIRY_SCHEMA.md](./NOSTR_INQUIRY_SCHEMA.md)
- [CANONICAL_EVENT.md](./CANONICAL_EVENT.md)
- [../architecture/PROTOCOL_ABSTRACTION.md](../architecture/PROTOCOL_ABSTRACTION.md)
