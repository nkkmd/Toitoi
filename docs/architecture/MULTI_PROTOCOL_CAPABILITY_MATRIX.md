# Multi-Protocol Capability Matrix

**Status: draft** | **Last updated: 2026-05-22**

この表は、Phase 8 で protocol を追加する際に、どの capability がどの程度揃っているかを比較するためのものです。

重要なのは優劣ではなく、責務の違いです。

---

## Capability Matrix

| Capability | Nostr | ATProto | LocalFS |
|---|---|---|---|
| rawAcquisition | yes | unknown | yes |
| identityVerification | yes | unknown | no |
| ordering | yes | partial | partial |
| deleteSemantics | partial | partial | partial |
| replaceSemantics | partial | partial | partial |
| replayability | yes | partial | yes |
| provenanceFidelity | yes | yes | partial |
| storageSnapshot | yes | partial | yes |
| sourceTrust | partial | partial | partial |

---

## 読み方

- `yes`: 現行実装または設計上、明確に扱える
- `partial`: 仕様や実装に制約があり、完全ではない
- `no`: 現行の設計では扱わない
- `unknown`: Phase 8 の調査対象であり、まだ固定しない

---

## 補足

- Nostr は現行の operational transport であり、実装済みの部分を示します。
- ATProto は今後の追加候補であり、現段階では設計上の想定を含みます。
- LocalFS は archive / local ingestion の扱いを想定しており、保存と replay を中心に比較します。

---

## 関連

- [MULTI_PROTOCOL_PREPARATION.md](./MULTI_PROTOCOL_PREPARATION.md)
- [PROTOCOL_ABSTRACTION.md](./PROTOCOL_ABSTRACTION.md)
- [PHASE8_PREPARATION_CHECKLIST.md](../roadmap/PHASE8_PREPARATION_CHECKLIST.md)
