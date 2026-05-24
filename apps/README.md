# Apps

`apps/` は、配備される実行アプリケーションを置くディレクトリです。

ここには、ユーザーや外部クライアントから直接触れる実行単位だけを置きます。  
共通ロジックは `packages/` に、運用用の入口は `infra/` に分けます。

## 全体像

```text
apps/
├─ frontend/  -> UI / viewer
├─ edge-ai/   -> local AI runtime
└─ api/       -> Standard API
```

## 役割

- `frontend/`: UI や viewer の実装
- `edge-ai/`: ローカル推論や AI 連携の実行層
- `api/`: Standard API の reference implementation

## 読み方

まずは各アプリ固有の README を見ます。

- [api/README.md](/home/oruorane/github/Toitoi/apps/api/README.md)

## 依存の考え方

- `apps/*` は必要に応じて `packages/*` を利用します
- `apps/*` 同士は、直接結合しすぎないようにします
- 共有したい処理は `packages/` に寄せます
