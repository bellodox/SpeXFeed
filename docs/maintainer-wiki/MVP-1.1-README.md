# SpeXFeed MVP 1.1 Alpha README

## Summary

SpeXFeed MVP 1.1 alpha ships the first end-to-end SpeXFeed Name experience around ROD-backed public profile handles, plus the surrounding application changes required to make that flow usable in the rebranded SpaceXpanse client. A handle such as `sf/alice` can store a compact `sf.profile` record that points to a Nostr public key and basic public metadata. SpeXFeed then verifies that binding when viewing profiles, exposes registration/update flows for controlled alpha use, and includes helper-backed discovery and navigation surfaces for recently registered profiles.

The MVP plan defines this feature as a narrow bridge between ROD name records and Nostr profiles, and explicitly says this is **not SpeXID yet**.

## What MVP 1.1 includes

Implemented Sprint 1 through Sprint 5 functionality, documented here for Sprint 6:

- `sf.profile` schema and validation helpers in `src/app/services/spexfeed-name.ts`
- ROD name lookup and parsing in `src/app/services/spexfeed-name-lookup.ts`
- profile verification state machine in `src/app/services/spexfeed-name-verification.ts`
- reusable badge surface in `src/app/shared/spexfeed-name-badge/`
- ROD helper/backend support for status, lookup, registration/update request handling, and recent-name discovery in `server/`
- registration flow in `src/app/pages/register-name/` and `src/app/services/spexfeed-name-registration.ts`
- optional create-account SpeXFeed registration flow in [`CreateProfileComponent`](../../src/app/pages/connect/create/create.ts:35)
- update flow in `src/app/pages/update-name/` and `src/app/services/spexfeed-name-profile-update.ts`
- routes `/register-name` and `/settings/name` in `src/app/app.routes.ts`
- profile-by-name navigation via `/n/:handle` and name-search routing for `sf/<handle>` input
- backward-compatible storage migration from legacy Blockcore keys to SpeXFeed namespaces
- Discover ROD Profiles browsing backed by `GET /api/rod/names/recent?limit=25`
- authenticated UX fixes needed for alpha testing, including the working `/update-name` route and repaired Settings form controls
- SpaceXpanse visual rebrand across primary user-facing application surfaces

## Initial alpha shipment scope

The initial alpha shipment should be described as the combined delivery of:

1. **ROD helper backend** for browser-safe lookup and helper-mediated registration/update requests.
2. **SpeXFeed Name binding** between `sf/<handle>` ROD records and Nostr profile keys.
3. **Account-creation name flow** on [`/connect/create`](../../src/app/pages/connect/create/create.html:111), including nickname reuse, canonical handle preview, availability check, acknowledgement gates, and visible pending-confirmation feedback.
4. **Profile metadata persistence** so successful create-account registration stores SpeXFeed naming data in local draft/profile state for later reuse.
5. **Profile-by-name and search support** so name-based navigation is usable from the app shell.
6. **Discover ROD Profiles** so testers can browse recent helper-discovered `sf.profile` registrations.
7. **SpaceXpanse rebrand and authenticated UX fixes** required to make the shipped alpha consistent and testable.

## What MVP 1.1 does not include

This alpha must not be described as:

- SpeXID
- legal identity
- KYC
- proof-of-personhood
- OAuth/OpenID
- universal login
- browser wallet custody
- finished backend infrastructure

## Mental model for testers

Use this model when testing:

- **ROD record** = public ownership anchor for the handle
- **Nostr profile** = social profile and posting identity
- **SpeXFeed** = client that verifies whether they match

If the ROD record points to the same Nostr key as the viewed profile, the name verifies. If it does not, the UI must not present the claim as trusted.

## Verification states

The current alpha behavior covers these tester-facing meanings:

- **verified** — ROD record points to this profile key
- **mismatch** — ROD record points to another key
- **unverified claim** — profile claims a name that is not verified by the resolved ROD record
- **invalid record** — name exists but the record is malformed or wrong-type
- **not found** — no registered `sf.profile` record is found for that handle
- **pending** — registration/update request accepted but confirmation/detection is not complete
- **lookup failed/unavailable** — helper lookup path could not verify the name
- **partial/basic** — documented in the MVP plan, but not currently exposed as a separate verification status in this implementation

