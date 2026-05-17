# Toitoi 🌱
[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE_POLICY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE_POLICY.md)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](./LICENSE_POLICY.md)

**Digital Agroecology Commons powered by Nostr Protocol**

*[日本語は下に続きます]*

Toitoi is a **decentralized protocol platform (digital commons)** designed to share and evolve agroecological knowledge, based on the philosophy of "[Letting Go of Technology in Agriculture](./docs/essays/letting-go-of-technology-in-agriculture.md)".

Instead of depending on specific companies or centralized servers, it circulates farmers' "ecological intuition (tacit knowledge)" across the network in the form of "inquiries (questions)" that can be translated and adapted by others.

> **Note:** Toitoi is an experimental project that aims to implement, as actual open-source software, the "inquiry circulation system" conceived within the essay *[Letting Go of Technology in Agriculture](./docs/essays/letting-go-of-technology-in-agriculture.md)*. It is as much a living proof-of-concept for the ideas in that text as it is a piece of software.

## 💡 Project Philosophy: Why Toitoi?

### Toitoi as "Librarian" and "Mycelium"

Toitoi does not treat AI as an authority that delivers universal agricultural answers.

Instead, the AI inside Toitoi behaves more like:

- a librarian connecting contexts and inquiries
- a mycelial network linking distributed observations underground

Rather than replacing farmers' judgment, Toitoi aims to amplify human observation and ecological curiosity.

The system is designed not as a centralized optimization platform, but as a living public library of unresolved ecological questions.

Modern smart agriculture predominantly relies on centralized models that gather raw data into the cloud and deliver "universal prescriptions" to farmers. However, this model eliminates the inherent complexity of local farmlands, deprives farmers of their autonomy, and leads to the "enclosure of knowledge" by platform capitalism.

Toitoi completely overturns this structure:

1. **Circulating "Questions" instead of "Answers"**
   Raw, location-specific data is never exposed to the outside world. The local AI extracts only "inquiries into ecological relationships" (e.g., the relationship between microclimate and weed flora) from the data and releases only those inquiries into the network.
2. **Overcoming the Dilemma of Locality**
   Through a common format defined as a "Boundary Object," farmers in different regions with different climates and soils can connect through "weak ties" without destroying each other's context.
3. **Visualizing the Evolutionary Tree**
   The process of "translational co-evolution" (Actor-Network Theory)—where an inquiry is translated to another farmland and synthesized with different inquiries—is recorded and visualized as a graphical evolutionary tree.

## ⚙️ System Architecture

Toitoi is a "nested commons" composed of 3 modules connected through a common protocol based on Nostr.

* **[Edge Layer] Local AI**: Conceals raw data, generates "inquiries", cryptographically signs them, and publishes them.
* **[Infrastructure Layer] Commons Relay**: A decentralized relay network that permanently archives only "inquiries".
* **[Viewer Layer] Indexer & UI**: Collects distributed inquiries and visualizes them as a mind map.

In the long term, Toitoi aims to preserve knowledge archives through a protocol-independent canonical event structure.

Nostr is currently treated as the first operational transport layer.

## 📚 Documentation

Please refer to the following directories for the overall picture of the project, specifications, and setup guides for each module. *(Note: Currently, most detailed docs are written in Japanese.)*

### Core Documents

* 🏛️ **[Architecture Overview](./docs/architecture/OVERVIEW.md)**
* 📜 **[Event Model](./docs/architecture/EVENT_MODEL.md)**
* 🔌 **[Protocol Abstraction](./docs/architecture/PROTOCOL_ABSTRACTION.md)**
* 📦 **[Canonical JSONL](./docs/protocols/CANONICAL_JSONL.md)**
* 📖 **[Standard Vocabulary List](./docs/concepts/TOITOI_VOCABULARY.md)**
* ⚖️ **[License Policy](./LICENSE_POLICY.md)**

### Essays & Background

* 🌱 **[Letting Go of Technology in Agriculture](./docs/essays/letting-go-of-technology-in-agriculture.md)**
* 🌾 **[テクノロジーを手放す農業論](./docs/essays/tech-wo-tebanasu-nogyoron.md)**

### Module Setup & Design

