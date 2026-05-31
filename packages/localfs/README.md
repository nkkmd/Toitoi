# LocalFS Package

`packages/localfs/` は、LocalFS の protocol skeleton を置く場所です。

現時点では主に descriptor 実装が中心で、ファイルベースの ingest や archive の入口に発展させる想定です。  
runtime replay は未対応で、`replayStorage()` のような実行時 storage 入口はまだ wired していません。将来的には file/archive-backed な replay に発展させられます。

## 全体像

```text
packages/localfs/
├─ protocol.js      -> LocalFS descriptor
└─ test_protocol.js -> contract test
```

## 主なファイル

- `protocol.js`: LocalFS の protocol descriptor
- `test_protocol.js`: descriptor の契約確認
- `runtime replay`: 現状は unsupported
- `運用テンプレート`: [docs/operations/LOCALFS_MIGRATION_AND_FIXTURE_TEMPLATE.md](/home/oruorane/github/Toitoi/docs/operations/LOCALFS_MIGRATION_AND_FIXTURE_TEMPLATE.md)
- fixture example: [packages/localfs/fixtures/sample-localfs-entry.json](/home/oruorane/github/Toitoi/packages/localfs/fixtures/sample-localfs-entry.json)
- manifest example: [packages/localfs/fixtures/sample-localfs-manifest.json](/home/oruorane/github/Toitoi/packages/localfs/fixtures/sample-localfs-manifest.json)
- archive example: [packages/localfs/fixtures/sample-localfs-archive.jsonl](/home/oruorane/github/Toitoi/packages/localfs/fixtures/sample-localfs-archive.jsonl)
- migration script: [scripts/localfs/normalize_localfs_manifest.js](/home/oruorane/github/Toitoi/scripts/localfs/normalize_localfs_manifest.js)

## 依存関係

- `protocol.js` は `packages/protocol/` の共通 descriptor helper に依存します
