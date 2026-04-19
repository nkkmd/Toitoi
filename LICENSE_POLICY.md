# Toitoi ライセンス・ポリシー (License Policy)

*[English follows below]*

Toitoiプロジェクトは、『[テクノロジーを手放す農業論](./Tech-wo-Tebanasu-Nogyoron.md)』に基づく「デジタル・アグロエコロジー・コモンズ」を実現するためのオープンソース・プロジェクトです。

本プロジェクトの最大の目的は、**「農家同士の暗黙知（問いの系譜）が特定のプラットフォーム資本によって囲い込まれるのを防ぎ、人類の共有財産（コモンズ）として永続させること」** にあります。

この思想を法的なレベルで担保しつつ、多様な開発者や企業のエコシステム参画を促すため、Toitoiではコンポーネント（モジュール）の役割に応じて複数のライセンスを組み合わせる **「デュアル・ライセンス・アプローチ」** を採用しています。

---

## 1. ライセンスの全体構成

| コンポーネント | 適用ライセンス | 目的 |
| :--- | :--- | :--- |
| **① コモンズ・リレー ＆ インデクサーAPI**<br>(バックエンドインフラ) | **GNU AGPLv3** | インフラの囲い込み（クローズドなSaaS化）を防止し、コモンズを防衛する |
| **② フロントエンド ＆ ローカルAI送信ツール**<br>(クライアントアプリ) | **MIT License** | 企業や個人の参入障壁を下げ、エコシステム（UIやデバイス）の多様性を最大化する |
| **③ データスキーマ ＆ ドキュメント**<br>(問いの形式、アーキテクチャ設計書) | **CC BY-SA 4.0** | 思想の歪曲を防ぎ、派生した規格もコモンズに還元させる |

---

## 2. 各ライセンスの採択理由と詳細

### ① コモンズ・リレー層 / インデクサーAPI層
**👉 GNU Affero General Public License v3.0 (AGPLv3)**

ネットワークの基盤となるリレー・サーバーやAPIのソースコードには、AGPLv3を適用しています。
*   **なぜAGPLなのか:** 巨大なアグリテック企業などがToitoiのサーバーコードをコピー・改変し、「自社のクローズドな有料クラウドサービス（SaaS）」として提供し、データを囲い込むことを防ぐためです。
*   **ルールの核心:** AGPLv3では、ネットワーク越しにサービスを提供する場合でも、**コードに変更を加えた場合はそのソースコードをオープンソースとして全公開する義務**が生じます。これにより、コモンズを利用して得た技術的進歩は、必ずコモンズに還元されることが保証されます。

### ② クライアント・アプリ層 / ローカル・エッジ層
**👉 MIT License**

農家の手元で動くスマートフォンアプリ、ダッシュボードUI、およびローカルAIからNostrネットワークへ送信するクライアントスクリプトには、制限の緩いMITライセンスを適用しています。
*   **なぜMITなのか:** コモンズ（リレー）のデータを利用する「入り口（アプリ）」は、多様であればあるほど良いためです。
*   **ルールの核心:** スタートアップ企業やセンサーメーカーが、Toitoiのクライアントコードを自社の商用アプリや専用IoTデバイスに自由に組み込み、販売することができます（コードの公開義務もありません）。「インフラはAGPLで守り、アプリはMITで自由に競争させる」ことで、コモンズへの参加者を爆発的に増やします。

### ③ データスキーマ定義 / 思想的ドキュメント
**👉 Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**

本プロジェクトの核である「バウンダリー・オブジェクト（問いの形式）」のJSONスキーマ定義、および『テクノロジーを手放す農業論』に基づくアーキテクチャ解説ドキュメントに適用されます。
*   **ルールの核心:** 「原作者（Toitoiプロジェクト）のクレジットを表示すること（BY）」、および「このドキュメントやスキーマを改変して新しいものを公開する場合、同じCC BY-SA 4.0ライセンスで公開すること（SA = ShareAlike）」を条件とします。これにより、プロジェクトの理念が歪められたり、プロプライエタリ（非公開）な規格に吸収されたりすることを防ぎます。

---

## 3. コントリビューター（開発者・研究者）の皆様へ

