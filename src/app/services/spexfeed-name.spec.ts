import {
  canonicalizeNostrPublicKey,
  createRodNameForHandle,
  createSampleSpeXFeedProfileRecord,
  getRecordValueSizeBytes,
  SPEXFEED_NAME_MAX_VALUE_SIZE_BYTES,
  validateSpeXFeedHandle,
  validateNostrPublicKey,
  validateSpeXFeedProfileRecord,
  validateSpeXFeedProfileRecordJson,
} from './spexfeed-name';

describe('SpeXFeed Name Sprint 1 validation', () => {
  it('passes a valid sf.profile v1 record', () => {
    const record = createSampleSpeXFeedProfileRecord();
    const result = validateSpeXFeedProfileRecord(record);

    expect(result.valid).toBeTrue();
    expect(result.errors).toEqual([]);
    expect(result.rodName).toBe('sf/alice');
    expect(result.byteSize).toBeLessThanOrEqual(SPEXFEED_NAME_MAX_VALUE_SIZE_BYTES);
  });

  it('builds the canonical sf/<handle> name', () => {
    expect(createRodNameForHandle('agent007')).toBe('sf/agent007');
  });

  it('canonicalizes nostr public keys to lowercase hex', () => {
    expect(canonicalizeNostrPublicKey(' 0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF ')).toBe('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
  });

  it('canonicalizes npub public keys to lowercase hex', () => {
    expect(canonicalizeNostrPublicKey('npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m')).toBe('82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2');
  });

  it('reports validation errors for invalid nostr public keys', () => {
    expect(validateNostrPublicKey('not-a-key')).toEqual(['Nostr public key must be a valid 64-character hex key or npub value.']);
  });

  it('rejects invalid handles based on Sprint 1 rules', () => {
    expect(validateSpeXFeedHandle('Alice').length).toBeGreaterThan(0);
    expect(validateSpeXFeedHandle('al').length).toBeGreaterThan(0);
    expect(validateSpeXFeedHandle('open/spex').length).toBeGreaterThan(0);
    expect(validateSpeXFeedHandle('-spex').length).toBeGreaterThan(0);
    expect(validateSpeXFeedHandle('spex-').length).toBeGreaterThan(0);
    expect(validateSpeXFeedHandle('space xpanse').length).toBeGreaterThan(0);
    expect(validateSpeXFeedHandle('admin')).toContain('Handle is reserved.');
    expect(validateSpeXFeedHandle('void-runner')).toEqual([]);
  });

  it('fails oversized records beyond the ROD 2048-byte value limit', () => {
    const record = createSampleSpeXFeedProfileRecord({
      a: 'x'.repeat(2100),
    });

    const result = validateSpeXFeedProfileRecord(record);

    expect(result.valid).toBeFalse();
    expect(result.errors).toContain('Record exceeds the 2048-byte ROD value limit.');
    expect(result.byteSize).toBeGreaterThan(SPEXFEED_NAME_MAX_VALUE_SIZE_BYTES);
  });

  it('fails records with invalid relay URLs', () => {
    const result = validateSpeXFeedProfileRecord(
      createSampleSpeXFeedProfileRecord({
        r: ['https://relay.openspex.org'],
      })
    );

    expect(result.valid).toBeFalse();
    expect(result.errors).toContain('Record relays must contain only valid absolute ws/wss relay URLs.');
  });

  it('fails records with invalid names', () => {
    const result = validateSpeXFeedProfileRecord(
      createSampleSpeXFeedProfileRecord({
        n: 'Alice',
      })
    );

    expect(result.valid).toBeFalse();
    expect(result.errors).toContain('Handle may contain only lowercase letters, numbers, and internal hyphens, and must start and end with a letter or number.');
  });

  it('fails records without a canonical lowercase hex public key', () => {
    const result = validateSpeXFeedProfileRecord(
      createSampleSpeXFeedProfileRecord({
        p: '' as never,
      })
    );

    expect(result.valid).toBeFalse();
    expect(result.errors).toContain('Record public key must be a 64-character lowercase hex string.');
  });

  it('fails malformed JSON', () => {
    const result = validateSpeXFeedProfileRecordJson('{"v":1');

    expect(result.valid).toBeFalse();
    expect(result.errors).toContain('Malformed JSON.');
  });

  it('fails wrong record type and version', () => {
    const result = validateSpeXFeedProfileRecord({
      ...createSampleSpeXFeedProfileRecord(),
      v: 2,
      t: 'wrong.profile',
    });

    expect(result.valid).toBeFalse();
    expect(result.errors).toContain('Record schema version must be 1.');
    expect(result.errors).toContain('Record type must be sf.profile.');
  });

  it('reports UTF-8 byte size for reusable size checks', () => {
    const size = getRecordValueSizeBytes(JSON.stringify(createSampleSpeXFeedProfileRecord()));
    expect(size).toBeGreaterThan(0);
  });
});
