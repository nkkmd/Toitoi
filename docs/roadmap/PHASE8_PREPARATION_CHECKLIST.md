# Phase 8 着手前チェックリスト

**目的**: 多プロトコル化の実装に入る前に、既存の Nostr 基盤と将来の共通 interface を固定する。

このチェックリストは、Phase 8 の実装そのものではなく、開始前に揃えておく判断材料をまとめたものです。

---

## 1. 固定するもの

- [ ] 既存 Nostr の adapter / normalizer の責務境界を壊さない
- [ ] converter の入力と出力を canonical 中心で説明できる
- [ ] Standard API の返り値形を変更しない
- [ ] replay / append-only storage の前提を維持する
- [ ] provenance と rawRef の役割を維持する

---

## 2. 決めるもの

- [ ] adapter interface の共通形
- [ ] converter interface の共通形
- [ ] source capability の比較軸
- [ ] protocol ごとの trust model の整理方法
- [ ] 欠損情報を API に出すか、内部メタデータに留めるか
- [ ] capability matrix を文書化する
- [ ] protocol registry を用意する

---

## 3. 事前確認

- [ ] `packages/nostr/adapter/` のテストが通る
- [ ] `packages/nostr/storage/` の replay / index / API contract が通る
- [ ] `infra/transports/nostr/` の運用手順が参照できる
- [ ] Phase 7 のバックアップ / 復旧 / retry が安定している

---

## 4. Phase 8 に入る前の合意事項

- [ ] 新しい protocol を追加しても Canonical Event を大きく変えない
- [ ] protocol 差分は adapter / converter に閉じる
- [ ] source capability の差分表を文書化する
- [ ] trust model を protocol ごとに説明できる
- [ ] Standard API の意味アクセス面を保つ
- [ ] registry が protocol descriptor を並べられる

---

## 5. 参照

- [MULTI_PROTOCOL_PREPARATION.md](../architecture/MULTI_PROTOCOL_PREPARATION.md)
- [MULTI_PROTOCOL_CAPABILITY_MATRIX.md](../architecture/MULTI_PROTOCOL_CAPABILITY_MATRIX.md)
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- [PROTOCOL_ABSTRACTION.md](../architecture/PROTOCOL_ABSTRACTION.md)