Toitoiは、特定の管理者が支配するプラットフォームではなく、プロトコル（ルール）です。

あなたが新しい機能を追加したり、バグを修正したり、独自の地域リレーを立ち上げたりすることは、アグロエコロジーの「翻訳的共進化」そのものです。
プルリクエスト（コードの提案）を送信する際は、上記のライセンス・ポリシーに同意いただいたものとみなします。

農家の自律と、生態系との共進化を支えるインフラを、ともに育てていきましょう。

---

# Toitoi License Policy (English)

The Toitoi project is an open-source initiative aimed at realizing a "Digital Agroecology Commons" based on the philosophy of "[Letting Go of Technology in Agriculture](./Letting-Go-of-Technology-in-Agriculture.md)".
The primary goal of this project is to **"prevent the tacit knowledge (the lineage of inquiries) among farmers from being enclosed by platform capitalism, and to perpetuate it as a shared asset (commons) of humanity."**

To legally guarantee this philosophy while encouraging the participation of diverse developers and enterprises in the ecosystem, Toitoi adopts a **"Multi-License Approach,"** combining different licenses depending on the role of each component (module).

---

## 1. Overall License Structure

| Component | Applied License | Purpose |
| :--- | :--- | :--- |
| **1. Commons Relay & Indexer API**<br>(Backend Infrastructure) | **GNU AGPLv3** | Defend the commons by preventing infrastructure enclosure (closed SaaSification). |
| **2. Frontend & Edge AI Tools**<br>(Client Applications) | **MIT License** | Maximize ecosystem diversity (UIs and devices) by lowering barriers for companies and individuals. |
| **3. Data Schema & Documentation**<br>(Inquiry Formats, Architecture Docs) | **CC BY-SA 4.0** | Prevent distortion of philosophy and ensure derived standards are contributed back to the commons. |

---

## 2. Reasons and Details for Each License

### 1. Commons Relay Layer / Indexer API Layer
**👉 GNU Affero General Public License v3.0 (AGPLv3)**

The source code for the relay servers and APIs, which form the foundation of the network, is licensed under the AGPLv3.
*   **Why AGPL?** To prevent large agritech companies from copying or modifying the Toitoi server code and offering it as a "closed, paid cloud service (SaaS)," thereby enclosing the data.
*   **Core Rule:** Under AGPLv3, even if the software is provided as a service over a network, **if the code has been modified, the complete source code must be made publicly available as open source**. This ensures that any technological advancements gained using the commons are always returned to the commons.

### 2. Client Application Layer / Local Edge Layer
**👉 MIT License**

Client scripts that send data from the local AI to the Nostr network, smartphone apps, and dashboard UIs running on the farmer's end are licensed under the permissive MIT License.
*   **Why MIT?** Because the "entry points (apps)" that utilize the data from the commons (relays) should be as diverse as possible.
*   **Core Rule:** Startups and sensor manufacturers can freely incorporate Toitoi's client code into their commercial apps or proprietary IoT devices and sell them (with no obligation to disclose their source code). By "protecting the infrastructure with AGPL and letting apps compete freely with MIT," we can explosively increase participation in the commons.

### 3. Data Schema Definition / Philosophical Documentation
**👉 Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**

This applies to the JSON schema definitions of the "Boundary Object (Form of Inquiry)"—the core of this project—and the architectural documentation based on our philosophy.
*   **Core Rule:** Requires "attribution to the original author (Toitoi Project)" (BY) and demands that "if you remix, transform, or build upon the material, you must distribute your contributions under the same license" (ShareAlike - SA). This prevents the project's ideals from being distorted or absorbed into proprietary (closed) standards.

---

## 3. To Contributors (Developers & Researchers)

Toitoi is not a platform controlled by specific administrators; it is a protocol (a set of rules).

When you add new features, fix bugs, or launch your own local relay, you are participating in the "translational co-evolution" of agroecology itself. By submitting a Pull Request, you agree that your contributions will be licensed under the policies stated above.

Let's grow the infrastructure that supports farmers' autonomy and co-evolution with ecosystems together.

---
*If you have any questions regarding commercial use or custom licensing of the client applications, please open an issue.*
