import { SpeXFeedNameLookupResult } from './spexfeed-name-lookup';

export type SpeXFeedNameVerificationStatus =
  | 'no_claim'
  | 'verified'
  | 'mismatch'
  | 'unverified_claim'
  | 'lookup_unavailable'
  | 'invalid_claim'
  | 'invalid_record';

export interface SpeXFeedNameVerificationResult {
  status: SpeXFeedNameVerificationStatus;
  claimedName?: string;
  verifiedName?: string;
  expectedPubkey?: string;
  actualPubkey?: string;
  message: string;
}

const COMPACT_CLAIM_FIELDS = ['spexfeed_name', 'spexfeedName', 'sf_name'];

/** Extracts an untrusted SpeXFeed Name claim from supported Nostr metadata shapes. */
export function getSpeXFeedNameClaim(profile: unknown): string | undefined {
  if (!profile || typeof profile !== 'object') {
    return undefined;
  }

  const profileRecord = profile as Record<string, unknown>;

  for (const field of COMPACT_CLAIM_FIELDS) {
    const claim = profileRecord[field];

    if (typeof claim === 'string' && claim.trim().length > 0) {
      return claim.trim();
    }
  }

  const spexfeed = profileRecord['spexfeed'];

  if (spexfeed && typeof spexfeed === 'object') {
    const name = (spexfeed as Record<string, unknown>)['name'];

    if (typeof name === 'string' && name.trim().length > 0) {
      return name.trim();
    }
  }

  return undefined;
}

/** Compares an untrusted metadata claim with a Sprint 2 lookup result for a viewed profile key. */
export function verifySpeXFeedNameClaim(profilePubkey: string | undefined, claimedName: string | undefined, lookupResult?: SpeXFeedNameLookupResult): SpeXFeedNameVerificationResult {
  const normalizedPubkey = profilePubkey?.trim().toLowerCase();
  const normalizedClaim = claimedName?.trim();

  if (!normalizedClaim) {
    return {
      status: 'no_claim',
      message: 'No SpeXFeed Name claimed.',
    };
  }

  if (!lookupResult) {
    return {
      status: 'lookup_unavailable',
      claimedName: normalizedClaim,
      expectedPubkey: normalizedPubkey,
      message: 'Unable to verify SpeXFeed Name.',
    };
  }

  if (lookupResult.status === 'lookup_failure') {
    return {
      status: 'lookup_unavailable',
      claimedName: normalizedClaim,
      expectedPubkey: normalizedPubkey,
      message: 'SpeXFeed Name lookup unavailable.',
    };
  }

  if (lookupResult.status === 'invalid_name') {
    return {
      status: 'invalid_claim',
      claimedName: normalizedClaim,
      expectedPubkey: normalizedPubkey,
      message: 'SpeXFeed Name claim is invalid.',
    };
  }

  if (lookupResult.status === 'invalid_record' || lookupResult.status === 'wrong_type') {
    return {
      status: 'invalid_record',
      claimedName: normalizedClaim,
      expectedPubkey: normalizedPubkey,
      message: 'SpeXFeed Name record is not a valid profile record.',
    };
  }

  if (lookupResult.status === 'available' || !lookupResult.pubkey) {
    return {
      status: 'unverified_claim',
      claimedName: normalizedClaim,
      expectedPubkey: normalizedPubkey,
      message: 'SpeXFeed Name claim is not registered.',
    };
  }

  const lookupPubkey = lookupResult.pubkey.trim().toLowerCase();
  const displayName = lookupResult.handle ?? normalizedClaim;

  if (normalizedPubkey && lookupPubkey === normalizedPubkey) {
    return {
      status: 'verified',
      claimedName: normalizedClaim,
      verifiedName: displayName,
      expectedPubkey: normalizedPubkey,
      actualPubkey: lookupPubkey,
      message: `Verified SpeXFeed Name: ${displayName}`,
    };
  }

  return {
    status: 'mismatch',
    claimedName: normalizedClaim,
    verifiedName: displayName,
    expectedPubkey: normalizedPubkey,
    actualPubkey: lookupPubkey,
    message: 'SpeXFeed Name belongs to a different Nostr public key.',
  };
}
