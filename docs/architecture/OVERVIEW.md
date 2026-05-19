# Toitoi Architecture Overview

## 概要

Toitoi は、特定 protocol を中心に据えるのではなく、

```text
異なる知識ネットワークを意味論的に横断できること
```

を目指すアーキテクチャです。

そのため、内部中心には Canonical Event を置きます。

---

## 全体像

```text
Write Path

Edge AI / Local Apps
  ↓
Canonical Event
  ↓
Converter
  ↓
Protocol-specific Representation
  ↓
Transport


Read Path

Transport
  ↓
Fetcher / Sync
  ↓
Raw Protocol Events
  ↓
Adapter / Normalizer
  ↓
Canonicalized Events
  ↓
Indexer
  ↓
Standard API
  ↓
UI / AI
```

---

## 中核となる判断

### Canonical Event を中心に置く

- Toitoi の内部で意味的な共通表現として扱う
- protocol schema の写しにしない

### Adapter / Normalizer を独立層に置く

- validate
- verify
- dedupe
- ordering
- normalize
- canonicalize

をこの層で担う

### Standard API を意味アクセス面として設計する

- UI や AI が protocol 差異を直接扱わなくてよいようにする

### raw event と canonicalized event を分けて保持する

- replay
- 監査
- 再 index

を可能にする

---

## 各層の役割

| Layer | Role |
|---|---|
| Canonical Event | 意味論的な内部共通表現 |
| Converter | Canonical と protocol 表現の相互変換 |
| Transport | relay / PDS / filesystem などの配送・保存 |
| Adapter / Normalizer | protocol 差異の吸収と canonicalization |
| Indexer | 検索・参照のための派生構造生成 |
| Standard API | UI / AI 向けの統一アクセス面 |

---

## 書き込み側

書き込み側では Canonical Event を source として扱います。

```text
Canonical Event
  ↓
Converter
  ↓
Nostr Event / future protocol object
  ↓
Transport
```

重要なのは、

- Nostr Event を内部の唯一の truth にしない
- Canonical から複数 protocol へ出せる構造を保つ

ことです。

---

## 読み込み側

読み込み側では transport event をそのまま indexer に渡しません。

理由:

- protocol ごとの差異
- duplicate
- ordering 差異
- delete semantics
- replace semantics
- trust 情報

があるためです。

そのため、読み込みパイプラインは必ず

```text
Raw Protocol Events
  ↓
Adapter / Normalizer
  ↓
Canonicalized Events
```

を通します。

---

## Indexer と API

Indexer は Canonical Event を検索・参照のために最適化します。

代表例:

- full-text index
- time index
- embeddings
- graph construction

ただし、これらはすべて派生構造であり、Canonical semantics を置き換えません。

Standard API は protocol schema を返す面ではなく、

```text
統一された意味アクセス
```

を返す面として設計します。

---

## 現在と将来

現在の最初の operational transport は Nostr です。

ただし長期的には、

- ATProto
- LocalFS
- ActivityPub

などを追加しても、Canonical Event / Standard API を大きく崩さない構造を目指します。

---

## 関連

- [ADOPTED_ARCHITECTURE_DECISIONS.md](./ADOPTED_ARCHITECTURE_DECISIONS.md)
- [EVENT_MODEL.md](./EVENT_MODEL.md)
- [PROTOCOL_ABSTRACTION.md](./PROTOCOL_ABSTRACTION.md)
- [../protocols/CANONICAL_EVENT.md](../protocols/CANONICAL_EVENT.md)
- [../protocols/NOSTR_INQUIRY_SCHEMA.md](../protocols/NOSTR_INQUIRY_SCHEMA.md)