Implementation references:

- verification states: `src/app/services/spexfeed-name-verification.ts`
- registration/update pending states: `src/app/services/spexfeed-name-registration.ts` and `src/app/services/spexfeed-name-profile-update.ts`

## Alpha tester flow

1. Open `/settings` and review the SpeXFeed Name card.
2. Either open `/register-name` or use the optional SpeXFeed step during `/connect/create` to check whether a handle is available.
3. Read and accept the public-link and not-SpeXID warnings.
4. Submit the backend-assisted registration request.
5. Wait through `pending` until the helper flow confirms the request; the create-account flow now shows a visible loading spinner during that wait.
6. Re-check the settings/profile surfaces for verification.
7. Use profile-by-name navigation or `sf/<handle>` search to verify the handle resolves through the shipped discovery/navigation flow.
8. Open `/settings/name` to edit public metadata or rotate the linked Nostr key.

## Additional alpha capabilities around the core name flow

- **Discover ROD Profiles**: the home-page SpaceXpanse CTA now points to a recent-profile discovery page backed by the helper endpoint `GET /api/rod/names/recent?limit=25`.
- **Profile metadata continuity**: create-account registration now persists the chosen SpeXFeed name into local draft/profile metadata fields so the account retains the selected handle context after onboarding.
- **Authenticated Settings stability**: the authenticated alpha now includes the registered `/update-name` route and repaired Settings slide-toggle wiring, removing two blockers from guided tester flows.
- **Storage migration**: legacy local storage/indexed data is migrated into SpeXFeed namespaces so the alpha can ship under the new branding without discarding prior local user state.

## Privacy warning

Registering or updating a SpeXFeed Name creates a **public** relationship between:

- the ROD handle `sf/<name>`
- the linked Nostr public key
- any profile metadata copied into the public `sf.profile` record

Anyone can inspect that link. Users who want to keep blockchain and Nostr identities separate should not use this feature.

## Backend/helper limitations

This alpha depends on backend/helper services for lookup and registration/update requests.

Current browser-facing adapter assumptions:

- lookup: `/api/rod/name/:namespace/:handle`
- registration/update request flow: `/api/rod/spexfeed-name/requests`

Those integrations should be documented as alpha dependencies, not as production-hardened infrastructure. SpeXFeed does not claim browser custody of ROD private keys.

The current validated local helper also depends on wallet-scoped RPC access for write methods. In this workspace, helper-side registration/update calls are routed through the loaded `spexfeed` wallet path in [`server/rod-rpc.js`](../../server/rod-rpc.js:7) rather than the bare RPC root path.

The recent-profile discovery endpoint is also helper-backed and currently uses `name_scan` with recent-first sorting and short in-memory caching. This is alpha infrastructure, not a claim of finalized production indexing behavior.

## Related documentation

- [ROD Name and Nostr Profile Binding](ROD-NAME-PROFILE-BINDING.md)
- [SF Profile Schema v1](SF-PROFILE-SCHEMA-v1.md)
- [Name Registration and Update Flow](NAME-REGISTRATION-FLOW.md)
- [Security and Privacy for SpeXFeed Names](SECURITY-AND-PRIVACY.md)
- [Open work](open-work.md)

## Validation commands

Use these commands after Sprint 6 documentation updates:

- `npm run build`
- `npx tsc -p tsconfig.spec.json --noEmit`

There is currently no dedicated documentation validation script in [`package.json`](../../package.json:4).

## Release posture

Sprint 6 should be treated as **initial alpha release documentation** for a controlled helper-service-based name binding feature and its required surrounding product surfaces. It is suitable for guided tester evaluation of the public handle model, profile discovery/navigation, SpaceXpanse-branded onboarding, verification semantics, and privacy tradeoffs, but not for claiming production-grade identity, wallet custody, or finalized backend infrastructure.
