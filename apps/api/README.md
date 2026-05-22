# Standard API

## 概要

`apps/api/` は、Toitoi の Standard API reference implementation です。

canonical event と derived index をそのまま外に出すのではなく、薄い service layer を経由して canonical view を返します。

## まず見るもの

- API の使い方: このファイル
- HTTP エントリポイント: [server.js](./server.js)
- ルーティングと view 投影: [standard_api_service.js](./standard_api_service.js)
- テスト: [test_standard_api_service.js](./test_standard_api_service.js)
- データの元: `packages/nostr/storage/`

## 起動

```bash
TOITOI_STORAGE_DIR=/path/to/storage node apps/api/server.js
```

`TOITOI_STORAGE_DIR` が未設定の場合は、空の index snapshot で起動します。

## エンドポイント

- `GET /health`
- `GET /api/v1/inquiries`
- `GET /api/v1/inquiries/query`
- `GET /api/v1/inquiries/relation`
- `GET /api/v1/inquiries/:id`
- `GET /api/v1/inquiries/:id/detail`
- `GET /api/v1/inquiries/:id/tree`

## テスト

```bash
node apps/api/test_standard_api_service.js
```

## 関連リンク

- 入口一覧: [README.md](../../README.md)
- ディレクトリ責務: [REPOSITORY_STRUCTURE.md](../../REPOSITORY_STRUCTURE.md)
- 標準 API の実装: [server.js](./server.js)
- ルーティングと投影: [standard_api_service.js](./standard_api_service.js)
- 派生 index の元データ: [`packages/nostr/storage/`](../../packages/nostr/storage/)
