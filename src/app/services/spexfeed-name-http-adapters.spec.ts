import { SpeXFeedHttpNameLookupAdapter } from './spexfeed-name-lookup';
import { SpeXFeedHttpNameRegistrationAdapter } from './spexfeed-name-registration';

describe('SpeXFeed name HTTP adapters', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns a not-found lookup shape when the backend responds with HTTP 404', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      new Response(null, {
        status: 404,
      })
    );

    const adapter = new SpeXFeedHttpNameLookupAdapter();

    await expectAsync(adapter.lookupName('sf/alice')).toBeResolvedTo({
      found: false,
      name: 'sf/alice',
      value: null,
    });
  });

  it('throws when lookup receives a non-OK non-404 HTTP response', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      new Response('server error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    const adapter = new SpeXFeedHttpNameLookupAdapter();

    await expectAsync(adapter.lookupName('sf/alice')).toBeRejectedWithError('Lookup failed with HTTP 500.');
  });

  it('reports a backend configuration error when lookup receives HTML instead of JSON', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      new Response('<!DOCTYPE html><html><body>fallback</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    const adapter = new SpeXFeedHttpNameLookupAdapter();

    await expectAsync(adapter.lookupName('sf/alice')).toBeRejectedWithError(
      'Name lookup backend/API configuration error: expected JSON but received HTML (HTTP 200). Check the configured ROD helper endpoint.'
    );
  });

  it('reports a backend configuration error when registration submit receives HTML instead of JSON', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      new Response('<!DOCTYPE html><html><body>fallback</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    const adapter = new SpeXFeedHttpNameRegistrationAdapter();

    await expectAsync(
      adapter.submitRequest({
        action: 'register',
        handle: 'alice',
        rodName: 'sf/alice',
        nostrPubkey: '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2',
        value: '{"v":1}',
        record: {
          v: 1,
          t: 'sf.profile',
          p: '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2',
          n: 'alice',
          u: 1,
        },
      })
    ).toBeRejectedWithError(
      'Registration request backend/API configuration error: expected JSON but received HTML (HTTP 200). Check the configured ROD helper endpoint.'
    );
  });

  it('reports a backend configuration error when confirmation status receives invalid JSON', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
      new Response('not json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const adapter = new SpeXFeedHttpNameRegistrationAdapter();

    await expectAsync(adapter.getRequestStatus('req-1')).toBeRejectedWithError(
      'Confirmation status backend/API configuration error: expected JSON but received application/json (HTTP 200). Check the configured ROD helper endpoint.'
    );
  });
});
