import { nip19 } from 'nostr-tools';

export const SPEXFEED_NAME_RECORD_TYPE = 'sf.profile';
export const SPEXFEED_NAME_SCHEMA_VERSION = 1;
export const SPEXFEED_NAME_NAMESPACE = 'sf';
export const SPEXFEED_NAME_MAX_VALUE_SIZE_BYTES = 2048;
export const SPEXFEED_NAME_MIN_HANDLE_LENGTH = 3;
export const SPEXFEED_NAME_MAX_HANDLE_LENGTH = 32;

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;
const LOWERCASE_HEX_PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/;
const HTTP_URL_PATTERN = /^https?:\/\//;
const ALLOWED_RECORD_KEYS = ['v', 't', 'p', 'n', 'u', 'd', 'a', 'i', 'r'] as const;
const NPUB_PREFIX = 'npub1';

export const SPEXFEED_RESERVED_NAMES = new Set([
  'admin',
  'root',
  'support',
  'spex',
  'openspex',
  'spacexpanse',
  'rod',
  'metalog',
  'launchpad',
  'voidrunner',
  'orbitchallenge',
  'darma',
  'relay',
  'wallet',
  'api',
  'official',
  'foundation',
]);

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

export interface SpeXFeedNameValidationResult {
  valid: boolean;
  errors: string[];
  record?: SpeXFeedProfileRecordV1;
  json?: string;
  rodName?: string;
  byteSize?: number;
}

/** Returns the canonical sf/<handle> ROD name for a validated SpeXFeed handle. */
export function createRodNameForHandle(handle: string): string {
  return `${SPEXFEED_NAME_NAMESPACE}/${handle}`;
}

/** Returns the canonical lowercase hex Nostr public key form used in sf.profile records. */
export function canonicalizeNostrPublicKey(publicKey: string): string {
  if (typeof publicKey !== 'string') {
    throw new Error('Nostr public key must be a string.');
  }

  const normalizedPublicKey = publicKey.trim();

  if (!normalizedPublicKey) {
    throw new Error('Nostr public key is required.');
  }

  const lowercasePublicKey = normalizedPublicKey.toLowerCase();

  if (LOWERCASE_HEX_PUBLIC_KEY_PATTERN.test(lowercasePublicKey)) {
    return lowercasePublicKey;
  }

  if (lowercasePublicKey.startsWith(NPUB_PREFIX)) {
    try {
      const decodedIdentifier = nip19.decode(lowercasePublicKey);

      if (decodedIdentifier.type !== 'npub' || typeof decodedIdentifier.data !== 'string' || !LOWERCASE_HEX_PUBLIC_KEY_PATTERN.test(decodedIdentifier.data)) {
        throw new Error('Invalid npub public key.');
      }

      return decodedIdentifier.data;
    } catch {
      throw new Error('Nostr public key must be a valid 64-character hex key or npub value.');
    }
  }

  throw new Error('Nostr public key must be a valid 64-character hex key or npub value.');
}

/** Returns validation errors for a candidate Nostr public key accepted by SpeXFeed Name flows. */
export function validateNostrPublicKey(publicKey: string): string[] {
  try {
    canonicalizeNostrPublicKey(publicKey);
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : 'Nostr public key is invalid.'];
  }
}

/** Returns whether a handle satisfies the Sprint 1 SpeXFeed Name rules. */
export function validateSpeXFeedHandle(handle: string): string[] {
  const errors: string[] = [];

  if (typeof handle !== 'string') {
    return ['Handle must be a string.'];
  }

  if (handle.length < SPEXFEED_NAME_MIN_HANDLE_LENGTH || handle.length > SPEXFEED_NAME_MAX_HANDLE_LENGTH) {
    errors.push(`Handle must be ${SPEXFEED_NAME_MIN_HANDLE_LENGTH}-${SPEXFEED_NAME_MAX_HANDLE_LENGTH} characters long.`);
  }

  if (!HANDLE_PATTERN.test(handle)) {
    errors.push('Handle may contain only lowercase letters, numbers, and internal hyphens, and must start and end with a letter or number.');
  }

  if (SPEXFEED_RESERVED_NAMES.has(handle)) {
    errors.push('Handle is reserved.');
  }

  return errors;
}

