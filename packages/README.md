# Packages

`packages/` は、複数の app や infra から再利用される共通コードを置くディレクトリです。

ここには、protocol 共通処理、protocol 固有だが再利用される処理、永続化や replay の基盤を置きます。  
運用手順や配備設定は置きません。

## 全体像

```text
packages/
├─ protocol/  -> shared descriptor / registry
├─ nostr/     -> Nostr adapter / storage / converter
├─ atproto/   -> ATProto descriptor
└─ localfs/   -> LocalFS descriptor
```

## まず見るもの

- [protocol/README.md](./protocol/README.md)
- [nostr/README.md](./nostr/README.md)
- [atproto/README.md](./atproto/README.md)
- [localfs/README.md](./localfs/README.md)

## 役割の分け方

- `protocol/`: protocol descriptor と registry の共通基盤
- `nostr/`: Nostr の adapter / converter / storage の共有実装
- `atproto/`: ATProto の protocol descriptor
- `localfs/`: LocalFS の protocol descriptor

## 依存の原則

- 下位の汎用層ほど再利用されやすくします
- `packages/` 内の依存は、できるだけ `protocol -> protocol-specific -> infra/app` の向きにします
- テスト用 fixture は実装層に近い場所に置きます
