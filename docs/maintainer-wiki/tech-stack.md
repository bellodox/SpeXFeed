# Tech Stack

## Runtime and language

- Angular application written in TypeScript with strict compiler options enabled.
- ECMAScript target and module level: `ES2022`.

## Framework and UI

- Angular `19.2.x`
- Angular Material `19.2.x`
- Angular CDK `19.2.x`
- Standalone Angular bootstrap via `bootstrapApplication`

## Internationalization and logging

- `@ngx-translate/core` with a custom fetch-based loader
- `@blockcore/ngx-logger` for client-side logging

## Nostr and domain-specific libraries

- `nostr-tools` for event, relay, filter, and signing-related protocol handling
- `@noble/secp256k1`, `@scure/base`, and `@scure/bip39` for cryptographic/key utilities

## Persistence and client storage

- IndexedDB via `idb`
- Per-user local database naming driven by authenticated public key

## Media and UX libraries

- `sanitize-html`
- `html5-qrcode`
- `angularx-qrcode`
- `ngx-loading-buttons`
- `ngx-drag-scroll`
- `@ctrl/ngx-emoji-mart`

## Desktop packaging

- Tauri v2 scaffolding under `src-tauri/`

## Testing and build tooling

- Angular CLI build system
- Karma + Jasmine for unit tests
- TypeScript `5.8.2`

## Evidence

- `package.json`
- `angular.json`
- `tsconfig.json`
- `src/main.ts`
- `src/app/app.config.ts`
- `src-tauri/tauri.conf.json`
