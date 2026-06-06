# ROD Name and Nostr Profile Binding

## Purpose

SpeXFeed MVP 1.1 adds a narrow identity-style feature: a public SpeXFeed Name stored as an `sf/<handle>` ROD name record and linked to a Nostr public key. The MVP plan explicitly defines this as a profile-handle feature, not a full identity stack, and states that MVP 1.1 must stop at simple name binding rather than SpeXID or broader authentication behavior.

Plan basis: `sf/<name>` namespace, ROD-backed profile handles, mutual binding recommendation, and “This is not SpeXID yet” in [docs/SpeXFeed MVP 1.1 Plan.pdf](../SpeXFeed%20MVP%201.1%20Plan.pdf).

Implementation evidence:

- Canonical namespace and record constants live in `src/app/services/spexfeed-name.ts`.
- Lookup normalization and record parsing live in `src/app/services/spexfeed-name-lookup.ts`.
- Verification of profile claims against ROD records lives in `src/app/services/spexfeed-name-verification.ts`.
- Profile and settings surfaces use the badge and verification result in `src/app/shared/spexfeed-name-badge/` and the settings/profile integrations.

## Product framing

SpeXFeed Names are **public profile handles anchored in ROD**.

They are **not**:

- SpeXID
- KYC
- legal identity
- proof-of-personhood
- OAuth or OpenID
- universal login
- wallet custody
- reputation infrastructure

This framing matches the MVP plan and the UI warnings shown in the registration and update pages.

## Binding model used by MVP 1.1

The plan recommends mutual binding, while treating the ROD record as the source of truth.

In the implemented flow:

1. A user-facing handle such as `alice` is normalized into `sf/alice` by the lookup helpers in `src/app/services/spexfeed-name-lookup.ts`.
2. The `sf/alice` ROD value stores an `sf.profile` record with the linked Nostr hex public key in field `p`, plus compact profile metadata defined in `src/app/services/spexfeed-name.ts`.
3. A Nostr profile may also claim a SpeXFeed Name through supported metadata fields extracted by `getSpeXFeedNameClaim()` in `src/app/services/spexfeed-name-verification.ts`.
4. Verification compares the claimed name, the resolved ROD record, and the viewed profile public key using `verifySpeXFeedNameClaim()` in `src/app/services/spexfeed-name-verification.ts`.

### Source of truth rule

For alpha testers and maintainers, the important rule is:

- **ROD owns the handle**.
- **Nostr carries the social profile and posts**.
- **SpeXFeed verifies the connection**.

The Nostr profile claim is never treated as trusted by itself. The settings page explicitly warns that claimed SpeXFeed Names remain untrusted until the ROD record resolves to the same Nostr public key.

## Public naming model

The canonical handle construction currently uses:

- namespace: `sf`
- canonical ROD form: `sf/<handle>`
- record type: `sf.profile`
- linked key storage: lowercase 64-character hex Nostr public key

These facts are implemented in `src/app/services/spexfeed-name.ts` and `src/app/services/spexfeed-name-lookup.ts`.

## Verification states for testers

The MVP plan asks for states such as verified, partial/basic, mismatch, unverified claim, invalid record, not found, pending, and lookup failed. The current alpha implementation covers those concepts through a mix of verification-state and registration/update-state machines.

### Profile verification states

The current profile verification status enum in `src/app/services/spexfeed-name-verification.ts` provides:

- `verified` — the resolved ROD record points to the same viewed Nostr public key.
- `mismatch` — the ROD record resolves, but it points to a different Nostr public key.
- `unverified_claim` — the profile claims a SpeXFeed Name, but the resolved ROD record is missing or does not resolve to a registered profile binding.
- `invalid_record` — the name exists but the record is wrong-type or invalid for `sf.profile` use.
- `lookup_unavailable` — SpeXFeed could not verify because lookup failed or no lookup result is available.
- `invalid_claim` — the profile claim itself is malformed.
- `no_claim` — the profile does not claim a SpeXFeed Name.

### Mapping to the Sprint 6 acceptance vocabulary

For alpha documentation, testers should interpret the current implementation like this:

| Acceptance vocabulary | Current implementation meaning |
| --- | --- |
| verified | `verified` |
| partial/basic | **documented concept only**; the current code does not emit a separate `partial` status and instead focuses on whether the ROD record verifies the viewed pubkey |
| mismatch | `mismatch` |
| unverified claim | `unverified_claim` |
| invalid record | `invalid_record` |
| not found | represented operationally by a lookup result with status `available`, which means no registered `sf.profile` record was found for that handle |
| pending | registration/update request state `pending` in `src/app/services/spexfeed-name-registration.ts` and `src/app/services/spexfeed-name-profile-update.ts` |
| lookup failed / unavailable | `lookup_unavailable` or lower-level lookup status `lookup_failure` |

### Important alpha note about “partial/basic”

The MVP plan describes a “basic verified” or “partially linked” concept. The current implementation does **not** expose a distinct `partial` verification status in `src/app/services/spexfeed-name-verification.ts`. Alpha documentation should therefore describe “partial/basic” as a conceptual state from the plan, not as a separately surfaced badge state in this build.

## Where testers see the binding

- Settings surface: the SpeXFeed Name card in `src/app/pages/settings/settings.html`.
- Profile surfaces: the reusable badge component in `src/app/shared/spexfeed-name-badge/` and the profile integrations referenced by the Sprint 3 implementation summary.

The badge component chooses:

- verified icon for `verified`
- warning icon for `mismatch`
- informational styling for all other non-verified states

This behavior is implemented in `src/app/shared/spexfeed-name-badge/spexfeed-name-badge.ts` and `src/app/shared/spexfeed-name-badge/spexfeed-name-badge.html`.

## Alpha limitations

- Browser wallet custody is **not** implemented. The documentation and code explicitly avoid implying that SpeXFeed stores or controls ROD private keys.
- The default lookup adapter calls a backend HTTP endpoint rather than raw wallet RPC from the browser in `src/app/services/spexfeed-name-lookup.ts`.
- The registration/update adapter also assumes a backend/helper flow in `src/app/services/spexfeed-name-registration.ts`.
- The MVP plan allows controlled alpha helper services, and the implementation follows that narrower model rather than a production-ready browser wallet flow.

## Tester takeaway

A tester should treat a SpeXFeed Name as a **public, blockchain-anchored handle** that may verify a Nostr profile when the `sf.profile` ROD record points to the same public key. It is useful for public profile naming and impersonation resistance, but it is not yet a full identity system.
