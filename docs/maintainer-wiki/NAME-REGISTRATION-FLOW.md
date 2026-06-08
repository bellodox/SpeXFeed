# Name Registration and Update Flow

## Scope

This page documents the alpha tester flow for registering and updating SpeXFeed Names in MVP 1.1. The underlying product plan is Sprint 4 and Sprint 5 from [docs/SpeXFeed MVP 1.1 Plan.pdf](../SpeXFeed%20MVP%201.1%20Plan.pdf), while the implemented browser flow is defined by:

- `src/app/pages/register-name/register-name.html`
- `src/app/pages/update-name/update-name.html`
- `src/app/services/spexfeed-name-registration.ts`
- `src/app/services/spexfeed-name-profile-update.ts`
- `src/app/app.routes.ts`

## Alpha routes

The application exposes two documented routes for testers:

- `/register-name` — registration flow in `src/app/app.routes.ts`
- `/settings/name` — profile-record update flow in `src/app/app.routes.ts`

The settings page links to both routes from the SpeXFeed Name card in `src/app/pages/settings/settings.html`.

## Registration flow for testers

### Entry point

Open `/register-name` after connecting a Nostr signer and loading the authenticated app.

The page title and subtitle describe the feature as a public profile handle backed by a ROD name record in `src/app/pages/register-name/register-name.html`.

### What the tester enters

The registration page currently collects:

- handle
- Nostr public key

The page also shows the canonical `sf/<handle>` ROD name preview.

### Safety acknowledgements

Before submission, the tester must acknowledge:

1. the binding creates a public link between the ROD name and the Nostr public key
2. SpeXFeed Names are handles only and are not SpeXID, KYC, legal identity, or proof-of-personhood

These confirmations are enforced by the page UI in `src/app/pages/register-name/register-name.html`.

### State progression

The implemented registration state machine in `src/app/services/spexfeed-name-registration.ts` uses these statuses:

- `idle`
- `checking`
- `available`
- `unavailable`
- `invalid`
- `submitting`
- `pending`
- `verified`
- `failed`

### What each registration state means

| State | Meaning for alpha tester |
| --- | --- |
| `checking` | SpeXFeed is validating input and querying the backend/helper lookup flow |
| `available` | no conflicting registered `sf.profile` record was found for this handle |
| `unavailable` | the name already exists, or an existing record occupies the handle |
| `invalid` | the handle or request data failed validation |
| `submitting` | SpeXFeed is sending the backend/helper registration request |
| `pending` | the request was accepted, but confirmation/detection is still pending |
| `verified` | the registration flow reported confirmation |
| `failed` | the helper request or status polling failed |

### Backend/helper dependency

The registration adapter is intentionally browser-safe and posts requests to a backend/helper endpoint rather than embedding wallet credentials in the browser. This is implemented by `SpeXFeedHttpNameRegistrationAdapter` in `src/app/services/spexfeed-name-registration.ts`.

Current endpoint assumptions:

- submit request: `POST /api/rod/spexfeed-name/requests`
- poll status: `GET /api/rod/spexfeed-name/requests/:requestId`

Lookup and update flows also depend on the browser-safe name lookup adapter in `src/app/services/spexfeed-name-lookup.ts`, which currently targets:

- lookup request: `GET /api/rod/name/:namespace/:handle`

### Backend/helper API requirements

The currently implemented browser flow expects the helper/backend API to satisfy these requirements:

| Area | Requirement | Evidence |
| --- | --- | --- |
| Lookup | `GET /api/rod/name/:namespace/:handle` returns JSON with `found`, optional `name`, and optional `value`. `404` is treated as not found/available. The frontend adapter must split canonical names like `sf/alice` into separate path segments rather than URL-encoding the slash. | `src/app/services/spexfeed-name-lookup.ts`, `server/index.js` |
| Registration submit | `POST /api/rod/spexfeed-name/requests` accepts a JSON body containing the canonical `sf.profile` payload plus normalized `handle`, `rodName`, `nostrPubkey`, and `action`. | `src/app/services/spexfeed-name-registration.ts` |
| Request status | `GET /api/rod/spexfeed-name/requests/:requestId` returns JSON confirmation state with `pending`, `verified`, or `failed`. | `src/app/services/spexfeed-name-registration.ts` |
| Content type | Successful helper responses for lookup, submit, and status polling must return `Content-Type: application/json`. HTML fallback pages and other non-JSON payloads are treated as backend/API configuration errors. | `src/app/services/spexfeed-name-registration.ts`, `src/app/services/spexfeed-name-lookup.ts`, `src/app/services/spexfeed-name-http-adapters.spec.ts` |
| Duplicate registration | If the `sf/<handle>` name already exists, registration submit should return HTTP `409` with a semantic error payload rather than a generic `500`. | `server/index.js` |

