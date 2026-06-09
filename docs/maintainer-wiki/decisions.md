# Decision Log

| Date | Decision | Rationale | Evidence |
| --- | --- | --- | --- |
| 2026-06-06 | Adopt standard maintainer wiki structure under `docs/maintainer-wiki/` | Creates a durable home for architecture, workflows, and follow-up items | `README.md`, `package.json`, `src/app/app.ts` |
| 2026-06-06 | Treat current product naming as partially transitional | Repository branding mixes SpeXFeed and legacy Blockcore Notes identifiers, so docs should preserve both where evidence requires it | `README.md`, `package.json`, `src-tauri/tauri.conf.json`, `src/app/pages/home/home.ts` |
| 2026-06-06 | Use code and configuration as primary technical evidence | Existing `docs/` content is limited to a product-plan PDF, while behavior is defined in Angular source and config | `docs/`, `angular.json`, `src/app/app.config.ts` |
| 2026-06-09 | Adopt two-tier relay discovery: ROD blockchain seed registry alongside Nostr-native relay lists for partition resilience | Current discovery depends on reachable relays. A compact helper-fetched ROD registry adds a relay-independent bootstrap path, while existing relay workers and Nostr relay expansion remain the primary runtime model after first connectivity is restored. | [`RelayService.initialize()`](../../src/app/services/relay.ts:925), [`NostrService.relays()`](../../src/app/services/nostr.ts:82), [`defaultRelays`](../../src/app/services/nostr.ts:17), [`server/index.js`](../../server/index.js:90), [`server/index.js`](../../server/index.js:245), [`server/rod-rpc.js`](../../server/rod-rpc.js:20) |
