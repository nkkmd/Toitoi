# Infra

`infra/` は、運用・構築・監視に関する資産を置くディレクトリです。

ここには、実行アプリそのものではなく、配備や ingest、監視、復旧のための入口を置きます。

## 全体像

```text
infra/
├─ transports/
│  ├─ nostr/        -> relay ingest / ops
│  └─ lingonberry/  -> batch/archive ingest / ops
└─ indexers/
   ├─ README.md / INDEXER_API_SETUP.md / CLEAN_START.md
   └─ nostr/   -> Nostr 固有の wrapper / migration notes
```

## 役割

- `transports/`: transport ごとの運用入口
- `indexers/`: indexer の運用入口

## このリポジトリでの現状

現在の primary transport は Nostr と Lingonberry です。Nostr は operational primary として relay-oriented な運用経路を担い、Lingonberry は semantic primary として knowledge object / inquiry の projection と ingest 経路を担います。ATProto は multi-protocol 互換性と検証のための secondary transport として扱います。

transport の思想的・運用的な位置づけは [Transport Positioning](../docs/architecture/TRANSPORT_POSITIONING.md) を正本として参照してください。

- transport の入口: `infra/transports/nostr/`
- Lingonberry ingest の入口: `infra/transports/lingonberry/`
- indexer の共通入口: `infra/indexers/`
- protocol 切り替えの基盤: `packages/protocol/`
