# Canonical Sources for Repository Facts

## Source hierarchy

1. Application source code in `src/`
2. Build and runtime configuration in files such as `package.json`, `angular.json`, `tsconfig.json`, and `src-tauri/tauri.conf.json`
3. Repository documentation such as `README.md`
4. Planning artifacts in `docs/` that are descriptive but not authoritative for current runtime behavior

## Documentation policy

- Prefer code and configuration when documenting implemented behavior.
- Use README claims only when they do not conflict with code.
- Treat naming, feature lists, and protocol support claims as potentially stale unless corroborated.
- Mark unresolved discrepancies as `UNVERIFIED` or track them in `open-work.md`.

## Current known discrepancy theme

The repository uses both `SpeXFeed` and `Blockcore Notes` naming in user-facing copy, package metadata, Tauri config, and code-level titles. This should be preserved as an observed fact until intentionally reconciled.
