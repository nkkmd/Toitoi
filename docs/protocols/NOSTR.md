# Nostr

## 概要

Toitoi は現在、Nostr を主要な transport layer として利用しています。

Nostr は：

- シンプルなイベントモデル
- relay ベースの分散構造
- 公開鍵暗号による署名
- append-only なイベント配送

を特徴とする分散プロトコルです。

---

## Toitoi における役割

Toitoi は Nostr を：

- SNS
- ソーシャルメディア
- タイムラインシステム

としてではなく、

> 「問い」を分散配送・保存する transport layer

として利用しています。

---

## 利用理由

現在 Toitoi が Nostr を利用している理由：

- イベント中心構造との相性
- 軽量な relay モデル
- append-only な設計
- protocol simplicity
- self-hosting の容易さ

---

## Toitoi Event との関係

Toitoi では、問いや観察は Nostr event として配送されます。

例：

| Toitoi | Nostr |
|---|---|
| actor | pubkey |
| event | kind |
| timestamp | created_at |
| signature | sig |

詳細は：

- TOITOI_PROTOCOL_SCHEMA.md
- CANONICAL_JSONL.md

を参照してください。

---

## 長期的方針

Toitoi は長期的には protocol-independent な architecture を目指しています。

Nostr は現在の operational transport layer ですが、
内部 event model は特定 protocol へ依存しない構造を目指しています。

関連：

- ../architecture/PROTOCOL_ABSTRACTION.md