* 🌐 **Commons Relay Layer**: **[`/relay/NOSTR_RELAY_SETUP.md`](./relay/NOSTR_RELAY_SETUP.md)**
* 🤖 **Local AI Edge Layer**: **[`/edge-ai/EDGE_AI_SETUP.md`](./edge-ai/EDGE_AI_SETUP.md)**
* 🧠 **AI System Overview**: **[`/docs/architecture/AI_SYSTEM_OVERVIEW.md`](./docs/architecture/AI_SYSTEM_OVERVIEW.md)**
* ⚙️ **Indexer API Layer**: **[`/indexer-api/INDEXER_API_SETUP.md`](./indexer-api/INDEXER_API_SETUP.md)**
* 📱 **Frontend UI Layer**: **[`/frontend/FRONTEND_UX_DESIGN.md`](./frontend/FRONTEND_UX_DESIGN.md)**

### Repository Structure

For the overall repository layout and directory responsibilities, see:

* 🗂️ **[Repository Structure](./REPOSITORY_STRUCTURE.md)**

This document explains:

- repository organization
- module responsibilities
- documentation structure
- protocol / concept / architecture separation
- long-term extensibility strategy

## 🟢 Live Endpoints

* **Relay server**: `wss://relay.toitoi.cultivationdata.net`
* **API**: `https://api.toitoi.cultivationdata.net`

> These endpoints are currently live. Additional relay and API instances will be added over time as the commons grows.

## 🤝 Contribution & Community

Toitoi is not just software; it is a "protocol" and a "commons."

We welcome all forms of participation: proposing new relationship tags (TIPs), hosting a relay server, improving local AI prompts, or developing the frontend.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for details.

> *"Using technology to let go of technology. Bringing theory as the foundation of muddy practice to farmlands worldwide."*

## ⚖️ License

To balance the defense of the commons with the expansion of the ecosystem, the Toitoi project adopts different open-source licenses for different modules.

Please see [LICENSE_POLICY.md](./LICENSE_POLICY.md) for details.

* **Relay & Indexer (Infrastructure):** [GNU AGPLv3](./LICENSE-AGPL)
* **Frontend & Edge Client:** [MIT License](./LICENSE-MIT)
* **Protocol Schema & Docs:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

---

# Toitoi 🌱

**Digital Agroecology Commons powered by Nostr Protocol**

Toitoi（トイトイ）は、『[テクノロジーを手放す農業論](./docs/essays/tech-wo-tebanasu-nogyoron.md)』の思想に基づき、アグロエコロジーの知を共有・進化させるための **分散型プロトコル・プラットフォーム（デジタル・コモンズ）** です。

特定の企業や中央サーバーに依存せず、農家の「生態学的直感（暗黙知）」を、他者が翻訳可能な『問いの形式』としてネットワーク上で循環させます。

> **本プロジェクトについて：** Toitoiは、論考『[テクノロジーを手放す農業論](./docs/essays/tech-wo-tebanasu-nogyoron.md)』のなかで構想した「問いの循環システム」を、実際のOSSとして実装することを目指した実験的プロジェクトです。ソフトウェアであると同時に、あの論考で提示した思想の「泥臭い実証」そのものでもあります。

## 💡 プロジェクトの思想：なぜToitoiなのか？

### Toitoi は「司書」もしくは「菌糸」である

Toitoi は、AIを「普遍的な答えを与える権威」として扱いません。

Toitoi のAIは：

- 文脈と問いを接続する「司書」
- 分散した観察知を地下で結びつける「菌糸」

として振る舞います。

Toitoi が目指すのは、農家の判断を置き換えることではなく、

> 人間の観察力と探究心を増幅すること

です。

Toitoi は、中央集権的な農業最適化プラットフォームではなく、

> 「未解決の生態学的問い」が循環する公共図書館

として設計されています。

現代のスマート農業は、生データをクラウドに集め、農家に「普遍的な処方箋」を下ろす中央集権的なモデルが主流です。しかし、このモデルは農地固有の複雑性を排除し、農家の自律を奪い、プラットフォーム資本による「知識の囲い込み」を生み出します。

Toitoiは、この構造を根底から覆します。

1. **「答え」ではなく「問い」を循環させる**
   農地に固有の生データは絶対に外部に出しません。ローカルAIがデータから「生態学的関係性への問い（例：微気候と雑草相の関係）」を抽出し、それのみをネットワークに放ちます。

2. **属地性のジレンマの克服**
   「バウンダリー・オブジェクト（境界対象）」として定義された共通フォーマットにより、気候や土壌が異なる他地域の農家同士が、互いの文脈を破壊することなく「弱い連帯」で結びつきます。

3. **進化の系統樹の可視化**
   ある問いが他の農地に翻訳され、別の問いと結びつく「翻訳的共進化（アクター・ネットワーク）」の過程を、グラフィカルな系統樹として記録・可視化します。

## ⚙️ システム・アーキテクチャ

