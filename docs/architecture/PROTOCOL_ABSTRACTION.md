# Protocol Abstraction

**Status: evolving** | **Last updated: 2026-05-19**

## 概要

Toitoi は現在、最初の operational transport として Nostr を利用しています。

しかし内部アーキテクチャは、特定 protocol に閉じない構造を目指します。

目的は、

- protocol portability
- semantic continuity
- replayability
- long-term preservation

を transport 寿命から切り離すことです。

---

## 分離する層

| Layer | Responsibility |
|---|---|
| Canonical Event | 意味論的な内部共通表現 |
| Converter | Canonical と transport 表現の相互変換 |
| Transport | relay / PDS / filesystem 等での配送 |
| Adapter / Normalizer | ingest 時の protocol 差異吸収 |
| Standard API | UI / AI 向け統一アクセス面 |

---

## 読み込み時の抽象化

```text
Raw Protocol Events
  ↓
Validate
  ↓
Verify
  ↓
Deduplicate
  ↓
Ordering
  ↓
Normalize
  ↓
Canonicalize
```

この一連の処理を Adapter / Normalizer が担います。

ここで重要なのは、

```text
protocol event ≠ semantic event
```

であることです。

---

## 書き込み時の抽象化

```text
Canonical Event
  ↓
Converter
  ↓
Protocol-specific Representation
  ↓
Transport
```

この構造により、内部中心を保ったまま複数 protocol へ出力できます。

---

## raw event と canonicalized event

Toitoi では次を分けて扱います。

- raw event
- normalized event
- canonicalized event
- derived index

理由:

- 監査
- replay
- 再 canonicalize
- 再 index

を可能にするためです。

---

## 現在の transport と将来

現在の主 transport:

- Nostr

将来的に追加を検討するもの:

- ATProto
- ActivityPub
- LocalFS

これらを追加しても、

- Canonical Event
- Standard API
- AI / UI のアクセス面

を大きく壊さないことを目標にします。

---

## 関連

- [OVERVIEW.md](./OVERVIEW.md)
- [EVENT_MODEL.md](./EVENT_MODEL.md)
- [../protocols/CANONICAL_EVENT.md](../protocols/CANONICAL_EVENT.md)
- [../protocols/NOSTR_TRANSPORT.md](../protocols/NOSTR_TRANSPORT.md)
