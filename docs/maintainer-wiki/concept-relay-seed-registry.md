# ROD Relay Seed Registry

## Purpose

SpeXFeed already performs relay discovery through extension-provided relays, built-in defaults, contacts data, and relay-list metadata. That model works well while the user can still reach at least one useful relay surface, but it weakens when the relay graph fragments into disconnected clusters.

This page documents a recovery-oriented design: a small, curated relay seed registry stored in ROD name/value records and fetched through the existing helper/backend path used elsewhere in SpeXFeed.

Implementation evidence for the current building blocks:

- [`RelayService.initialize()`](../../src/app/services/relay.ts:925) loads persisted relay metadata and falls back to Nostr-provided relay sources.
- [`NostrService.relays()`](../../src/app/services/nostr.ts:82) returns extension relays when available, otherwise falls back to [`defaultRelays`](../../src/app/services/nostr.ts:17).
- The helper/backend already exposes browser-safe ROD lookup routes in [`server/index.js`](../../server/index.js:90) and wallet-scoped RPC access in [`server/rod-rpc.js`](../../server/rod-rpc.js:20).
- The current browser-safe ROD lookup pattern is encapsulated by [`SpeXFeedHttpNameLookupAdapter.lookupName()`](../../src/app/services/spexfeed-name-lookup.ts:152).

## Problem statement

Nostr relay discovery depends on relays being reachable. If the user only knows relays inside cluster A, and cluster A has no live overlap with cluster B, the client may never discover relays or users that only exist in cluster B.

This creates a relay graph partition problem:

1. NIP-65 relay lists only help when at least one relay containing the relevant metadata is reachable.
2. Kind-3 contacts data can only spread relay knowledge if those contacts can be read from some connected relay.
3. Extension relays and local persisted relays may preserve only the user's last-known subgraph.

When all discovery surfaces are themselves trapped inside a disconnected relay cluster, the client needs a globally queryable fallback that does not depend on Nostr relay reachability.

ROD name/value records provide that independent path because the data can be queried through the helper/backend even when Nostr relay connectivity is degraded. The helper already demonstrates this pattern for name lookup and recent-profile discovery through [`/api/rod/name/:namespace/:handle`](../../server/index.js:90) and [`/api/rod/names/recent`](../../server/index.js:245).

## Architecture: two-tier relay discovery

The proposed model is intentionally narrow.

### Tier 1 — ROD blockchain relay seed records

Store compact, curated seed relay lists in ROD name/value records such as:

- `sf/relays-global`
- `sf/relays-<community>`

These records are fetched through the existing helper/backend trust boundary rather than direct browser RPC. This mirrors the pattern already used for SpeXFeed name lookups in [`src/app/services/spexfeed-name-lookup.ts`](../../src/app/services/spexfeed-name-lookup.ts:145).

The blockchain-backed registry is not intended to be large, dynamic, or user-specific. Its job is only to provide a reliable bootstrap set when normal relay discovery is insufficient.

### Tier 2 — Nostr-native relay expansion

Once the client successfully connects to any healthy seed relay, normal Nostr-native discovery resumes:

- relay-list metadata from NIP-65
- contacts-derived relay hints from kind `3`
- any additional relay knowledge already embedded in profile or event flows

This aligns with the existing runtime shape where [`RelayService`](../../src/app/services/relay.ts:27) owns relay metadata and worker creation, and relay-driven event processing resumes once workers connect successfully in [`handleRelayMessage()`](../../src/app/services/relay.ts:661).

## Seed record schema: `sf.relays.v1`

Suggested record value:

```json
{
  "type": "sf.relays.v1",
  "version": 1,
  "updatedAt": 1760000000,
  "scope": "global",
  "relays": [
    { "url": "wss://nos.lol", "role": "seed", "read": true, "write": true, "priority": 100 },
    { "url": "wss://relay.damus.io", "role": "seed", "read": true, "write": true, "priority": 90 },
    { "url": "wss://relay.primal.net", "role": "seed", "read": true, "write": true, "priority": 80 }
  ],
  "sources": ["rod"],
  "signature": "optional-app-level-signature"
}
```

### Schema guidance

- The value must fit within the current helper-side 2048-byte ceiling enforced by [`maxValueSizeBytes`](../../server/index.js:14) and [`validateValueJson()`](../../server/index.js:390).
- The relay list should stay small, ideally about 5–12 entries, so the record remains compact and curated.
- The registry should prioritize stable public relays rather than trying to mirror the broader ecosystem.
- The stored value is expected to remain a JSON object, matching the existing helper validation shape in [`validateValueJson()`](../../server/index.js:390).

### Minimal field semantics

| Field | Meaning |
| --- | --- |
| `type` | Record discriminator. Distinguishes this registry from `sf.profile`. |
| `version` | Schema version for forward-compatible parsing. |
| `updatedAt` | Unix timestamp for staleness checks and cache decisions. |
| `scope` | Registry scope such as `global` or a future community scope. |
| `relays` | Compact curated array of seed relay descriptors. |
| `sources` | Provenance marker showing the record came from ROD-backed discovery. |
| `signature` | Optional application-level signature if maintainers later want stronger tamper detection above base chain ownership. |

## Bootstrap merge pipeline

The current initialization path is short: [`RelayService.initialize()`](../../src/app/services/relay.ts:925) loads stored relays, falls back to [`NostrService.relays()`](../../src/app/services/nostr.ts:82) when empty, persists them, and then starts relay workers.

The proposed relay initialization order becomes:

