# Open Work

- Define and implement proof-of-key-ownership for [`src/app/services/spexfeed-name-registration.ts`](src/app/services/spexfeed-name-registration.ts:145) so registration/update submission can move beyond controlled alpha.
- Implement the relay seed registry MVP: publish a curated `sf/relays-global` ROD record, add one helper endpoint to fetch/validate `sf.relays.v1`, add one frontend import service, and add a below-threshold recovery path in [`RelayService.initialize()`](../../src/app/services/relay.ts:925).
- Resolve the pre-existing Angular/Karma DOM-global typing issue blocking full [`npm run test -- --watch=false --browsers=ChromeHeadless`](package.json:11) execution.
- Automate the mutual Nostr metadata back-link for flows beyond the current create-account path so successful SpeXFeed name registration can also publish the claim into user profile metadata for existing profiles and standalone registration/update flows.
- Document the exact release/retention policy for helper-side recent-name discovery caching and any future pagination/indexing behavior once it is stabilized.
- Extend the verification state machine to expose partial/basic verification distinctly from strong-verified, mismatch, and not-found states.
- Add dedicated UX for removing or unlinking a SpeXFeed name from a ROD record instead of requiring update-only key rotation.
- Expand registration UX to support optional profile metadata fields currently available only on the update page.
- Decide whether to replace the remaining `@blockcore/ngx-logger` dependency and document the outcome.
- Regenerate [`package-lock.json`](package-lock.json) with [`npm install`](package.json:8) after confirming the package rename from legacy `@blockcore/notes` metadata.
- Add a documentation validation script so repository docs can be checked automatically before commits.
- Expand wiki coverage for file handling, badges, articles, and search subsystems as those areas are changed.
- Review whether [`src/app/app.module.ts`](src/app/app.module.ts:1) should remain as commented legacy migration context or be retired from active maintenance.
- Verify whether `src/assets/shared.worker.js` is generated or committed elsewhere and document its build provenance.
