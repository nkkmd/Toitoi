# Protocol Abstraction

**Status: evolving** | **Last updated: 2026-05-21**

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

## 用語の固定

この文書では、次の用語を固定して使います。

### raw event

- transport から直接得た生の protocol event
- まだ protocol 固有の差異を含む

### normalized event

- validate / verify / dedupe / ordering を経た中間状態
- canonicalization 前の整形済み表現

### canonical event

- Toitoi の内部意味表現
- protocol-independent な semantic layer

### canonicalized event

- normalized event を canonical event に変換した結果
- indexer / API / AI の直接入力になる

### derived index

- canonical event から派生した検索・参照用の補助構造
- semantic source of truth ではない

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

## 責務境界

### Adapter / Normalizer

- transport から得た raw event を受け取る
- validate / verify / dedupe / ordering を行う
- protocol 固有の差異を吸収する
- normalized event を canonicalized event にする

現行のフェーズ5実装では、この責務は `packages/nostr/adapter/` に集約されています。

### Converter

- canonical event を protocol-specific representation に写す
- transport 側の制約に合わせて投影する
- 逆方向の変換が必要な場合は canonical への loss-aware な再構成を行う

### Transport

- relay / PDS / filesystem などへの配送と保存を担う
- 永続化や配信の都合を持つが、semantic layer は持たない

### Indexer

- canonicalized event から検索・参照用の派生構造を作る
- semantic source of truth にはならない

現行のフェーズ5実装では、この責務は `packages/nostr/storage/indexer.js` と `packages/nostr/storage/replay.js` によって提供されています。

### Standard API

- canonical view を外部へ返す
- protocol schema をそのまま露出しない

---

## delete / replace / ordering / trust の扱い

### delete

- raw event または normalized event の段階で解釈する
- semantic な削除結果は tombstone や relation の更新として表す
- Canonical Event 自体を「消えた事実」に置き換えない

### replace

- replaceable transport の振る舞いは adapter 側で解釈する
- 置換後の状態は canonical event の上書きではなく新しい canonicalized event と lineage で扱う
- 旧 event の痕跡は raw / provenance / lineage で追えるようにする

### ordering

- ordering は ingest の安定化と replay の再現性のために使う
- created_at や transport ordering は補助情報として扱う
- semantic の優先順位は ordering だけで決めない

### trust

- trust は signature verification、author identity、transport/source policy に分解する
- canonical event には trust の生表現を入れず provenance と補助 metadata に分ける
- API では必要な場合のみ trust の根拠を説明可能にする

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

加えて、Nostr に特有の処理は次のように整理します。

- validate: event shape と必須項目の確認
- verify: signature と author identity の確認
- dedupe: 同一入力や重複配送の排除
- ordering: created_at と replaceable semantics の調整
- normalize: transport 差分の整形
- canonicalize: semantic layer への変換

これらは protocol 固有責務として adapter 配下に閉じます。

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
