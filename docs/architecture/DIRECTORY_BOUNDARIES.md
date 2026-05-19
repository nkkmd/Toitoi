# ディレクトリ責務ルール

## 目的

このドキュメントは、Toitoi リポジトリにおけるディレクトリ配置の判断基準を定義します。

狙いは、実装が進んでも「どこに何を置くべきか」の意味を安定させることです。

---

## 基本原則

ファイルは「現時点の形」ではなく、「将来を含む責務」によって配置します。

迷ったときは、次の順で判断します。

1. これは配備される実行アプリか
2. これはインフラ運用のための資産か
3. これは再利用される共通モジュールか
4. これは横断的な仕様・思想ドキュメントか

---

## 各ディレクトリの役割

### `apps/`

配備されるアプリケーション本体（実行単位）を置きます。

例:

- frontend
- edge AI
- 将来的な API 実装コード（このリポジトリで管理する場合）

---

### `infra/`

インフラ運用・構築・監視に関する資産を置きます。

例:

- relay / indexer のセットアップ手順
- 運用手順、監視手順
- 将来的な `docker-compose`、`Caddyfile`、`pm2` 設定、監視設定

ドキュメント中心の段階でも、責務がインフラ運用なら `infra/` に置きます。

---

### `packages/`

複数のアプリ・サービスから利用される再利用可能コードを置きます。

例:

- transport adapter
- canonical converter
- protocol utility

デプロイ手順書や運用手順は `packages/` に置きません。

---

### `docs/`

特定モジュールに閉じない、横断的な仕様・思想・設計文書を置きます。

例:

- architecture
- protocol specification
- concepts / essays / roadmap

---

## 多プロトコル拡張時の配置

transports と indexers は、同じ粒度でプロトコル別に揃えます。

```text
infra/
├── transports/
│   ├── nostr/
│   ├── atproto/        (future)
│   └── activitypub/    (future)
└── indexers/
    ├── nostr/
    ├── atproto/        (future)
    └── activitypub/    (future)
```

この対称性を維持することで、責務と探索性を保てます。

---

## 配置クイックガイド

- 配備される実行アプリ: `apps/`
- インフラ構築/運用資産: `infra/`
- 再利用コード: `packages/`
- 横断仕様・思想文書: `docs/`

---

## 移行ポリシー

1. 一時的な都合より責務の安定性を優先する
2. ファイル移動は責務変更が起きたときだけ行う
3. 移動時はリンク更新を同一変更で完了させる
4. `README.md` と `REPOSITORY_STRUCTURE.md` を必ず同期する
