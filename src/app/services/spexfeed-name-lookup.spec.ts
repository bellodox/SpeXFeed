import {
  parseSpeXFeedLookupRecord,
  normalizeSpeXFeedLookupName,
  SpeXFeedNameLookupAdapter,
  SpeXFeedNameLookupService,
} from './spexfeed-name-lookup';
import { createSampleSpeXFeedProfileRecord } from './spexfeed-name';

class MockSpeXFeedNameLookupAdapter implements SpeXFeedNameLookupAdapter {
  constructor(private readonly responses: Record<string, { found: boolean; value?: string | null }>) {}

  async lookupName(rodName: string) {
    const response = this.responses[rodName];

    if (!response) {
      throw new Error(`Missing mock response for ${rodName}.`);
    }

    return response;
  }
}

describe('SpeXFeed Name Sprint 2 lookup', () => {
  it('normalizes alice and sf/alice into the canonical sf/alice lookup name', () => {
    expect(normalizeSpeXFeedLookupName('alice')).toEqual({
      valid: true,
      handle: 'alice',
      rodName: 'sf/alice',
      errors: [],
    });

    expect(normalizeSpeXFeedLookupName(' sf/alice ')).toEqual({
      valid: true,
      handle: 'alice',
      rodName: 'sf/alice',
      errors: [],
    });
  });

  it('rejects invalid and wrong-namespace names', () => {
    expect(normalizeSpeXFeedLookupName('rf/alice')).toEqual({
      valid: false,
      errors: ['Name must be a handle or an sf/<handle> name.'],
    });

    expect(normalizeSpeXFeedLookupName('Al')).toEqual({
      valid: false,
      errors: [
        'Handle must be 3-32 characters long.',
        'Handle may contain only lowercase letters, numbers, and internal hyphens, and must start and end with a letter or number.',
      ],
    });
  });

  it('parses a valid sf.profile record and returns the linked Nostr pubkey', () => {
    const record = createSampleSpeXFeedProfileRecord();
    const result = parseSpeXFeedLookupRecord(JSON.stringify(record));

    expect(result.status).toBe('registered');
    expect(result.valid).toBeTrue();
    expect(result.pubkey).toBe(record.p);
    expect(result.record).toEqual(record);
  });

  it('identifies wrong-type and invalid records', () => {
    const wrongTypeResult = parseSpeXFeedLookupRecord(
      JSON.stringify({
        ...createSampleSpeXFeedProfileRecord(),
        t: 'sf.other',
      })
    );

    expect(wrongTypeResult.status).toBe('wrong_type');
    expect(wrongTypeResult.errors).toEqual(['Record type must be sf.profile.']);

    const invalidRecordResult = parseSpeXFeedLookupRecord(
      JSON.stringify({
        ...createSampleSpeXFeedProfileRecord(),
        p: 'invalid',
      })
    );

    expect(invalidRecordResult.status).toBe('invalid_record');
    expect(invalidRecordResult.errors).toContain('Record public key must be a 64-character lowercase hex string.');
  });

  it('reports sf/alice as available when the backend says the name does not exist', async () => {
    const service = new SpeXFeedNameLookupService(
      new MockSpeXFeedNameLookupAdapter({
        'sf/alice': { found: false, value: null },
      }) as never
    );

    const result = await service.checkAvailability('alice');

    expect(result.status).toBe('available');
    expect(result.available).toBeTrue();
    expect(result.rodName).toBe('sf/alice');
  });

  it('resolves a registered sf.profile record for sf/alice', async () => {
    const record = createSampleSpeXFeedProfileRecord({ n: 'alice' });
    const service = new SpeXFeedNameLookupService(
      new MockSpeXFeedNameLookupAdapter({
        'sf/alice': { found: true, value: JSON.stringify(record) },
      }) as never
    );

    const result = await service.resolveProfile('sf/alice');

    expect(result.status).toBe('registered');
    expect(result.available).toBeFalse();
    expect(result.pubkey).toBe(record.p);
    expect(result.record).toEqual(record);
  });

  it('reports invalid names and lookup failures with structured statuses', async () => {
    const invalidNameService = new SpeXFeedNameLookupService(
      new MockSpeXFeedNameLookupAdapter({}) as never
    );

    const invalidNameResult = await invalidNameService.resolveProfile('ad');
    expect(invalidNameResult.status).toBe('invalid_name');

    const failingService = new SpeXFeedNameLookupService(
      {
        lookupName: async () => {
          throw new Error('Backend unavailable.');
        },
      } as SpeXFeedNameLookupAdapter as never
    );

    const lookupFailureResult = await failingService.resolveProfile('alice');
    expect(lookupFailureResult.status).toBe('lookup_failure');
    expect(lookupFailureResult.errors).toEqual(['Backend unavailable.']);
  });
});