/** Returns a reusable valid Sprint 1 sample record for tests and later flows. */
export function createSampleSpeXFeedProfileRecord(overrides: Partial<SpeXFeedProfileRecordV1> = {}): SpeXFeedProfileRecordV1 {
  return {
    v: SPEXFEED_NAME_SCHEMA_VERSION,
    t: SPEXFEED_NAME_RECORD_TYPE,
    p: canonicalizeNostrPublicKey('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
    n: 'alice',
    d: 'Alice',
    a: 'Builder in SpaceXpanse/OpenSpeX',
    i: 'https://example.com/avatar.png',
    r: ['wss://relay.openspex.org'],
    u: 1764979200,
    ...overrides,
  };
}

/** Serializes a record into compact JSON for byte-size checks and persistence. */
export function serializeSpeXFeedProfileRecord(record: SpeXFeedProfileRecordV1): string {
  return JSON.stringify(record);
}

/** Returns the UTF-8 byte size of a candidate ROD value. */
export function getRecordValueSizeBytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** Returns whether a relay URL is a valid absolute ws/wss URL. */
export function isValidRelayUrl(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'ws:' || parsedUrl.protocol === 'wss:';
  } catch {
    return false;
  }
}

/** Returns whether a profile image URL is a valid absolute http/https URL. */
export function isValidProfileImageUrl(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0 || !HTTP_URL_PATTERN.test(value)) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Validates a parsed Sprint 1 SpeXFeed Name record object. */
export function validateSpeXFeedProfileRecord(record: unknown): SpeXFeedNameValidationResult {
  const errors: string[] = [];

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { valid: false, errors: ['Record must be a JSON object.'] };
  }

  const candidateRecord = record as Partial<SpeXFeedProfileRecordV1> & Record<string, unknown>;
  const unknownKeys = Object.keys(candidateRecord).filter((key) => !(ALLOWED_RECORD_KEYS as readonly string[]).includes(key));

  if (unknownKeys.length > 0) {
    errors.push(`Unknown record fields: ${unknownKeys.join(', ')}.`);
  }

  if (candidateRecord.v !== SPEXFEED_NAME_SCHEMA_VERSION) {
    errors.push('Record schema version must be 1.');
  }

  if (candidateRecord.t !== SPEXFEED_NAME_RECORD_TYPE) {
    errors.push('Record type must be sf.profile.');
  }

  if (typeof candidateRecord.p !== 'string' || !LOWERCASE_HEX_PUBLIC_KEY_PATTERN.test(candidateRecord.p)) {
    errors.push('Record public key must be a 64-character lowercase hex string.');
  }

  if (typeof candidateRecord.n !== 'string') {
    errors.push('Record handle is required.');
  } else {
    errors.push(...validateSpeXFeedHandle(candidateRecord.n));
  }

  if (!Number.isInteger(candidateRecord.u) || (candidateRecord.u as number) < 0) {
    errors.push('Record updated timestamp must be a non-negative integer.');
  }

  if (candidateRecord.d != null && typeof candidateRecord.d !== 'string') {
    errors.push('Record display name must be a string when present.');
  }

  if (candidateRecord.a != null && typeof candidateRecord.a !== 'string') {
    errors.push('Record about field must be a string when present.');
  }

  if (candidateRecord.i != null) {
    if (typeof candidateRecord.i !== 'string' || !isValidProfileImageUrl(candidateRecord.i)) {
      errors.push('Record image URL must be a valid absolute http/https URL when present.');
    }
  }

  if (candidateRecord.r != null) {
    if (!Array.isArray(candidateRecord.r) || candidateRecord.r.some((relayUrl) => typeof relayUrl !== 'string' || !isValidRelayUrl(relayUrl))) {
      errors.push('Record relays must contain only valid absolute ws/wss relay URLs.');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const validatedRecord = candidateRecord as SpeXFeedProfileRecordV1;
  const serializedRecord = serializeSpeXFeedProfileRecord(validatedRecord);
  const byteSize = getRecordValueSizeBytes(serializedRecord);

  if (byteSize > SPEXFEED_NAME_MAX_VALUE_SIZE_BYTES) {
    return {
      valid: false,
      errors: [`Record exceeds the ${SPEXFEED_NAME_MAX_VALUE_SIZE_BYTES}-byte ROD value limit.`],
      json: serializedRecord,
      record: validatedRecord,
      rodName: createRodNameForHandle(validatedRecord.n),
      byteSize,
    };
  }

  return {
    valid: true,
    errors: [],
    json: serializedRecord,
    record: validatedRecord,
    rodName: createRodNameForHandle(validatedRecord.n),
    byteSize,
  };
}

/** Parses and validates JSON content for a Sprint 1 SpeXFeed Name record. */
export function validateSpeXFeedProfileRecordJson(json: string): SpeXFeedNameValidationResult {
  if (typeof json !== 'string') {
    return { valid: false, errors: ['Record JSON must be a string.'] };
  }

  try {
    const parsedRecord = JSON.parse(json);
    return validateSpeXFeedProfileRecord(parsedRecord);
  } catch {
    return { valid: false, errors: ['Malformed JSON.'] };
  }
}
