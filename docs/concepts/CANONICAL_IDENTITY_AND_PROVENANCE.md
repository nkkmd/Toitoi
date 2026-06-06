# Canonical Identity and Provenance

**Status: stable** | **Last updated: 2026-06-06**

## 目的

この文書は、Toitoi における event identity, canonical identity, identity key / identity claim, provenance, rawRef の関係を 1 本にまとめた正本です。

Toitoi では、単に「同じデータかどうか」を扱うのではなく、

- どの transport から来たのか
- どの raw source に対応するのか
- どの canonical event に収束するのか
- どの条件で同一とみなせるのか

を分けて扱います。

この分離があることで、Nostr, ATProto, 将来の追加 transport をまたいでも、replay と migration に耐える形で knowledge commons を維持できます。

---

## 先に結論

Toitoi の設計では、次の 5 つを混同しません。

1. transport identity
2. canonical identity
3. identity key / identity claim
4. provenance
5. raw reference

ざっくり言うと、

- transport identity は「各 transport での原本の識別子」
- canonical identity は「Toitoi 内部での意味的な主識別子」
- identity key は「canonical identity を引くための再計算可能な照合キー」
- identity claim は「その identity key と canonical identity の対応を示す検証可能な主張」
- provenance は「その canonical event に集約された来歴」
- rawRef は「raw event / raw payload を再取得・再 canonicalize するための入口」

です。

---

## 用語

### transport identity

Nostr であれば event `id`、ATProto であれば `uri` / `cid` / `did` / `rkey` の組み合わせのように、transport 上で raw object を指す識別子です。

これは transport の都合で決まるものであり、Toitoi の semantic identity そのものではありません。

### canonical identity

Toitoi 内部で event を 1 件として扱うための主識別子です。

- `tt:evt:<opaque-id>` 形式を使う
- transport には埋め込まない
- raw payload から再生成できるようにする
- ただし sourceId や identity mapping が同じであることが前提になる

### identity key

canonical event から再計算できる、transport-independent な照合キーです。

- canonicalization ルールに従って決まる
- 送信者だけでなく、受信側や第三者も同じ入力から再計算できる
- canonical id そのものではなく、canonical id を引くための安定したキーとして扱う
- 仕様バージョンを含めて、再現可能性を確保する

### identity claim

identity key と canonical identity の対応を示す、検証可能な主張です。

- identity key
- canonical identity
- ルールバージョン
- issuer / signer
- 署名または検証手段

を含みます。

identity claim は provenance の代替ではなく、同一性の根拠を第三者が検証できるようにするための層です。

### provenance

ある canonical event が、どの source から、どの文脈で成立したかを表す来歴情報です。

### rawRef

raw event または raw payload を再取得するための参照です。

provenance が「どういう来歴か」を表し、rawRef が「どこに戻れば raw を読めるか」を表します。

---

## 何が同一か

Toitoi における同一性は、単純な text similarity ではありません。

同一性の判断に使えるのは、原則として明示的な根拠です。

### 同一性の根拠として使えるもの

- 同一 canonical event id を共有している
- adapter / converter が同一性を明示的に確定している
- replay / migration 時に identity mapping が与えられている

### 同一性の根拠として使わないもの

- body の類似
- labels の一致
- timestamp の近さ
- relationship の構造類似
- DSL の類似

これらは補助情報にはなりますが、単独では merge の根拠にしません。

---

## Identity の階層

Toitoi は identity を次の階層で扱います。

### 1. raw source identity

transport 固有の識別子です。

- Nostr: event id
- ATProto: `uri`, `cid`, `did`, `rkey`

この層は transport の真実であり、canonicalization の入力です。

### 2. normalized source identity

raw source を ingest しやすい形に整えたものです。

- signature verify 済み
- validation 済み
- duplicate 判定済み
- ordering に従って並び替え済み

この層ではまだ semantic identity は確定していません。

### 3. canonical identity

semantic layer で event を 1 件として扱うための識別子です。

ここで初めて `tt:evt:...` が登場します。

### 4. provenance / lineage identity

canonical event に対して、どこから来たか、何から派生したか、何を統合したかを表します。

- provenance は source 来歴
- lineage は event 間の派生関係

両者は似ていますが、役割は異なります。

---

## canonical identity はいつ決まるか

原則として、canonical identity は canonical event を生成する時点で決まります。

これは次の意味です。

- transport raw を保存しただけでは canonical identity はまだ意味を持たない
- adapter / converter が semantic content を組み立てた段階で `id` を確定する
- 後から再 canonicalize しても、同じ source 条件なら同じ canonical identity を再現できる

実装上は、Nostr と ATProto それぞれの adapter が `resolveCanonicalEventId(...)` を通して canonical id を決めます。

---

## canonical identity を安定させる条件

canonical identity の再現性は、次の前提に依存します。

### 必須条件

- source identity が再取得できること
- canonicalization ルールが同じであること
- 明示的な identity mapping が同じであること

### 可能なら保持すべき条件

- rawRef が残っていること
- provenance.sources[] が残っていること
- transport 固有の source metadata が残っていること
- identity key の正規化ルールが固定されていること
- identity claim の検証ルールが固定されていること

### 安定しない条件

- 仕様変更で canonicalization ルールが変わる
- raw event が欠損している
- identity mapping が未提供
- source をまたぐ同一性が曖昧

この場合、Toitoi は無理に同一扱いせず、別 event として保持する方を優先します。

---

## provenance の役割

