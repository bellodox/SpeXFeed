# Workflows

## Run the web app locally

- Start development server: `npm run start`
- Hot module replacement mode: `npm run hot`
- Static dev mode without live reload: `npm run static`

## Build

- Production build: `npm run build`
- Development watch build: `npm run watch`

## Test

- Unit tests: `npm run test`

## Desktop packaging

- Tauri command passthrough: `npm run tauri`

## Documentation maintenance

- Update durable project facts in `docs/maintainer-wiki/`.
- Update `.kilocode/rules/memory-bank/` only for short-lived local context.
- Preserve evidence links to repository files when recording technical facts.
- When major docs or memory-bank work is completed, record it in `CHANGELOG.md` under `Unreleased`.

## Initialization sequence observed in code

After authentication, the root application initializes local storage, circles, profiles, relays, badges, data cleanup/loading, and labels before setting the application as initialized.

## Known maintenance caveats

- The repository contains legacy naming and commented migration remnants.
- Relay connectivity is mediated through Web Workers rather than direct service-only subscriptions.
- There is no dedicated docs validation script yet; open work tracks this gap.
