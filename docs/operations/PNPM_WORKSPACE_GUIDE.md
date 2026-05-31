# pnpm Workspace 早見表

`pnpm` をあまり使ったことがない人向けの、Toitoi 用の最小ガイドです。

このガイドは、リポジトリをすでに `git clone` してある前提で読めるようにしています。
あわせて、基本的にはリポジトリの root から実行する想定です。

このリポジトリでは `apps/`、`infra/`、`packages/` を `pnpm workspace` でまとめて扱います。  
`pnpm` は「依存を入れる」「対象の package だけ動かす」「package 間をローカル接続する」を楽にするための道具です。

## まず覚える3つ

### 0. Node.js を入れる

`corepack` は Node.js に付いているので、まず Node.js を用意します。  
この repo では、まず `node` と `corepack` が使える状態にすることが前提です。

まずは次を確認します。

```bash
node --version
corepack --version
```

`node` が見つからない場合は、Node.js をインストールしてください。入れ方の例は次のとおりです。

- macOS
  - 公式インストーラを使う
  - `nvm` を使う
  - `brew install node` を使う
- Linux
  - 公式インストーラを使う
  - `nvm` を使う
  - ディストリビューションのパッケージマネージャを使う
- Windows
  - 公式インストーラを使う
  - `nvm-windows` を使う

Node.js を入れたあと、`corepack` を有効化します。

```bash
corepack enable
corepack --version
```

### 1. pnpm を用意する

この repo は `package.json` の `packageManager` に `pnpm@11.3.0` を指定しています。  
`pnpm` がまだ入っていない場合は、まず `corepack` を有効化してから使います。

```bash
corepack enable
corepack pnpm --version
```

`corepack pnpm` は、`package.json` に書かれた版の `pnpm` を使います。  
もし明示的に同じ版を固定したい場合は、次のようにもできます。

```bash
corepack prepare pnpm@11.3.0 --activate
corepack pnpm --version
```

### 2. 依存を入れる

```bash
corepack pnpm install
```

workspace の依存をまとめて入れます。まず最初に 1 回だけ実行することが多いです。

### 3. 入口を指定して実行する

```bash
corepack pnpm --filter @toitoi/api start
corepack pnpm --filter @toitoi/nostr-transport test
corepack pnpm --filter @toitoi/nostr replay -- --storage-dir /path/to/storage --verify
```

- `--filter` は「この package だけ」を指します
- `@toitoi/api` などは package 名です
- `--` の後ろは、その package の script に渡す引数です

### 4. ルートから全体を回す

```bash
corepack pnpm test
```

ルートの `package.json` で定義している script をまとめて実行します。

## よく出る用語

- `workspace`
  - 複数 package を 1 つのリポジトリとして扱う仕組みです
- `filter`
  - 実行対象の package を絞る指定です
- `workspace:*`
  - 同じリポジトリ内の package を参照するときの書き方です
- `script`
  - `package.json` の `start` / `test` などの実行コマンドです

## この repo での使い分け

- `@toitoi/api`
  - HTTP API を起動するとき
- `@toitoi/nostr-transport`
  - relay ingest worker を起動するとき
- `@toitoi/nostr`
  - replay や storage 関連を使うとき

## 困ったとき

- `node` や `corepack` が見つからない場合は、先に Node.js をインストールしてください
- `pnpm` が見つからない場合は、`corepack enable` で有効化できることがあります
- この repo では `pnpm` を直接打つより、`corepack pnpm ...` の形を使うと版ずれを避けやすいです
- `corepack pnpm --filter ...` で対象 package をまず絞ると、原因を追いやすくなります
- `pnpm` の store DB が開けない場合は、`/tmp/toitoi-pnpm-store-v11` のような書き込み可能な場所に store をコピーして、`corepack pnpm install --trust-lockfile --store-dir /tmp/toitoi-pnpm-store-v11` を試すと切り分けしやすいです
- 入口が分からなければ、各 README の `pnpm 入口` を見てください

## 関連

- [README.md](../../README.md)
- [apps/api/README.md](../../apps/api/README.md)
- [infra/transports/nostr/README.md](../../infra/transports/nostr/README.md)
- [infra/indexers/nostr/INDEXER_API_SETUP.md](../../infra/indexers/nostr/INDEXER_API_SETUP.md)