provenance は canonical identity の代替ではありません。

provenance がやることは次の通りです。

- この canonical event がどの source から来たかを残す
- merge された場合に source を集約する
- replay 時に根拠を追えるようにする
- API で最小限の説明可能性を提供する

### provenance に入れるもの

- source protocol
- source id
- timestamp
- transport locator
- reference hint
- source-specific metadata

### provenance に入れないもの

- body の類似を根拠にした merge 結果そのもの
- transport 固有の配送状態
- semantic identity の主判断ロジック

つまり provenance は「来歴の記録」であって、「同一性判定のアルゴリズム」ではありません。

identity key と identity claim は、その同一性を再計算・検証するための層です。

---

## rawRef の役割

rawRef は provenance とは別に、raw に戻るための入口です。

Toitoi では、rawRef を次のために持ちます。

- replay
- re-canonicalize
- audit
- storage recovery

### rawRef が表すもの

- `protocol`
- `sourceId`
- `relay` または transport endpoint
- `storage`
- `storageId`
- `payloadHash`

### rawRef が表さないもの

- 同一性の判断そのもの
- event の意味
- canonical merge の妥当性

---

## merge の考え方

Toitoi では、canonical identity の merge は保守的です。

### merge してよい場合

- 既に同じ canonical id を持つ
- adapter / converter が同一と明示した
- replay / migration で identity mapping が与えられた

### merge しない場合

- 内容が似ているだけ
- 同じ label が付いているだけ
- 時間が近いだけ
- 関係構造が似ているだけ

### merge した場合の扱い

- `provenance.sources[]` を集約する
- `rawRef` は最初のもの、または追跡可能なものを保持する
- lineage があるなら派生関係も残す

曖昧な場合は merge せず、別 event として残す方針です。

---

## fan-out と fan-in

### fan-out

1 つの canonical event を複数 transport に投影することです。

このとき canonical identity は変えません。

- Nostr には Nostr draft を出す
- ATProto には ATProto record draft を出す
- canonical id は transport の中に埋め込まない

### fan-in

複数 transport から raw event を集めて canonical event に戻すことです。

このときは source identity を元に canonical identity を再生成します。

---

## Nostr での扱い

Nostr では raw event の `id` が source identity です。

canonical event を生成するとき、Toitoi は次を保持します。

- `provenance.sources[].sourceId = Nostr event id`
- `rawRef.sourceId = Nostr event id`
- `rawRef.relay` などの取得情報
- `canonicalEvent.id = tt:evt:...`

一方で、Nostr event そのものに canonical id は入りません。

Nostr の `e` tag は canonical id ではなく、lineage の transport 表現として扱われます。

---

## ATProto での扱い

ATProto では `uri` が source identity の中心です。

canonical event を生成するとき、Toitoi は次を保持します。

- `provenance.sources[].sourceId = at://...`
- `provenance.sources[].uri`, `cid`, `did`, `collection`, `rkey`
- `rawRef.sourceId = at://...`
- `canonicalEvent.id = tt:evt:...`

ATProto record そのものに canonical id は入りません。

---

## canonical id と保存形式

保存では、raw と canonical を分けます。

### raw 側

- raw event / raw record
- `canonicalEventId`
- verification / dedupe 情報
- source metadata

### canonical 側

- canonical event 本体
- `id`
- `provenance`
- `rawRef`

つまり、保存している canonical event の中には canonical id がある一方、transport schema にはありません。

---

## replay の意味

replay は「保存済み canonical event をそのまま読む」ことではなく、「raw からもう一度 canonical event を作り直せる」ことを意味します。

その結果として:

- sourceId が同じ
- canonicalization ルールが同じ
- identity mapping が同じ

なら、同じ canonical id を再現できます。

この再現性があるからこそ、raw data を捨てずに持つ価値があります。

---

## Standard API での扱い

Standard API では canonical view を返し、raw event の全文を露出しません。

基本方針は次です。

- provenance は追跡可能な最小単位で返す
- rawRef は必要に応じて返す
- transport 固有の詳細は最小限にする
- canonical identity を主キーとして扱う

これにより、API 利用者は transport の違いを意識しすぎずに、同じ event を参照できます。

---

## 典型的な流れ

1. transport から raw event を取る
2. validate / verify / dedupe / normalize する
3. canonical event を作る
4. canonical identity を確定する
5. provenance と rawRef を付与する
6. raw と canonical を別々に保存する
7. replay 時に raw から canonical を再生成する
8. 明示的な同一性がある場合だけ provenance を集約する

---

## 実装上の着地点

現行実装では、この文書の考え方は次で支えられています。

- `docs/protocols/CANONICAL_EVENT.md`
- `docs/architecture/MULTI_TRANSPORT_IDENTITY_POLICY.md`
- `docs/protocols/INQUIRY_TRANSPORT_SCHEMA_TEMPLATE.md`
- `packages/nostr/adapter/nostr_adapter.js`
- `packages/atproto/adapter/atproto_adapter.js`
- `packages/nostr/storage/persistence.js`
- `packages/atproto/storage/persistence.js`

---

## まとめ

Toitoi における identity の要点は、次の一文に集約できます。

> transport の raw identity はそのまま残し、canonical identity は semantic layer で再生成可能な opaque id として持ち、provenance と rawRef で来歴と再取得性を分離する

この分離により、Toitoi は単一 transport の固定仕様ではなく、replayable で multi-transport な knowledge commons として扱えるようになります。