1. Local persisted relays from [`RelayService.initialize()`](../../src/app/services/relay.ts:925)
2. Extension relays from [`NostrService.relays()`](../../src/app/services/nostr.ts:82)
3. Built-in defaults from [`defaultRelays`](../../src/app/services/nostr.ts:17)
4. ROD blockchain relay seeds from the new helper-backed registry
5. Merge, dedupe, validate, and rank all candidate relays
6. Persist selected new seeds into local relay storage
7. Create relay workers through [`createRelayWorkers()`](../../src/app/services/relay.ts:915)

### Design intent

- Preserve local user state first.
- Preserve extension intent second.
- Use defaults as a known-safe baseline.
- Use ROD seeds as a resilience layer, especially when connectivity is weak or fragmented.

This keeps the registry additive rather than replacing current discovery behavior.

## Query strategy

### Normal mode

In normal operation, ROD seed lookup should be asynchronous background enrichment.

That means the app can initialize from stored, extension, and default relays first, then fetch the seed registry without blocking the first render or first worker creation. If the registry returns healthy new relays, they can be merged into storage and activated afterward.

### Recovery mode

In recovery mode, the client should query aggressively when connectivity is below a minimum threshold.

Examples:

- zero connected relays after startup
- too few enabled/readable relays after dedupe
- repeated worker failures or timeouts across the current local set

The current connection surface already exposes worker status transitions through [`handleRelayMessage()`](../../src/app/services/relay.ts:661), relay timeout tracking through [`setRelayTimeout()`](../../src/app/services/relay.ts:302), and current connection snapshots through [`connectedRelays()`](../../src/app/services/relay.ts:832). Those signals are a reasonable basis for a future below-threshold recovery rule.

## Relay provenance and health scoring

The relay registry design should make relay origin explicit.

### Suggested provenance labels

- `local`
- `extension`
- `default`
- `nostr-contact`
- `nostr-nip65`
- `rod-seed`

The existing persisted relay document shape is [`NostrRelayDocument`](../../src/app/services/interfaces.ts:97). It currently stores URL, enabled/public flags, relay type, status, NIP-11 data, and counters, but it does not yet carry explicit provenance metadata. Adding provenance is therefore part of the MVP work rather than an already-shipped behavior.

### Scoring dimensions

Suggested ranking inputs:

- static registry priority from the seed record
- relay health history such as successful connections vs. timeout count
- recent usability for reads and writes
- whether the relay broadens graph reach beyond the local cluster
- whether the relay duplicates an already-known host or operator domain

### Admission and lifecycle

- **Promotion**: a `rod-seed` relay that connects reliably can be kept in persistent storage.
- **Demotion**: repeated failures lower effective priority.
- **Suppression**: chronically failing or invalid seed relays stop being auto-added until a future registry refresh.

This lifecycle should remain conservative so the registry improves recovery without becoming a noisy rotating catalog.

## Seed registry governance

The seed registry is intentionally curated, not crowd-sourced at per-user scale.

### Governance model

- One global record is maintained by project operators.
- Optional scoped or community records may be added later.
- Updates should be infrequent and deliberate.
- Records should be reviewed for uptime, ecosystem relevance, and bridge value before publication.

This governance posture matches the helper-backed, operator-defined nature of current ROD integration points in [`server/index.js`](../../server/index.js:29) and avoids implying that every user writes personal relay preferences to chain.

## Seed selection criteria for anti-partition resilience

Curated seed relays should be chosen for graph recovery, not just popularity.

Preferred properties:

- high uptime
- public accessibility
- broad ecosystem reach
- geographic diversity
- software/operator diversity
- bridge-relay characteristics that connect otherwise separate user clusters

The anti-partition objective is to maximize the chance that at least one seed relay can reconnect the client to a larger and more diverse relay graph.

## What this is not

This registry is deliberately narrow.

- It is **not** a replacement for NIP-65 or other Nostr-native relay lists.
- It is **not** per-user relay preference storage.
- It is **not** a full relay catalog.
- It is **not** a guarantee that every relay in the ecosystem will be reachable.

The registry only exists to supply a compact recovery/bootstrap layer when the normal relay graph is insufficient.

## MVP scope

The minimum useful implementation is:

1. One global ROD name containing 5–12 curated seed relays.
2. One helper endpoint that fetches and validates the registry record.
3. One frontend service that imports and parses relay seeds.
4. One recovery path in [`RelayService.initialize()`](../../src/app/services/relay.ts:925) for below-threshold connectivity.
5. Provenance tagging and basic health scoring.

This scope deliberately reuses the current helper-backed architecture instead of inventing a separate transport path.

## Implementation references

- Backend helper entrypoints: [`server/index.js`](../../server/index.js:1), [`server/rod-rpc.js`](../../server/rod-rpc.js:1)
- Current relay boot path: [`src/app/services/relay.ts`](../../src/app/services/relay.ts:925)
- Existing relay defaults and extension relay discovery: [`src/app/services/nostr.ts`](../../src/app/services/nostr.ts:17), [`src/app/services/nostr.ts`](../../src/app/services/nostr.ts:82)
- Existing relay document interface: [`NostrRelayDocument`](../../src/app/services/interfaces.ts:97)
- Existing helper-backed name lookup pattern: [`src/app/services/spexfeed-name-lookup.ts`](../../src/app/services/spexfeed-name-lookup.ts:145)
- Existing helper-backed recent-profile discovery endpoint: [`/api/rod/names/recent`](../../server/index.js:245)

## Related documentation

- [Concept: Nostr relay and event flow](concept-nostr-relay-event-flow.md)
- [Concept: Architecture overview](concept-architecture-overview.md)
- [SpeXFeed MVP 1.1 Alpha README](MVP-1.1-README.md)
- [Open work](open-work.md)
