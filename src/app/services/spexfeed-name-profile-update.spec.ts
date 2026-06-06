import { buildSpeXFeedProfileUpdatePreview, SpeXFeedNameProfileUpdateService } from './spexfeed-name-profile-update';
import { SpeXFeedNameLookupAdapter, SpeXFeedNameLookupService } from './spexfeed-name-lookup';
import { SpeXFeedNameConfirmationResult, SpeXFeedNameRegistrationAdapter, SpeXFeedNameRequest } from './spexfeed-name-registration';

const ORIGINAL_PUBKEY = 'a'.repeat(64);
const ROTATED_PUBKEY = 'b'.repeat(64);

class MockLookupAdapter implements SpeXFeedNameLookupAdapter {
  value = JSON.stringify({ v: 1, t: 'sf.profile', p: ORIGINAL_PUBKEY, n: 'alice', u: 1 });

  async lookupName(rodName: string) {
    return { found: true, name: rodName, value: this.value };
  }
}

class MockRegistrationAdapter implements SpeXFeedNameRegistrationAdapter {
  submittedRequest?: SpeXFeedNameRequest;
  statusResponses: SpeXFeedNameConfirmationResult[] = [];

  async submitRequest(request: SpeXFeedNameRequest) {
    this.submittedRequest = request;
    return { requestId: 'update-1', status: 'pending' as const, message: 'Submitted.' };
  }

  async getRequestStatus(requestId: string) {
    return this.statusResponses.shift() ?? { requestId, status: 'pending' as const };
  }
}

describe('SpeXFeed Name Sprint 5 profile update', () => {
  it('creates a compact JSON preview with display metadata and preferred relay', () => {
    const preview = buildSpeXFeedProfileUpdatePreview(
      {
        handle: 'alice',
        displayName: 'Alice Example',
        about: 'Builder',
        avatarUrl: 'https://example.com/avatar.png',
        relayText: 'wss://relay.example.com',
        nostrPubkey: ORIGINAL_PUBKEY,
      },
      undefined,
      123
    );

    expect(preview.validation.valid).toBeTrue();
    expect(preview.request?.value).toBe(JSON.stringify(preview.request?.record));
    expect(preview.request?.record).toEqual({ v: 1, t: 'sf.profile', p: ORIGINAL_PUBKEY, n: 'alice', u: 123, d: 'Alice Example', a: 'Builder', i: 'https://example.com/avatar.png', r: ['wss://relay.example.com'] });
  });

  it('validates ROD record size before submission', () => {
    const preview = buildSpeXFeedProfileUpdatePreview({ handle: 'alice', displayName: 'Alice', about: 'x'.repeat(2100), avatarUrl: '', relayText: '', nostrPubkey: ORIGINAL_PUBKEY });

    expect(preview.validation.valid).toBeFalse();
    expect(preview.validation.errors[0]).toContain('2048-byte');
    expect(preview.validation.byteSize).toBeGreaterThan(2048);
  });

  it('detects linked-key rotation warning state', () => {
    const preview = buildSpeXFeedProfileUpdatePreview(
      { handle: 'alice', displayName: '', about: '', avatarUrl: '', relayText: '', nostrPubkey: ROTATED_PUBKEY },
      { v: 1, t: 'sf.profile', p: ORIGINAL_PUBKEY, n: 'alice', u: 1 },
      2
    );

    expect(preview.rotatesLinkedKey).toBeTrue();
  });

  it('submits update payload through the helper-service abstraction', async () => {
    const lookupAdapter = new MockLookupAdapter();
    const registrationAdapter = new MockRegistrationAdapter();
    const service = new SpeXFeedNameProfileUpdateService(new SpeXFeedNameLookupService(lookupAdapter as never), registrationAdapter as never);
    const preview = buildSpeXFeedProfileUpdatePreview({ handle: 'alice', displayName: 'Alice', about: '', avatarUrl: '', relayText: 'wss://relay.example.com', nostrPubkey: ORIGINAL_PUBKEY }, undefined, 5);

    const state = await service.submitUpdate(preview.request!);

    expect(state.status).toBe('pending');
    expect(registrationAdapter.submittedRequest?.action).toBe('update');
    expect(registrationAdapter.submittedRequest?.record.r).toEqual(['wss://relay.example.com']);
  });

  it('re-queries lookup after confirmation and detects updated record', async () => {
    const lookupAdapter = new MockLookupAdapter();
    const registrationAdapter = new MockRegistrationAdapter();
    registrationAdapter.statusResponses = [{ requestId: 'update-1', status: 'verified', message: 'Confirmed.' }];
    const service = new SpeXFeedNameProfileUpdateService(new SpeXFeedNameLookupService(lookupAdapter as never), registrationAdapter as never);
    const preview = buildSpeXFeedProfileUpdatePreview({ handle: 'alice', displayName: 'Alice Updated', about: '', avatarUrl: '', relayText: '', nostrPubkey: ORIGINAL_PUBKEY }, undefined, 10);
    const pendingState = await service.submitUpdate(preview.request!);
    lookupAdapter.value = preview.request!.value;

    const verifiedState = await service.trackUpdateConfirmation(pendingState, 0, 1);

    expect(verifiedState.status).toBe('verified');
    expect(verifiedState.detectedRecord?.d).toBe('Alice Updated');
    expect(verifiedState.message).toContain('detected');
  });
});
