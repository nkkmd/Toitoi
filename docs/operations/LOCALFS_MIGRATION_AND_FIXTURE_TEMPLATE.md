# LocalFS Migration / Fixture Template

**Status: evolving** | **Last updated: 2026-05-31**

この文書は、LocalFS を将来対応させるときの最小テンプレートです。  
現時点で runtime replay は unsupported ですが、file/archive-backed な ingest や migration を追加する余地は残しています。

## 1. 現状

| 項目 | 値 |
|---|---|
| protocol | `localfs` |
| replay | `unsupported` |
| storage mode | `metadata-only` / `snapshot` |
| fixture source | `packages/localfs/` にはまだ実データ fixture なし |
| migration script | 未実装 |

### 注意

- runtime replay はまだ wired しない
- replay 前提の backup / restore は書かない
- file/path metadata を中心に、読み取り専用の projection として扱う

## 1.1 API 運用との接続

LocalFS は現時点で API の runtime replay source ではありません。

- `TOITOI_PROTOCOL=localfs` で `TOITOI_STORAGE_DIR` を指定した API 起動は、現状では明示エラーになる
- `/health` の `storage.supported` は `false` として扱う
- API 運用では metadata-only の protocol として introspection する
- 将来 replay が追加されたら、この節を supported に更新する

## 2. Fixture Template

LocalFS の fixture は、まず実ファイルを持たない metadata-only 形式で始めると扱いやすいです。

### 例

- `name`: `<fixture name>`
- `sourcePath`: `<relative path>`
- `recordId`: `<stable id>`
- `mtime`: `<timestamp>`
- `tags`: `<optional metadata>`

### 期待される形

- file list から deterministic に読める
- path と metadata だけで test が回る
- replay を前提にしない

### 参考 fixture

- `packages/localfs/fixtures/sample-localfs-entry.json`
- `packages/localfs/fixtures/sample-localfs-manifest.json`
- `packages/localfs/fixtures/sample-localfs-archive.jsonl`

## 3. Migration Script Template

LocalFS の migration script は、将来 file/archive-backed ingestion を追加するときの入口です。

### 入出力

- input: `<directory / archive / manifest>`
- output: `<normalized file records>`
- verification: `<snapshot diff / metadata checksum>`

### 実例

- input: `packages/localfs/fixtures/sample-localfs-manifest.json`
- output: `packages/localfs/fixtures/sample-localfs-archive.jsonl`
- script: `scripts/localfs/normalize_localfs_manifest.js`

### 実装前の判断

- migration が必要な場合だけ script を作る
- runtime replay が無い間は、変換結果を canonical source と混同しない

## 4. 運用メモ

- raw event の保存先を先に決める
- canonicalized event と snapshot の責務を混ぜない
- unsupported の状態でも、将来の対応可能性は note に残す

## 5. 関連

- [PROTOCOL_OPERATION_TEMPLATE.md](./PROTOCOL_OPERATION_TEMPLATE.md)
- [packages/localfs/README.md](../../packages/localfs/README.md)
- [packages/localfs/protocol.js](../../packages/localfs/protocol.js)
