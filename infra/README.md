# Infra

`infra/` は、運用・構築・監視に関する資産を置くディレクトリです。

ここには、実行アプリそのものではなく、配備や ingest、監視、復旧のための入口を置きます。

## 全体像

```text
infra/
├─ transports/
│  └─ nostr/   -> relay ingest / ops
└─ indexers/
   └─ nostr/   -> indexer ops
```

## 役割

- `transports/`: transport ごとの運用入口
- `indexers/`: indexer の運用入口

## このリポジトリでの現状

現在、JavaScript の実装があるのは主に Nostr transport です。

- `infra/transports/nostr/`

そのため、まずは transport 単位で README を読むのがわかりやすいです。
