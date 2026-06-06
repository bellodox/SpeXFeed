# SF Profile Schema v1

## Scope

This page documents the compact `sf.profile` record format implemented for SpeXFeed MVP 1.1. The plan defines this record as a compact, versioned ROD name value for `sf/<handle>` profile bindings, and the implementation lives in `src/app/services/spexfeed-name.ts`.

## Canonical identifiers

The current implementation defines:

- record type: `sf.profile`
- schema version: `1`
- namespace: `sf`
- maximum serialized record size: `2048` UTF-8 bytes

These values are defined by exported constants in `src/app/services/spexfeed-name.ts`.

## TypeScript interface

The implemented interface is `SpeXFeedProfileRecordV1` in `src/app/services/spexfeed-name.ts`:

```ts
export interface SpeXFeedProfileRecordV1 {
  v: 1;
  t: 'sf.profile';
  p: string;
  n: string;
  u: number;
  d?: string;
  a?: string;
  i?: string;
  r?: string[];
}
```

## Field definitions

### Required fields

- `v` — schema version. Must be `1`.
- `t` — record type. Must be `sf.profile`.
- `p` — linked Nostr public key in lowercase hex form.
- `n` — canonical handle without the `sf/` prefix.
- `u` — non-negative integer Unix-style updated timestamp.

### Optional fields

- `d` — display name.
- `a` — about/bio text.
- `i` — image/avatar URL. Must be absolute `http:` or `https:`.
- `r` — preferred relays. Every value must be an absolute `ws:` or `wss:` relay URL.

This matches the MVP plan’s compact production form and required/optional split.

## Example minimal valid record

```json
{
  "v": 1,
  "t": "sf.profile",
  "p": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "n": "alice",
  "u": 1764979200
}
```

## Example fuller valid record

```json
{
  "v": 1,
  "t": "sf.profile",
  "p": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "n": "alice",
  "d": "Alice",
  "a": "Builder in SpaceXpanse/OpenSpeX",
  "i": "https://example.com/avatar.png",
  "r": ["wss://relay.openspex.org"],
  "u": 1764979200
}
```

The helper `createSampleSpeXFeedProfileRecord()` in `src/app/services/spexfeed-name.ts` provides a representative valid sample with optional fields.

## Validation rules

Validation is enforced by `validateSpeXFeedProfileRecord()` and `validateSpeXFeedProfileRecordJson()` in `src/app/services/spexfeed-name.ts`.

### Object shape rules

- The record must be a JSON object.
- Arrays are rejected.
- Unknown fields are rejected.

### Public key rules

- `p` must be a lowercase 64-character hex string.
- The helper `canonicalizeNostrPublicKey()` normalizes input to lowercase before building records.

### Handle rules

The handle in `n` must satisfy the Sprint 1 rules implemented by `validateSpeXFeedHandle()` in `src/app/services/spexfeed-name.ts`:

- length `3` to `32`
- lowercase letters, digits, and internal hyphens only
- must start and end with a letter or digit
- reserved names are rejected

The reserved-name list is exported as `SPEXFEED_RESERVED_NAMES` in `src/app/services/spexfeed-name.ts`.

### URL rules

- `i` must be a valid absolute `http` or `https` URL.
- every `r` item must be a valid absolute `ws` or `wss` URL.

### Size rule

- serialized JSON must stay within `2048` UTF-8 bytes

The byte-size check is implemented through `serializeSpeXFeedProfileRecord()` and `getRecordValueSizeBytes()` in `src/app/services/spexfeed-name.ts`.

## Canonical ROD name derivation

The canonical ROD name for a valid handle is constructed by `createRodNameForHandle()` in `src/app/services/spexfeed-name.ts`.

Examples:

- `alice` → `sf/alice`
- `void-runner` → `sf/void-runner`

## Lookup and parsing behavior

The lookup service in `src/app/services/spexfeed-name-lookup.ts` expects a registered name value to parse into this schema. Parsing outcomes include:

- `registered` when the record validates
- `wrong_type` when the JSON exists but `t` is not `sf.profile`
- `invalid_record` when the JSON is malformed or fails schema validation

## Alpha limitations

- This schema is for public profile-handle binding only.
- It is not SpeXID and should not be documented as a general identity credential.
- The schema says nothing about ownership custody inside the browser; browser wallet/private-key handling is intentionally out of scope for this MVP.

## Maintainer note

If the schema evolves beyond MVP 1.1, keep backward compatibility explicit and document any new version alongside the current `v: 1` contract rather than silently redefining this page.
