# Security and Privacy for SpeXFeed Names

## Scope

This page documents the key security, impersonation, and privacy constraints for SpeXFeed MVP 1.1 Name support. The plan explicitly requires privacy warnings, anti-impersonation behavior, and a clear “not SpeXID” framing.

Primary evidence:

- safety copy in `src/app/pages/register-name/register-name.html`
- safety copy in `src/app/pages/update-name/update-name.html`
- verification logic in `src/app/services/spexfeed-name-verification.ts`
- lookup parsing in `src/app/services/spexfeed-name-lookup.ts`
- backend/helper request model in `src/app/services/spexfeed-name-registration.ts`

## Core privacy warning

Linking `sf/<name>` to a Nostr public key is **public**.

That means:

- anyone who can read the ROD record can see which public key the name points to
- anyone who can view the associated Nostr profile metadata can often correlate the same identity
- profile metadata copied into the ROD record becomes public as well

This is why the registration page warns that registration creates a public link between the ROD name and the Nostr public key, and why the update page warns that updates publish profile metadata in the ROD name record.

## What users should not assume

Users and testers must not assume that a SpeXFeed Name provides:

- anonymity
- private identity proof
- legal identity
- proof-of-personhood
- KYC
- universal authentication
- hidden ownership or hidden profile linkage

SpeXFeed Names are deliberately public handles.

## Impersonation model

The main impersonation risk is simple: a Nostr user can claim a SpeXFeed Name in profile metadata without actually controlling the matching ROD record.

The implementation addresses that risk by treating profile claims as untrusted until ROD verification succeeds.

### Verification rule

`verifySpeXFeedNameClaim()` in `src/app/services/spexfeed-name-verification.ts` implements the trust rule:

- if the ROD record resolves to the viewed public key, show verified
- if the ROD record points elsewhere, show mismatch
- if the claim exists but no valid confirming record exists, show unverified claim or invalid record
- if lookup fails, show lookup unavailable rather than silently trusting the claim

This behavior is the core anti-impersonation control for MVP 1.1.

## Verification state explanations

Alpha testers should understand the following state meanings.

### Verified

The record resolves and the linked pubkey equals the viewed Nostr public key.

### Partial/basic

The MVP plan discusses a basic or partially linked concept, but the current alpha implementation does not surface a dedicated `partial` status. Treat this as a documentation concept reserved for future refinement rather than an exposed state in this build.

### Mismatch

The name exists, but its ROD record points to a different public key.

### Unverified claim

The Nostr profile claims a name, but the claim is not backed by a confirming registered binding for the viewed key.

### Invalid record

The name exists, but the record is malformed or the type is wrong for SpeXFeed profile binding.

### Not found

No registered `sf.profile` record was found for the requested handle. In current lookup code, this appears operationally as an `available` result.

### Pending

The registration or update request was accepted by the helper/backend flow, but confirmation and/or updated-record detection is not complete yet.

### Lookup failed / unavailable

The helper/backend lookup path did not return a usable result, so the app cannot verify the claim.

## Backend and custody boundaries

The code intentionally avoids embedding wallet RPC credentials or private-key custody in the browser.

Evidence:

- lookup uses an HTTP adapter endpoint in `src/app/services/spexfeed-name-lookup.ts`
- registration/update uses an HTTP adapter endpoint in `src/app/services/spexfeed-name-registration.ts`
- tests assert that serialized requests do not contain private-key or RPC credential material in `src/app/services/spexfeed-name-registration.spec.ts`

This is an important alpha boundary:

- a helper/backend service may exist
- browser wallet custody does not
- SpeXFeed does not claim to store ROD private keys

## Data exposure considerations

Even optional profile fields in `sf.profile` should be treated as public if used:

- display name
- about/bio
- avatar URL
- preferred relay list
- updated timestamp

Users wanting separation between blockchain identity and Nostr identity should not register or update a public SpeXFeed Name.

## Security expectations for testers

When testing this alpha feature, verify that:

1. unverified claims are not shown as verified
2. mismatch states remain visible and understandable
3. invalid records do not break profile/settings surfaces
4. lookup failures degrade to a warning state rather than silent trust
5. warnings about public linkage and not-SpeXID framing remain visible on registration/update surfaces

## Non-goals in MVP 1.1

The following are outside current scope and should not be implied by docs or release notes:

- account recovery
- full decentralized identity
- cross-app login
- wallet management
- proof-post infrastructure
- reputation graphs
- trust scores
- agent identity/passport behavior

## Maintainer guidance

Any future documentation that expands this feature should preserve three explicit warnings unless the implementation truly changes:

1. SpeXFeed Names are public profile handles, not SpeXID.
2. Linking a name to a Nostr key is publicly visible.
3. Verification depends on ROD record confirmation, not self-asserted metadata alone.
