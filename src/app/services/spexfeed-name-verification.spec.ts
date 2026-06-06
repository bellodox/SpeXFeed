import { SpeXFeedNameLookupResult } from './spexfeed-name-lookup';
import { getSpeXFeedNameClaim, verifySpeXFeedNameClaim } from './spexfeed-name-verification';

const PROFILE_PUBKEY = 'a'.repeat(64);
const OTHER_PUBKEY = 'b'.repeat(64);

function lookupResult(pubkey: string): SpeXFeedNameLookupResult {
  return {
    status: 'registered',
    input: 'alice',
    handle: 'alice',
    rodName: 'sf/alice',
    available: false,
    found: true,
    valid: true,
    pubkey,
    errors: [],
  };
}

describe('SpeXFeed Name Sprint 3 verification', () => {
  it('extracts supported untrusted metadata claim shapes', () => {
    expect(getSpeXFeedNameClaim({ spexfeed_name: ' alice ' })).toBe('alice');
    expect(getSpeXFeedNameClaim({ spexfeedName: 'bob' })).toBe('bob');
    expect(getSpeXFeedNameClaim({ spexfeed: { name: 'carol' } })).toBe('carol');
    expect(getSpeXFeedNameClaim({ name: 'nostr-only' })).toBeUndefined();
  });

  it('marks a registered claim verified only when the ROD record public key matches the viewed profile', () => {
    const result = verifySpeXFeedNameClaim(PROFILE_PUBKEY, 'alice', lookupResult(PROFILE_PUBKEY));

    expect(result.status).toBe('verified');
    expect(result.verifiedName).toBe('alice');
    expect(result.actualPubkey).toBe(PROFILE_PUBKEY);
  });

  it('marks mismatched public keys as warnings instead of verified names', () => {
    const result = verifySpeXFeedNameClaim(PROFILE_PUBKEY, 'alice', lookupResult(OTHER_PUBKEY));

    expect(result.status).toBe('mismatch');
    expect(result.actualPubkey).toBe(OTHER_PUBKEY);
  });

  it('marks unavailable lookup as unable to verify without throwing', () => {
    const result = verifySpeXFeedNameClaim(PROFILE_PUBKEY, 'alice', {
      status: 'lookup_failure',
      input: 'alice',
      handle: 'alice',
      rodName: 'sf/alice',
      available: false,
      found: false,
      valid: false,
      errors: ['Backend unavailable.'],
    });

    expect(result.status).toBe('lookup_unavailable');
  });

  it('clearly separates unverified and invalid claims from verified names', () => {
    expect(verifySpeXFeedNameClaim(PROFILE_PUBKEY, undefined).status).toBe('no_claim');
    expect(
      verifySpeXFeedNameClaim(PROFILE_PUBKEY, 'alice', {
        status: 'available',
        input: 'alice',
        handle: 'alice',
        rodName: 'sf/alice',
        available: true,
        found: false,
        valid: true,
        errors: [],
      }).status
    ).toBe('unverified_claim');
    expect(
      verifySpeXFeedNameClaim(PROFILE_PUBKEY, 'bad', {
        status: 'invalid_name',
        input: 'bad',
        available: false,
        found: false,
        valid: false,
        errors: ['Invalid name.'],
      }).status
    ).toBe('invalid_claim');
  });
});