### Local helper/RPC compatibility notes

The current local helper implementation assumes a wallet-scoped ROD RPC path rather than the node root path. In the validated workspace setup, the helper uses the loaded `VoidRunner` wallet path in `server/rod-rpc.js` so write methods such as `name_register` and `name_update` do not fail with a "wallet file not specified" RPC error.

This means local maintainers must keep three layers aligned:

1. Angular dev server proxying `/api/...` to the helper service.
2. Helper endpoint routing in `server/index.js`.
3. Wallet-scoped RPC access in `server/rod-rpc.js`.

Maintainers should treat HTML responses from these routes as a proxy or helper misconfiguration, not as a valid application-level failure case. The implemented adapters now surface a controlled backend/API configuration error instead of leaking raw JSON parse failures.

### Local development and proxy note

In local development, these `/api/...` routes must resolve to a helper/backend service rather than the Angular app shell. If the dev server or reverse proxy falls back to `index.html`, the frontend will now report an explicit configuration error explaining that JSON was expected but HTML was returned. This behavior is covered by focused adapter tests in `src/app/services/spexfeed-name-http-adapters.spec.ts`.

### Production-processing requirement

The helper flow remains incomplete for production use until the backend verifies proof of Nostr key ownership before processing registration or update requests. A code TODO in `src/app/services/spexfeed-name-registration.ts` explicitly calls for a backend contract such as NIP-07, NIP-98, or equivalent proof before helper-side trust should be considered production-ready.

Alpha testers should understand that successful registration therefore depends on an external helper/backend service that is **not** documented here as production-ready.

## Update flow for testers

### Entry point

Open `/settings/name` to load and edit an existing SpeXFeed Name record.

### What the tester can edit

The update page currently supports editing:

- handle or full `sf/<handle>` name input for load
- display name
- about/bio
- avatar URL
- preferred relays
- linked Nostr public key

This matches the Sprint 5 direction and is implemented in `src/app/pages/update-name/update-name.html` with request/preview logic in `src/app/services/spexfeed-name-profile-update.ts`.

### JSON preview and validation

Before submitting, the page shows:

- serialized `sf.profile` JSON preview
- byte-size usage against the `2048` byte limit
- validation errors when present

The preview is built by `buildSpeXFeedProfileUpdatePreview()` in `src/app/services/spexfeed-name-profile-update.ts`.

### Linked key rotation warning

If the linked Nostr public key changes, the UI surfaces an explicit warning and requires confirmation before submit. This implements the Sprint 5 caution around moving verification to another profile key.

### Update status progression

Update submission reuses the request/confirmation model from `src/app/services/spexfeed-name-registration.ts` and applies post-confirmation detection through `detectUpdatedRecord()` in `src/app/services/spexfeed-name-profile-update.ts`.

Important meanings:

- `pending` may mean helper confirmation is still pending **or** that confirmation was reported but the updated record has not yet been observed through lookup.
- `verified` means the updated record was confirmed and detected with matching linked key and fresh timestamp.

### Key-mismatch protection

When the loaded `sf.profile` record points to a different Nostr public key than the currently authenticated user, the update page intentionally blocks submission. The page still loads the existing record and JSON preview, but reports a mismatch state so maintainers/testers do not accidentally overwrite another linked key.

This protection is implemented in `src/app/pages/update-name/update-name.ts` and is working as intended in the current alpha behavior.

## Expected alpha tester journey

1. Go to `/settings`.
2. Review the SpeXFeed Name status card.
3. Open `/register-name` if no name is registered yet.
4. Check handle availability.
5. Acknowledge the public-link and not-SpeXID warnings.
6. Submit the backend-assisted registration request.
7. Observe `pending` until confirmation resolves.
8. Return to the profile/settings surfaces to confirm the name verifies as expected.
9. Use `/settings/name` to update optional metadata or rotate the linked Nostr public key if needed.

## Failure and ambiguity cases testers should expect

- Name invalid due to handle rules or reserved words.
- Name unavailable because the `sf/<handle>` record already exists.
- Lookup unavailable because the helper or backend endpoint is down.
- Invalid record or wrong type because the ROD name exists but does not contain a valid `sf.profile` value.
- Verified registration request without immediate record detection, producing a temporary `pending` experience after update.

## Important non-claims

This alpha flow does **not** imply:

- browser custody of ROD keys
- in-browser transaction signing
- direct raw RPC from the client
- production-ready registration infrastructure
- SpeXID or universal login support

## Validation commands for this documentation set

After documentation changes, the repository-level validation commands for this work remain:

- `npm run build`
- `npx tsc -p tsconfig.spec.json --noEmit`

These commands align with the project guidance and with the parent task requirements for Sprint 6 completion.
