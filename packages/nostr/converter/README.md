# Nostr Converter

`packages/nostr/converter/` は、Canonical Event と Nostr 表現の相互変換を扱う層です。

現時点では、canonical から Nostr draft への変換が中心です。

## 全体像

```text
Canonical Event
      |
      v
canonical_to_nostr_converter.js
      |
      v
Nostr draft / transport representation
```

## 主なファイル

- `canonical_to_nostr_converter.js`: canonical -> Nostr draft 変換

## 依存関係

- converter は adapter ではなく、変換専用の層です
- protocol descriptor からはこの変換関数が公開されます
