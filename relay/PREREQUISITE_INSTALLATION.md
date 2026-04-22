# 必須ソフトウェア インストールガイド

このドキュメントは、Nostrリレー構築に必須なソフトウェアの詳細なインストール手順を説明します。

対象OS: **Ubuntu 22.04 LTS / Debian 12**

---

## 目次

1. [前提条件](#前提条件)
2. [Git のインストール](#git-のインストール)
3. [Docker のインストール](#docker-のインストール)
4. [Docker Compose v2 のインストール](#docker-compose-v2-のインストール)
5. [nak（Nostr CLIツール）のインストール](#naknostr-cliツールのインストール)
6. [すべてのインストール完了確認](#すべてのインストール完了確認)

---

## 前提条件

- **OS**: Ubuntu 22.04 LTS または Debian 12
- **ユーザー権限**: 管理者権限（`sudo`）を使用できること
- **インターネット接続**: パッケージダウンロード用に必須
- **ターミナル**: SSH接続またはローカルターミナルで Bash シェルを使用

### システムの更新

インストール前に、システムパッケージを最新の状態に更新しておくことを強く推奨します。

```bash
sudo apt update
sudo apt upgrade -y
```

---

## Git のインストール

### Step 1: リポジトリの設定とインストール

```bash
# 依存パッケージをインストール
sudo apt install -y curl wget software-properties-common

# Gitをインストール
sudo apt install -y git
```

### Step 2: インストール確認

```bash
git --version
```

**期待される出力例:**
```
git version 2.34.1
```

### Step 3: Git の初期設定（リレーサーバー側で必要）

```bash
# グローバル設定を行う（リレー運用者名とメールアドレス）
git config --global user.name "Agroecology Commons Relay"
git config --global user.email "admin@your-domain.com"

# 設定を確認
git config --global --list
```

---

## Docker のインストール

### Step 1: 既存の古い Docker バージョンをアンインストール（存在する場合）

```bash
sudo apt remove -y docker docker.io containerd runc
```

### Step 2: Docker 公式リポジトリのセットアップ

OSによってリポジトリURLが異なります。以下のどちらかを実行してください。

#### Ubuntu 22.04 LTS の場合

```bash
# 必須パッケージをインストール
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Docker の公式 GPG キーをダウンロード
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker リポジトリを追加
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

#### Debian 12 の場合

```bash
# 必須パッケージをインストール
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Docker の公式 GPG キーをダウンロード
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker リポジトリを追加
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

> **確認方法:** OS が不明な場合は `cat /etc/os-release` を実行し、`ID=ubuntu` または `ID=debian` を確認してください。

### Step 3: Docker CE（Community Edition）のインストール

```bash
# パッケージリストを更新
sudo apt update

# Docker をインストール
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Step 4: Docker デーモンの起動と自動起動の設定

```bash
# Docker サービスを起動
sudo systemctl start docker

# ブート時に自動起動するよう設定
sudo systemctl enable docker

# 起動状態を確認
sudo systemctl status docker
```

**期待される出力例:**
```
● docker.service - Docker Application Container Engine
     Loaded: loaded (/lib/systemd/system/docker.service; enabled; vendor preset: enabled)
     Active: active (running)
```

### Step 5: 一般ユーザーが docker コマンドを使用できるようにする

```bash
# docker グループにユーザーを追加
sudo usermod -aG docker $USER

# グループの変更を反映させるため、ログアウト・ログインするか以下を実行
newgrp docker

# または、ターミナルを再起動してください
```

### Step 6: Docker インストール確認

```bash
docker --version
docker run hello-world
```

**期待される出力例:**
```
Docker version 24.0.0 (またはそれ以上)

Hello from Docker!
This message shows that your installation appears to be working correctly.
```

---

## Docker Compose v2 のインストール

### 確認: Docker Compose v2 プラグインのインストール状態

Docker CE をインストールする際に `docker-compose-plugin` パッケージをインストールしているため、**Docker Compose v2 はすでにインストール済み**です。

### インストール確認

```bash
docker compose version
```

**期待される出力例:**
```
Docker Compose version v2.17.3 (またはそれ以上)
```

### トラブルシューティング: 古い docker-compose コマンドについて

**古い docker-compose（v1）を使用している場合:**

```bash
# 古いバージョンをアンインストール
sudo apt remove -y docker-compose

# 新しいバージョン（v2）を確認
docker compose version  # 新しいコマンド
```

> **重要:** 
> - **新:** `docker compose` (v2 - Docker の公式プラグイン)
> - **旧:** `docker-compose` (v1 - 非推奨)
> 
> Nostream の構築には **`docker compose` (v2 ハイフンなし)** を使用してください。

---

## nak（Nostr CLIツール）のインストール

`nak` は、Nostr イベントを操作するための軽量 CLI ツールです。JSONLアーカイブ機能（§6）で必須です。

### Step 1: 前提条件の確認

```bash
# curl がインストールされていることを確認
which curl
```

### Step 2: nak のダウンロードとインストール

```bash
# 最新版のバイナリをダウンロード（sudo が必要）
sudo curl -L https://github.com/fiatjaf/nak/releases/latest/download/nak-linux-amd64 -o /usr/local/bin/nak

# 実行権限を付与（sudo が必要）
sudo chmod +x /usr/local/bin/nak

# パスが通っていることを確認
which nak
```

> **注意:** nak のリリースファイル名はバージョンによって変更される可能性があります。最新のリリース（v0.19.7時点）では `nak-v0.19.7-linux-amd64` というファイル名ですが、`/latest/download/nak-linux-amd64` のURLは自動的に最新版を指します。もしダウンロードが失敗する場合は、[GitHub Releasesページ](https://github.com/fiatjaf/nak/releases/latest)で最新のLinux AMD64バイナリを確認してください。

### Step 3: nak インストール確認

```bash
nak --version
```

**期待される出力例:**
```
nak v0.7.x (またはそれ以上)
```

### Step 4: nak の基本的な使用確認

```bash
# ヘルプ表示
nak --help

# または
nak help
```

**期待される主なコマンド:**
```
nak - nostr toolbelt

USAGE:
    nak <COMMAND>

COMMANDS:
    event     Create and publish events
    req       Request events from a relay
    home      Set the home relay
    ...
```

---

## すべてのインストール完了確認

### 統合確認スクリプト

以下のスクリプトで、すべての必須ソフトウェアが正しくインストールされているか確認できます。

```bash
#!/bin/bash
# prerequisite_check.sh

echo "===== 必須ソフトウェア インストール確認 ====="
echo ""

# Git
echo "✓ Git:"
if command -v git &> /dev/null; then
    git --version
else
    echo "  ⚠ Git がインストールされていません"
fi

# Docker
echo ""
echo "✓ Docker:"
if command -v docker &> /dev/null; then
    docker --version
else
    echo "  ⚠ Docker がインストールされていません"
fi

# Docker Compose v2
echo ""
echo "✓ Docker Compose v2:"
if docker compose version &> /dev/null; then
    docker compose version
else
    echo "  ⚠ Docker Compose v2 がインストールされていません"
fi

# nak
echo ""
echo "✓ nak (Nostr CLI):"
if command -v nak &> /dev/null; then
    nak --version
else
    echo "  ⚠ nak がインストールされていません"
fi

echo ""
echo "===== 確認完了 ====="
```

### 手動確認コマンド

```bash
git --version && \
docker --version && \
docker compose version && \
nak --version && \
echo "✅ すべての必須ソフトウェアがインストール済みです！"
```

---

## よくある問題とトラブルシューティング

### 問題 1: `docker` コマンドが見つからない

**原因:** Docker がインストールされていないか、PATH が設定されていない。

**解決法:**
```bash
# 再度インストールを実行
sudo apt install -y docker-ce docker-ce-cli containerd.io

# PATH の確認
echo $PATH

# Docker デーモンが起動しているか確認
sudo systemctl status docker
```

### 問題 2: `docker compose` コマンドではなく `docker-compose` を使うように言われる

**原因:** 古い docker-compose（v1）がインストールされている。

**解決法:**
```bash
# 古いバージョンをアンインストール
sudo apt remove -y docker-compose

# 新しいバージョンを確認
docker compose version
```

### 問題 3: ユーザーが `docker` コマンドを実行できない（Permission denied）

**原因:** 現在のユーザーが `docker` グループに属していない。

**解決法:**
```bash
# docker グループにユーザーを追加
sudo usermod -aG docker $USER

# グループの変更を反映（オプション 1: ターミナル再起動）
# または以下で即座に反映
newgrp docker

# 確認
docker ps
```

### 問題 4: nak が見つからない

**原因:** ダウンロードが失敗したか、PATH が設定されていない。

**解決法:**
```bash
# 手動でダウンロード確認
ls -lah /usr/local/bin/nak

# 実行権限を再度付与
sudo chmod +x /usr/local/bin/nak

# PATH を確認
echo $PATH

# 再度ダウンロード
sudo curl -L https://github.com/fiatjaf/nak/releases/latest/download/nak-linux-amd64 -o /usr/local/bin/nak
sudo chmod +x /usr/local/bin/nak
```

### 問題 5: `apt update` でキーエラーが出る

**原因:** GPG キーが正しく登録されていない。

**解決法:**

Ubuntu の場合:
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
sudo apt clean
sudo apt update
```

Debian の場合:
```bash
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
sudo apt clean
sudo apt update
```

---

## 次のステップ

すべての必須ソフトウェアのインストールが完了したら、[NOSTR_RELAY_SETUP.md](./NOSTR_RELAY_SETUP.md) の **Step 2.1** に進んでください。

---

## 参考資料

- **Git 公式ドキュメント:** https://git-scm.com/doc
- **Docker 公式インストールガイド（Ubuntu）:** https://docs.docker.com/engine/install/ubuntu/
- **Docker 公式インストールガイド（Debian）:** https://docs.docker.com/engine/install/debian/
- **Docker Compose v2 ドキュメント:** https://docs.docker.com/compose/
- **nak GitHub リポジトリ:** https://github.com/fiatjaf/nak

---

*このガイドはデジタル・アグロエコロジー・コモンズ推進プロジェクトの一環として作成されました。*
*最終更新: 2026年4月*