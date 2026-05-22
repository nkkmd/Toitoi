# Multi-Protocol Preparation

**Status: draft** | **Last updated: 2026-05-22**

## 目的

Phase 8 に入る前に、Nostr 以外の protocol を追加するための共通の見方を準備します。

この文書は実装ではなく、Phase 8 の実装がぶれないようにするための前提整理です。

現時点では、`packages/protocol/` に共通 helper の最初の実装を置き、`packages/nostr/protocol.js` で Nostr descriptor を組み立てています。
registry と比較表はそれぞれ `packages/protocol/protocol_registry.js` と [MULTI_PROTOCOL_CAPABILITY_MATRIX.md](./MULTI_PROTOCOL_CAPABILITY_MATRIX.md) に切り出しています。

---

## 1. 共通化したい interface の観点

### Adapter

Adapter は protocol 由来の input を受け取り、canonicalize 前の状態まで整える責務を持ちます。

共通化の観点:

- raw input を受け取れること
- validate / verify / dedupe / ordering を説明できること
- normalize 結果を返せること
- canonicalize への橋渡しができること

### Converter

Converter は canonical event と protocol-specific representation の往復を扱います。

共通化の観点:

- canonical から transport projection を作れること
- transport projection から canonical を loss-aware に再構成できること
- lineage / provenance を壊さないこと

---

## 2. source capability の比較軸

Phase 8 では、protocol ごとの差を次の軸で整理します。

| Capability | 何を確認するか |
|---|---|
| raw acquisition | 生の event / record / file を取得できるか |
| identity verification | 送信者や source の正当性を検証できるか |
| ordering | 順序の安定性や再現性があるか |
| delete semantics | 削除の意味をどう表すか |
| replace semantics | 置換をどう表すか |
| replayability | 同じ input から再処理できるか |
| provenance fidelity | 来歴をどこまで残せるか |
| storage snapshot | append-only もしくは snapshot で保持できるか |
| source trust | どの程度 source を信頼できるか |

この表は protocol の優劣を決めるものではなく、実装責務の違いを見える化するためのものです。

---

## 3. trust model の整理方針

Protocol ごとの trust は、ひとまとめにせず分けて考えます。

- source trust
- transport trust
- signature / proof trust
- storage trust
- replay trust

API では必要最小限の trust 情報だけを露出し、それ以外は provenance と内部メタデータに分離します。

---

## 4. Phase 8 前に決めておくこと

- adapter / converter の公開メソッド名
- 共通の error class の扱い
- capability table の記述形式
- protocol registry の公開 API
- protocol ごとの欠損情報の表し方
- Standard API に露出してよい provenance の範囲

---

## 5. 現行 Nostr との関係

現行 Nostr 実装は、次の既存レイヤに分かれています。

- `packages/nostr/adapter/`
- `packages/nostr/storage/`
- `packages/nostr/converter/`

Phase 8 では、この分割を壊さずに他 protocol を並べます。

---

## 6. 関連

- [PROTOCOL_ABSTRACTION.md](./PROTOCOL_ABSTRACTION.md)
- [EVENT_MODEL.md](./EVENT_MODEL.md)
- [MULTI_PROTOCOL_CAPABILITY_MATRIX.md](./MULTI_PROTOCOL_CAPABILITY_MATRIX.md)
- [IMPLEMENTATION_PLAN.md](../roadmap/IMPLEMENTATION_PLAN.md)
- [PHASE8_PREPARATION_CHECKLIST.md](../roadmap/PHASE8_PREPARATION_CHECKLIST.md)
