# Infra

`infra/` は、運用・構築・監視に関する資産を置くディレクトリです。

ここには、実行アプリそのものではなく、配備や ingest、監視、復旧のための入口を置きます。

## 全体像

```text
infra/
├─ transports/
│  └─ nostr/   -> relay ingest / ops
└─ indexers/
   ├─ README.md / INDEXER_API_SETUP.md / CLEAN_START.md
   └─ nostr/   -> Nostr 固有の wrapper / migration notes
```

## 役割

- `transports/`: transport ごとの運用入口
- `indexers/`: indexer の運用入口

## このリポジトリでの現状

現在、JavaScript の実装が厚いのは Nostr transport ですが、indexer 側は protocol-aware な共通入口を先に揃えています。

- transport の入口: `infra/transports/nostr/`
- indexer の共通入口: `infra/indexers/`
- protocol 切り替えの基盤: `packages/protocol/`
