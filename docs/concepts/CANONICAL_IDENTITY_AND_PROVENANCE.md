# 記録の同一性と来歴

**状態: 現行実装に対応** | **最終更新: 2026-10-20**

## 目的

この文書は、「同じ記録か」「どこから来たか」「何から派生したか」をToitoiでどう区別するかを説明します。Nostr、Lingonberry、ATProtoなどの配信方式をまたいでも、来歴と元データへの参照を失わずに記録を扱うための基準です。

例えば、一つの問いを三つの配信先へ送った場合、各配信先には別の識別子が付きます。それでも、明示的な対応表があれば、Toitoi内では元の一つの問いとして参照できます。一方、別々に生まれた似た問いを、文章が似ているだけで統合することはありません。

## 区別する概念

| 用語 | 意味 |
|---|---|
| transport identity | 各配信方式で元の記録を指す識別情報 |
| canonical identity | Toitoi内で一つのCanonical Eventを指す同一性 |
| identity key | 意味上の安定した内容から計算する照合キー |
| identity claim | 照合キーとCanonical IDの対応を示す、検証可能な申告 |
| provenance | どの出典から、どの文脈で記録が成立したかを表す来歴 |
| lineage | どの問いや観察から派生・統合されたかを表す関係 |
| rawRef | 別に保存した元データへ戻るための参照 |

来歴は同一性の判定そのものではなく、元データへの参照もイベントの意味そのものではありません。

## 用語

### transport identity

Nostrではイベントの`id`、Lingonberryではオブジェクトの`id`、ATProtoでは`uri`、`cid`、`did`、`rkey`などが、元の記録の識別や検証に使われます。

これらは各配信方式の識別情報です。Toitoi内のCanonical Eventの同一性とは分けて扱います。

### canonical identity

Toitoi内で一つのイベントを指す主な識別子は、`tt:evt:<opaque-id>`形式のCanonical IDです。IDの内部構造や内容の類似から、意味を推測して同一性を決めません。

現行実装の`resolveCanonicalEventId(...)`は、次の優先順位でIDを決めます。

1. 明示的に指定された有効なIDを使う。
2. `sourceId`に対応するIDが`canonicalIdMap`にあれば使う。
3. どちらもなければ、新しいUUIDに基づくIDを発行する。

**同じ元データや同じsourceIdだけでは、同じCanonical IDは再生成されません。** 再処理でIDを保つには、明示的なIDや保存済みの対応情報が必要です。`sourceId`は対応表の照合キーであり、IDを内容から計算するための入力ではありません。

### identity key

Canonical Eventの意味上の安定した内容から、同じ規則で再計算できる照合キーです。Canonical IDそのものではありません。

- 内容の正規化規則と規則バージョンを使う。
- 来歴情報、rawRef、配信先、保存上の補助情報は入力にしない。
- 配列やオブジェクトの順序の違いは、正規化で吸収する。
- 送信側・受信側・第三者が、同じ入力と規則から再計算できるようにする。

照合キーの生成と、Canonical IDの発行・解決は別の処理です。

### identity claim

照合キーとCanonical IDの対応を、第三者が検証できる形で示す申告です。来歴情報を置き換えるものではありません。

最小構成は`schemaVersion`、`claimType`、`ruleVersion`、`identityKey`、`canonicalId`、`issuer`、`issuedAt`、`verification`です。現行の`schemaVersion`は`0.1.0`です。

JSON形式で保持し、発行者・署名者と署名や検証手段を記録します。検証方式は差し替え可能です。

### provenance

記録がどの出典から来たか、統合時にどの出典が集約されたかを残します。再処理時の追跡や、APIでの説明に使います。

出典プロトコル、出典ID、日時、取得場所、参照用の補助情報、出典固有のメタデータなどが対象です。文章の類似による統合判断や、同一性を決める主なロジックの代わりにはしません。配信結果も、出典の識別とは分けて記録します。

### rawRef

元のイベントやデータ本体を再取得するための参照です。再処理、再変換、監査、保存領域の復旧を支えます。

`protocol`、`sourceId`、`relay`などの取得先、`storage`、`storageId`、`payloadHash`を持ち得ます。同一性の判断、イベントの意味、統合の妥当性を表すものではありません。

## 同一と判断できる条件

明示的な根拠がある場合に限ります。

- 同じCanonical IDを持つ。
- アダプターや変換器で、同一性が明示的に確定している。
- 再処理・移行時に、保存済みIDや同一性の対応表を使える。

次の情報は、それだけでは統合の根拠にしません。

- 本文が似ている。
- ラベルが一致する。
- 日時が近い。
- 関係の構造が似ている。
- DSL表現が似ている。

## 処理段階ごとの識別情報

| 段階 | 扱う情報 |
|---|---|
| 元データ | 配信方式固有の識別子 |
| 取り込み・正規化 | 署名、入力形式、重複、順序を検証した記録。これだけで意味上の同一性は確定しない |
| Canonical Event生成 | 明示的なIDや対応表を使ってIDを解決し、なければ新規発行 |
| 来歴・派生関係 | 出典、派生元、統合元の記録。Canonical IDとは役割が異なる |

## IDを保持して再処理するための条件

再処理に必要な元データと、保存済みIDまたは対応表を保持します。変換規則、照合キーの正規化規則、申告の検証規則のバージョンも管理します。

保持する情報:

- 元データの識別情報
- 明示的なIDの対応表
- `rawRef`
- `provenance.sources[]`
- 配信方式固有の出典メタデータ
- 保存記録の`canonicalEventId`

元データや対応表が欠損した場合、または規則が変わった場合は、IDや内容の再現を無条件には保証できません。曖昧な記録は、無理に同一扱いせず別々に保持します。

