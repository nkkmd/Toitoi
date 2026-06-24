# Transport Positioning

**Status: evolving** | **Last updated: 2026-06-24**

この文書は、Toitoi における Nostr / Lingonberry / ATProto の立ち位置を整理するための architecture note です。

transport の採用判断は、単に「送れるか」ではなく、Toitoi が扱う `inquiry`、Canonical Event、provenance、replay、commons memory との相性で決めます。

## 結論

現時点の位置づけは次の通りです。

| Transport | Position | Summary |
|---|---|---|
| Lingonberry | Semantic primary | Toitoi の思想・意味論に最も近い transport。knowledge object / inquiry を中心に扱いやすい。 |
| Nostr | Operational primary | すぐ運用できる relay-oriented transport。署名、分散配信、公開 relay の軽さが強い。 |
| ATProto | Secondary compatibility | 外部ネットワーク接続、ingest/replay 検証、将来 federation のために維持する補助 transport。 |

短く言えば、Lingonberry は思想・意味論上の primary transport、Nostr は運用上の primary transport、ATProto は互換性・検証・将来 federation のための secondary transport です。

## 比較

| 観点 | Lingonberry | Nostr | ATProto |
|---|---|---|---|
| Toitoi との思想相性 | 最も高い | 高い | 中くらい |
| `inquiry` / knowledge object との相性 | 非常に高い | 良い | やや SNS / record 寄り |
| Canonical Event への投影 | 自然 | 良い | 可能だが変換層が厚め |
| 運用しやすさ | これから育てる段階 | 強い | サービス依存がある |
| 分散性 | 高め、carrier 設計次第 | 高い | PDS / service 文脈が強い |
| append-only / replay | 良い | 良い | 工夫が必要 |
| 公開ネットワーク性 | これから | 強い | 強いが文脈が違う |
| Toitoi primary transport 向き | 最も高い | 高い | secondary 向き |

## Lingonberry

Lingonberry は、Toitoi の意味論に最も近い transport です。

Toitoi が流通させたいものは、単なる投稿や SNS event ではなく、文脈を持った `inquiry` です。Lingonberry の knowledge object は、この単位に近く、Canonical Event との adapter / converter 境界を自然に作れます。

Toitoi では Lingonberry を内部中心モデルにはしません。あくまで Canonical Event からの transport projection / ingest source として扱います。ただし、思想的には最も Toitoi らしい transport なので、semantic primary と位置づけます。

## Nostr

Nostr は、運用面で最も強い transport です。

relay、署名、分散配信、公開ネットワークとしての軽さがあり、Toitoi の初期運用 transport として妥当です。一方で、Nostr 自体は汎用 event transport なので、Toitoi の `inquiry` としての意味論は adapter / schema / canonical layer 側で支えます。

そのため、Nostr は operational primary と位置づけます。

## ATProto

ATProto は、Toitoi の中心 transport というより、外部ネットワーク接続と multi-protocol 互換性のための secondary transport です。

record / repo / PDS の構造は便利ですが、Toitoi の独立した commons transport としては既存サービスや platform 文脈が強くなりやすいです。外部公開、ingest/replay 検証、将来 federation の検討には有用なので、secondary compatibility transport として維持します。

## 実装上の扱い

実装では、transport の優先順位を Canonical Event の schema に持ち込みません。

- Canonical Event は protocol-independent な semantic layer として維持する
- Lingonberry / Nostr / ATProto の差分は adapter / converter / storage / protocol descriptor に閉じる
- multi-transport replay では、explicit identity mapping と provenance によって同一性を扱う
- Standard API は transport 固有 schema ではなく canonical view を返す

この分離により、transport の立ち位置が変わっても、Toitoi の意味論と API 契約を壊さずに拡張できます。
