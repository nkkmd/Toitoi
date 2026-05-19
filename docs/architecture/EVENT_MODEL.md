# Event Model

**Status: stable** | **Last updated: 2026-05-19**

## 概要

Toitoi は append-only な event model を中心に設計されています。

問い、観察、応答、注釈などを、変更可能な状態ではなく
時系列に蓄積されるイベントとして扱います。

この構造により、

- provenance
- replayability
- distributed sync
- semantic continuity

を保ちます。

---

## 基本原則

### Immutable

公開後の event は破壊的に更新しません。

修正や再解釈は、新しい event と lineage relation で表現します。

### Append-Only

保存は append-only log を基本とします。

### Relational

event は単独で終わらず、

- derived_from
- synthesis
- annotates
- revises

などの関係を持てます。

---

## Event の層

Toitoi では event を少なくとも次の層で区別します。

```text
Raw Protocol Event
  ↓
Normalized Event
  ↓
Canonicalized Event
  ↓
Derived Index
```

### Raw Protocol Event

- relay や PDS などから取得した生の transport event

### Normalized Event

- validate / verify / dedupe / ordering を経た中間状態

### Canonicalized Event

- Toitoi 内部で扱う semantic event

### Derived Index

- 検索や参照のための派生構造

---

## Canonical Event との関係

Toitoi の内部中心は Canonical Event です。

そのため、

- Nostr event をそのまま内部 event model と見なさない
- protocol 差異は adapter / normalizer で吸収する
- indexer は canonicalized event を受け取る

という構成を取ります。

---

## 代表的な event type

現在の代表例:

- `inquiry`
- `observation`
- `response`
- `annotation`
- `synthesis`

この分類は固定ではなく、将来拡張される可能性があります。

---

## replay

append-only event model の重要な性質は replay 可能性です。

raw event を保持していれば、

- canonicalization ルール変更後の再処理
- index の再生成
- 履歴監査

ができます。

---

## 関連

- [PROTOCOL_ABSTRACTION.md](./PROTOCOL_ABSTRACTION.md)
- [OVERVIEW.md](./OVERVIEW.md)
- [../protocols/CANONICAL_EVENT.md](../protocols/CANONICAL_EVENT.md)