## 配信方式ごとのsourceId

| 配信方式 | sourceIdに使う項目 | 例 |
|---|---|---|
| Nostr | `event.id` | `abc123...` |
| Lingonberry | `object.id` | `lb:obj:...` |
| ATProto | `record.uri`または`uri` | `at://did:plc:.../app.toitoi.inquiry/rkey...` |

ATProtoの`cid`、`did`、`collection`、`rkey`は検証・来歴・追跡に役立ちますが、現行の対応表の主なキーは`uri`です。

対応表を使うとは、これらのsourceIdから既存のCanonical IDを明示的に引ける状態を指します。NostrやATProtoだけでなく、LingonberryのオブジェクトIDも対象です。

## 一つの問いを複数の配信先へ送る場合

元のCanonical Eventを`A`、Nostr経由で取り込み直した記録を`B`、Lingonberry経由を`C`、ATProto経由を`D`とします。

`A -> B`、`A -> C`、`A -> D`で同じIDを保持するには、往復変換の対応情報が必要です。別々の配信元から似た記録を独立に取り込む場合とは、条件が異なります。

| 違い | ID解決への影響 |
|---|---|
| sourceIdや対応表が異なる | 同じIDへ解決できない場合がある |
| 元データ・保存済みIDが欠損している | 以前のIDを復元できない場合がある |
| 本文だけが異なる | ID解決への直接入力ではない。ただし照合キーや意味内容には影響し得る |
| 来歴やrawRefの補助情報が異なる | ID解決への直接入力ではない |
| ラベルやDSLの配信表現が異なる | それ自体はID解決への直接入力ではない |
| 変換規則が変わる | 再構成される意味内容や互換性を確認する必要がある |

例えば100件の問いを三つの配信方式へ送り、APIでは100件として表示したい場合、同じCanonical IDを使える対応表や保存情報が必要です。対応情報なしで独立に取り込むと、内容が同じでも300件として扱われることがあります。

## 統合するときの扱い

同一性を明示的に確認できた記録を統合する場合は、`provenance.sources[]`を集約し、最初のrawRefなど追跡可能な元データへの参照を保ちます。派生関係があれば、それも残します。

曖昧な記録は統合しません。来歴の集約は、新たな同一性を推測する処理ではありません。

## 複数経路への配信と取り込み

### fan-out

一つのCanonical Eventを、複数の配信方式の表現へ変換して送ることです。Toitoi側のCanonical IDは変更しません。

- Nostr向けにはNostrイベントの下書きを作る。
- Lingonberry向けにはオブジェクトの下書きを作る。
- ATProto向けにはレコードの下書きを作る。

現行の各方式の出力には、Canonical IDそのものを埋め込まない設計です。取り込み直す際に同じIDを使うための対応情報は、別に管理します。

### fan-in

複数の配信方式から元の記録を集め、Canonical Eventへ変換することです。元データの識別子と対応表、または保存済みIDを使ってIDを解決します。識別子だけから同じIDが自動再生成されるわけではありません。

## 各方式で保持する情報

| 配信方式 | 主な出典・参照情報 |
|---|---|
| Nostr | `provenance.sources[].sourceId`と`rawRef.sourceId`にイベントID、rawRefにリレーなどの取得情報 |
| Lingonberry | 出典のsourceIdとobjectId、rawRefのsourceIdにオブジェクトID |
| ATProto | 出典とrawRefのsourceIdにURI、出典にcid・did・collection・rkeyなど |

いずれもCanonical Event本体の`id`とは区別します。Nostrの`e`タグは、派生関係をNostrの表現で示すものであり、Canonical IDそのものではありません。

## 保存形式と再処理

元データとCanonical Eventは、分けて保存します。

- 元データ側: 元のイベントやレコード、`canonicalEventId`、検証・重複排除の情報、出典メタデータ
- Canonical Event側: イベント本体、`id`、`provenance`、`rawRef`

保存データの再処理（replay）は、元データからもう一度Canonical Eventを構成する処理です。現行の保存処理は、元データの保存記録にある`canonicalEventId`を使って対応表を復元します。保存済みIDを保った再処理と、対応表のない新規取り込みを区別してください。

## Standard APIでの扱い

Standard APIは、元イベントの全文ではなく共通の参照形式を返します。

- 来歴を追跡できる最小限の情報を返す。
- 必要に応じてrawRefを返す。
- 配信方式固有の詳細を最小限にする。
- Canonical IDを主なキーとして扱う。

## 典型的な流れ

1. 配信経路から元の記録を取得する。
2. 入力検査、署名検証、重複排除、正規化を行う。
3. 意味内容を構成し、Canonical IDを解決または新規発行する。
4. 来歴情報と元データへの参照を付ける。
5. 元データとCanonical Eventを分け、再処理用の対応情報も保存する。
6. 再処理では保存済みIDを復元して、Canonical Eventを再構成する。
7. 同一性が明示的に確定した場合に限り、来歴を集約する。

## 関連する仕様と実装

- `docs/protocols/CANONICAL_EVENT.md`
- `docs/architecture/MULTI_TRANSPORT_IDENTITY_POLICY.md`
- `docs/protocols/INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md`
- `schemas/identity-claim.schema.json`
- `packages/protocol/canonical_identity.js`
- `packages/protocol/identity_verification.js`
- `packages/protocol/test_canonical_identity.js`
- `packages/nostr/adapter/nostr_adapter.js`
- `packages/lingonberry/adapter/lingonberry_adapter.js`
- `packages/atproto/adapter/atproto_adapter.js`
- `packages/nostr/storage/replay.js`
- `packages/lingonberry/storage/replay.js`
- `packages/atproto/storage/replay.js`
- `apps/api/standard_api_service.js`