Toitoiは、Nostrを基盤とした共通プロトコルによって接続される3つのモジュールから構成される「入れ子構造のコモンズ」です。

* **[エッジ層] ローカルAI**: 生データを秘匿し、「問い」を生成・暗号署名して送信する。
* **[インフラ層] コモンズ・リレー**: 「問い」だけを永続的にアーカイブする分散リレー網。
* **[ビューア層] インデクサー＆UI**: 分散する問いを収集し、マインドマップとして可視化する。

長期的には、Toitoi は protocol-independent な canonical event structure を通じて、知識アーカイブを保存することを目指しています。

現在、Nostr は最初の operational transport layer として扱われています。

## 📚 ドキュメント (Documentation)

本プロジェクトの全体像と、各モジュールの仕様書・構築ガイドは以下のディレクトリを参照してください。

### コア・ドキュメント (Core Documents)

* 🏛️ **[Architecture Overview](./docs/architecture/OVERVIEW.md)**
* 📜 **[Event Model](./docs/architecture/EVENT_MODEL.md)**
* 🔌 **[Protocol Abstraction](./docs/architecture/PROTOCOL_ABSTRACTION.md)**
* 📦 **[Canonical JSONL](./docs/protocols/CANONICAL_JSONL.md)**
* 📖 **[標準語彙リスト](./docs/concepts/TOITOI_VOCABULARY.md)**
* ⚖️ **[ライセンス・ポリシー](./LICENSE_POLICY.md)**

### 論考・背景思想 (Essays & Background)

* 🌱 **[Letting Go of Technology in Agriculture](./docs/essays/letting-go-of-technology-in-agriculture.md)**
* 🌾 **[テクノロジーを手放す農業論](./docs/essays/tech-wo-tebanasu-nogyoron.md)**

### モジュール別セットアップ・設計書 (Modules)

* 🌐 **コモンズ・リレー層**: **[`/relay/NOSTR_RELAY_SETUP.md`](./relay/NOSTR_RELAY_SETUP.md)**
* 🤖 **ローカルAI・エッジ層**: **[`/edge-ai/EDGE_AI_SETUP.md`](./edge-ai/EDGE_AI_SETUP.md)**
* 🧠 **AIシステム概要**: **[`/docs/architecture/AI_SYSTEM_OVERVIEW.md`](./docs/architecture/AI_SYSTEM_OVERVIEW.md)**
* ⚙️ **インデクサー・API層**: **[`/indexer-api/INDEXER_API_SETUP.md`](./indexer-api/INDEXER_API_SETUP.md)**
* 📱 **フロントエンド・UI層**: **[`/frontend/FRONTEND_UX_DESIGN.md`](./frontend/FRONTEND_UX_DESIGN.md)**

### リポジトリ構成 (Repository Structure)

リポジトリ全体の構造と、各ディレクトリの責務については以下を参照してください。

* 🗂️ **[Repository Structure](./REPOSITORY_STRUCTURE.md)**

このドキュメントでは：

- repository 全体構成
- モジュール責務
- documentation structure
- protocol / concept / architecture の分離
- 将来的な拡張方針

を整理しています。

## 🟢 現在稼働中のサーバー

* **リレーサーバー**: `wss://relay.toitoi.cultivationdata.net`
* **API**: `https://api.toitoi.cultivationdata.net`

> これらは現在稼働中のエンドポイントです。今後もコモンズの成長に合わせて、リレーとAPIのインスタンスを順次追加していく予定です。

## 🤝 コントリビューションとコミュニティ

Toitoiは、単なるソフトウェアではなく「プロトコル」であり「コモンズ」です。

新しい関係性タグの提案（TIPs）、リレーサーバーの立ち上げ、ローカルAI用プロンプトの改善、フロントエンドの開発など、あらゆる形での参加を歓迎します。

詳細は [`CONTRIBUTING.md`](./CONTRIBUTING.md) を参照してください。

> *"テクノロジーを使って、テクノロジーを手放す。泥臭い実践の土台としての理論を、世界中の農地へ。"*

## ⚖️ License

Toitoiプロジェクトは、コモンズの防衛とエコシステムの拡大を両立させるため、モジュールごとに異なるオープンソースライセンスを採用しています。

詳細は [LICENSE_POLICY.md](./LICENSE_POLICY.md) を確認してください。

* **Relay & Indexer (Infrastructure):** [GNU AGPLv3](./LICENSE-AGPL)
* **Frontend & Edge Client:** [MIT License](./LICENSE-MIT)
* **Protocol Schema & Docs:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
