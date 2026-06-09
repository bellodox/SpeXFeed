import {
  buildSpeXFeedNameRegistrationRequest,
  buildSpeXFeedNameUpdateRequest,
  SpeXFeedNameConfirmationResult,
  SpeXFeedNameRegistrationAdapter,
  SpeXFeedNameRegistrationService,
  SpeXFeedNameRequest,
} from './spexfeed-name-registration';
import { SpeXFeedNameLookupAdapter, SpeXFeedNameLookupService } from './spexfeed-name-lookup';

const PROFILE_PUBKEY = 'a'.repeat(64);

class MockLookupAdapter implements SpeXFeedNameLookupAdapter {
  constructor(private readonly found: boolean) {}

  async lookupName(rodName: string) {
    return {
      found: this.found,
      name: rodName,
      value: this.found ? JSON.stringify({ v: 1, t: 'sf.profile', p: PROFILE_PUBKEY, n: 'alice', u: 1 }) : null,
    };
  }
}

class MockRegistrationAdapter implements SpeXFeedNameRegistrationAdapter {
  submittedRequest?: SpeXFeedNameRequest;
  statusResponses: SpeXFeedNameConfirmationResult[] = [];

  async submitRequest(request: SpeXFeedNameRequest) {
    this.submittedRequest = request;

    return {
      requestId: 'request-1',
      status: 'pending' as const,
      message: 'Submitted to helper service.',
    };
  }

  async getRequestStatus(requestId: string) {
    return this.statusResponses.shift() ?? { requestId, status: 'pending' as const };
  }
}

class FailingRegistrationAdapter implements SpeXFeedNameRegistrationAdapter {
  async submitRequest() {
    throw new Error('ROD RPC wallet `spexfeed` is not loaded.');
  }

  async getRequestStatus(requestId: string) {
    return { requestId, status: 'failed' as const, message: 'Failed.' };
  }
}

describe('SpeXFeed Name Sprint 4 registration', () => {
  it('builds a browser-safe registration request without wallet credentials', () => {
    const request = buildSpeXFeedNameRegistrationRequest('Alice', PROFILE_PUBKEY.toUpperCase(), 123);

    expect(request.action).toBe('register');
    expect(request.rodName).toBe('sf/alice');
    expect(request.nostrPubkey).toBe(PROFILE_PUBKEY);
    expect(request.record).toEqual({ v: 1, t: 'sf.profile', p: PROFILE_PUBKEY, n: 'alice', u: 123 });
    expect(request.value).toBe(JSON.stringify(request.record));
    expect(JSON.stringify(request)).not.toContain('private');
    expect(JSON.stringify(request)).not.toContain('rpc');
  });

  it('builds a minimal update request abstraction without edit UI assumptions', () => {
    const request = buildSpeXFeedNameUpdateRequest('sf/alice', PROFILE_PUBKEY, 456);

    expect(request.action).toBe('update');
    expect(request.rodName).toBe('sf/alice');
    expect(request.record.u).toBe(456);
  });

  it('rejects invalid handles and public keys before submitting', () => {
    expect(() => buildSpeXFeedNameRegistrationRequest('admin', PROFILE_PUBKEY)).toThrowError('Handle is reserved.');
    expect(() => buildSpeXFeedNameRegistrationRequest('alice', 'not-a-key')).toThrowError('Record public key must be a 64-character lowercase hex string.');
  });

  it('maps availability checks into Sprint 4 UI states', async () => {
    const service = new SpeXFeedNameRegistrationService(new SpeXFeedNameLookupService(new MockLookupAdapter(false) as never), new MockRegistrationAdapter() as never);

    const state = await service.checkName('alice');

    expect(state.status).toBe('available');
    expect(state.rodName).toBe('sf/alice');
  });

  it('submits an available name and tracks pending to verified confirmation', async () => {
    const registrationAdapter = new MockRegistrationAdapter();
    registrationAdapter.statusResponses = [
      { requestId: 'request-1', status: 'pending', message: 'Waiting for ROD confirmation.' },
      { requestId: 'request-1', status: 'verified', message: 'Confirmed.' },
    ];
    const service = new SpeXFeedNameRegistrationService(new SpeXFeedNameLookupService(new MockLookupAdapter(false) as never), registrationAdapter as never);

    const pendingState = await service.submitRegistration('alice', PROFILE_PUBKEY);
    const verifiedState = await service.trackConfirmation(pendingState.requestId!, 0, 3);

    expect(pendingState.status).toBe('pending');
    expect(registrationAdapter.submittedRequest?.rodName).toBe('sf/alice');
    expect(verifiedState.status).toBe('verified');
    expect(verifiedState.message).toBe('Confirmed.');
  });

  it('maps helper wallet failures into actionable setup guidance', async () => {
    const service = new SpeXFeedNameRegistrationService(new SpeXFeedNameLookupService(new MockLookupAdapter(false) as never), new FailingRegistrationAdapter() as never);

    const failedState = await service.submitRegistration('alice', PROFILE_PUBKEY);

    expect(failedState.status).toBe('failed');
    expect(failedState.message).toContain('createwallet spexfeed');
    expect(failedState.message).toContain('loadwallet spexfeed');
  });
});
