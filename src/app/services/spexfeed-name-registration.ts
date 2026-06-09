import { Inject, inject, Injectable, InjectionToken } from '@angular/core';
import { canonicalizeNostrPublicKey, SpeXFeedProfileRecordV1, validateSpeXFeedProfileRecord } from './spexfeed-name';
import { normalizeSpeXFeedLookupName, SpeXFeedNameLookupResult, SpeXFeedNameLookupService } from './spexfeed-name-lookup';
import { readErrorResponseMessage, readJsonResponse } from './spexfeed-name-http-utils';

export type SpeXFeedNameRegistrationStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'invalid'
  | 'submitting'
  | 'pending'
  | 'verified'
  | 'failed';

export interface SpeXFeedNameRegistrationState {
  status: SpeXFeedNameRegistrationStatus;
  input: string;
  errors: string[];
  handle?: string;
  rodName?: string;
  record?: SpeXFeedProfileRecordV1;
  requestId?: string;
  message?: string;
}

export interface SpeXFeedNameRegistrationRequest {
  action: 'register';
  rodName: string;
  handle: string;
  value: string;
  record: SpeXFeedProfileRecordV1;
  nostrPubkey: string;
}

export interface SpeXFeedProfileRecordInput {
  displayName?: string;
  about?: string;
  avatarUrl?: string;
  relays?: string[];
}

export interface SpeXFeedNameUpdateRequest {
  action: 'update';
  rodName: string;
  handle: string;
  value: string;
  record: SpeXFeedProfileRecordV1;
  nostrPubkey: string;
}

export type SpeXFeedNameRequest = SpeXFeedNameRegistrationRequest | SpeXFeedNameUpdateRequest;

export interface SpeXFeedNameRegistrationSubmitResult {
  requestId: string;
  status: 'pending' | 'verified' | 'failed';
  message?: string;
}

export interface SpeXFeedNameConfirmationResult {
  requestId: string;
  status: 'pending' | 'verified' | 'failed';
  message?: string;
}

export interface SpeXFeedNameRegistrationAdapter {
  submitRequest(request: SpeXFeedNameRequest): Promise<SpeXFeedNameRegistrationSubmitResult>;
  getRequestStatus(requestId: string): Promise<SpeXFeedNameConfirmationResult>;
}

export const SPEXFEED_NAME_REGISTRATION_ADAPTER = new InjectionToken<SpeXFeedNameRegistrationAdapter>(
  'SPEXFEED_NAME_REGISTRATION_ADAPTER',
  {
    factory: () => new SpeXFeedHttpNameRegistrationAdapter(),
  }
);

const DEFAULT_CONFIRMATION_INTERVAL_MS = 5000;
const DEFAULT_CONFIRMATION_ATTEMPTS = 24;
const HELPER_SETUP_GUIDANCE = 'Start the local ROD RPC node on localhost:11999, then create or load the `spexfeed` wallet with `createwallet spexfeed` and `loadwallet spexfeed`.';

/** Builds a canonical sf.profile record for backend-assisted ROD name requests. */
export function buildSpeXFeedProfileRecord(handle: string, nostrPubkey: string, updatedAt = Math.floor(Date.now() / 1000), input: SpeXFeedProfileRecordInput = {}): SpeXFeedProfileRecordV1 {
  const record: SpeXFeedProfileRecordV1 = {
    v: 1,
    t: 'sf.profile',
    p: canonicalizeNostrPublicKey(nostrPubkey),
    n: handle.trim().toLowerCase(),
    u: updatedAt,
  };

  const displayName = input.displayName?.trim();
  const about = input.about?.trim();
  const avatarUrl = input.avatarUrl?.trim();
  const relays = input.relays?.map((relayUrl) => relayUrl.trim()).filter(Boolean);

  if (displayName) {
    record.d = displayName;
  }

  if (about) {
    record.a = about;
  }

  if (avatarUrl) {
    record.i = avatarUrl;
  }

  if (relays?.length) {
    record.r = relays;
  }

  return record;
}

/** Builds a browser-safe backend/helper request for registering an available SpeXFeed Name. */
export function buildSpeXFeedNameRegistrationRequest(handle: string, nostrPubkey: string, updatedAt?: number, input: SpeXFeedProfileRecordInput = {}): SpeXFeedNameRegistrationRequest {
  const normalizedHandle = normalizeSpeXFeedLookupName(handle);

  if (!normalizedHandle.valid || !normalizedHandle.handle || !normalizedHandle.rodName) {
    throw new Error(normalizedHandle.errors.join(' '));
  }

  return buildSpeXFeedNameRequest('register', normalizedHandle.handle, normalizedHandle.rodName, nostrPubkey, updatedAt, input);
}

/** Builds a browser-safe backend/helper request for updating an existing SpeXFeed Name record. */
export function buildSpeXFeedNameUpdateRequest(handle: string, nostrPubkey: string, updatedAt?: number, input: SpeXFeedProfileRecordInput = {}): SpeXFeedNameUpdateRequest {
  const normalizedHandle = normalizeSpeXFeedLookupName(handle);

  if (!normalizedHandle.valid || !normalizedHandle.handle || !normalizedHandle.rodName) {
    throw new Error(normalizedHandle.errors.join(' '));
  }

  return buildSpeXFeedNameRequest('update', normalizedHandle.handle, normalizedHandle.rodName, nostrPubkey, updatedAt, input);
}

/** Default adapter for backend/helper-service registration without browser wallet custody. */
@Injectable({
  providedIn: 'root',
})
export class SpeXFeedHttpNameRegistrationAdapter implements SpeXFeedNameRegistrationAdapter {
  endpoint = '/api/rod/spexfeed-name/requests';

  async submitRequest(request: SpeXFeedNameRequest): Promise<SpeXFeedNameRegistrationSubmitResult> {
    // TODO: Require a backend contract that verifies Nostr key ownership (for example via NIP-07/NIP-98 or equivalent) before production helper processing is trusted.
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorMessage = await readErrorResponseMessage(response, `Registration request failed with HTTP ${response.status}.`);
      throw new Error(errorMessage);
    }

    return await readJsonResponse<SpeXFeedNameRegistrationSubmitResult>(response, 'Registration request');
  }

  async getRequestStatus(requestId: string): Promise<SpeXFeedNameConfirmationResult> {
    const response = await fetch(`${this.endpoint}/${encodeURIComponent(requestId)}`);

    if (!response.ok) {
      const errorMessage = await readErrorResponseMessage(response, `Confirmation status failed with HTTP ${response.status}.`);
      throw new Error(errorMessage);
    }

    return await readJsonResponse<SpeXFeedNameConfirmationResult>(response, 'Confirmation status');
  }
}

/** Coordinates Sprint 4 availability, backend-assisted registration, and confirmation state. */
@Injectable({
  providedIn: 'root',
})
export class SpeXFeedNameRegistrationService {
  state: SpeXFeedNameRegistrationState = { status: 'idle', input: '', errors: [] };

  private readonly lookupService: SpeXFeedNameLookupService;
  private readonly adapter: SpeXFeedNameRegistrationAdapter;

  constructor(
    lookupService: SpeXFeedNameLookupService = inject(SpeXFeedNameLookupService),
    @Inject(SPEXFEED_NAME_REGISTRATION_ADAPTER) adapter: SpeXFeedNameRegistrationAdapter
  ) {
    this.lookupService = lookupService;
    this.adapter = adapter;
  }

  async checkName(input: string): Promise<SpeXFeedNameRegistrationState> {
    this.state = { status: 'checking', input, errors: [] };
    const lookupResult = await this.lookupService.checkAvailability(input);
    this.state = mapLookupResultToRegistrationState(input, lookupResult);
    return this.state;
  }

  async submitRegistration(handle: string, nostrPubkey: string): Promise<SpeXFeedNameRegistrationState> {
    try {
      const request = buildSpeXFeedNameRegistrationRequest(handle, nostrPubkey);
      this.state = {
        status: 'submitting',
        input: handle,
        handle: request.handle,
        rodName: request.rodName,
        record: request.record,
        errors: [],
      };

      const submitResult = await this.adapter.submitRequest(request);
      this.state = {
        ...this.state,
        status: submitResult.status === 'verified' ? 'verified' : submitResult.status === 'failed' ? 'failed' : 'pending',
        requestId: submitResult.requestId,
        message: submitResult.message,
      };

      return this.state;
    } catch (error) {
      this.state = createFailedState(handle, error);
      return this.state;
    }
  }

  async trackConfirmation(requestId: string, intervalMs = DEFAULT_CONFIRMATION_INTERVAL_MS, maxAttempts = DEFAULT_CONFIRMATION_ATTEMPTS): Promise<SpeXFeedNameRegistrationState> {
    if (!requestId) {
      this.state = createFailedState(this.state.input, new Error('Request id is required.'));
      return this.state;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const confirmationResult = await this.adapter.getRequestStatus(requestId);

        this.state = {
          ...this.state,
          status: confirmationResult.status,
          requestId: confirmationResult.requestId,
          message: confirmationResult.message,
          errors: confirmationResult.status === 'failed' ? [confirmationResult.message ?? 'Registration failed.'] : [],
        };

        if (confirmationResult.status === 'verified' || confirmationResult.status === 'failed') {
          return this.state;
        }
      } catch (error) {
        this.state = createFailedState(this.state.input, error);
        return this.state;
      }

      if (attempt < maxAttempts - 1) {
        await wait(intervalMs);
      }
    }

    this.state = {
      ...this.state,
      status: 'pending',
      requestId,
      message: 'Registration is still pending confirmation.',
      errors: [],
    };

    return this.state;
  }
}

function buildSpeXFeedNameRequest(action: 'register', handle: string, rodName: string, nostrPubkey: string, updatedAt?: number, input?: SpeXFeedProfileRecordInput): SpeXFeedNameRegistrationRequest;
function buildSpeXFeedNameRequest(action: 'update', handle: string, rodName: string, nostrPubkey: string, updatedAt?: number, input?: SpeXFeedProfileRecordInput): SpeXFeedNameUpdateRequest;
function buildSpeXFeedNameRequest(action: SpeXFeedNameRequest['action'], handle: string, rodName: string, nostrPubkey: string, updatedAt?: number, input: SpeXFeedProfileRecordInput = {}): SpeXFeedNameRequest {
  const record = buildSpeXFeedProfileRecord(handle, nostrPubkey, updatedAt, input);
  const validationResult = validateSpeXFeedProfileRecord(record);

  if (!validationResult.valid || !validationResult.json) {
    throw new Error(validationResult.errors.join(' '));
  }

  return { action, rodName, handle, value: validationResult.json, record, nostrPubkey: record.p } as SpeXFeedNameRequest;
}

function mapLookupResultToRegistrationState(input: string, lookupResult: SpeXFeedNameLookupResult): SpeXFeedNameRegistrationState {
  if (lookupResult.status === 'available') {
    return {
      status: 'available',
      input,
      handle: lookupResult.handle,
      rodName: lookupResult.rodName,
      errors: [],
      message: `${lookupResult.rodName} is available.`,
    };
  }

  if (lookupResult.status === 'registered' || lookupResult.status === 'invalid_record' || lookupResult.status === 'wrong_type') {
    return {
      status: 'unavailable',
      input,
      handle: lookupResult.handle,
      rodName: lookupResult.rodName,
      errors: lookupResult.errors,
      message: `${lookupResult.rodName ?? input} is already registered.`,
    };
  }

  const mappedErrors = lookupResult.errors.map((errorMessage) => mapHelperFlowErrorMessage(errorMessage));

  return {
    status: lookupResult.status === 'invalid_name' ? 'invalid' : 'failed',
    input,
    handle: lookupResult.handle,
    rodName: lookupResult.rodName,
    errors: mappedErrors,
    message: mappedErrors[0],
  };
}

function createFailedState(input: string, error: unknown): SpeXFeedNameRegistrationState {
  const errorMessage = mapHelperFlowErrorMessage(error instanceof Error ? error.message : 'Registration request failed.');

  return {
    status: 'failed',
    input,
    errors: [errorMessage],
    message: errorMessage,
  };
}

function mapHelperFlowErrorMessage(errorMessage: string): string {
  const normalizedErrorMessage = errorMessage.trim();

  if (!normalizedErrorMessage) {
    return `Registration request failed. ${HELPER_SETUP_GUIDANCE}`;
  }

  const lowerCaseErrorMessage = normalizedErrorMessage.toLowerCase();
  const helperUnavailable =
    lowerCaseErrorMessage.includes('wallet') ||
    lowerCaseErrorMessage.includes('rpc') ||
    lowerCaseErrorMessage.includes('failed to fetch') ||
    lowerCaseErrorMessage.includes('backend/api configuration error') ||
    lowerCaseErrorMessage.includes('networkerror') ||
    lowerCaseErrorMessage.includes('connection refused');

  if (!helperUnavailable || lowerCaseErrorMessage.includes('createwallet spexfeed')) {
    return normalizedErrorMessage;
  }

  return `${normalizedErrorMessage} ${HELPER_SETUP_GUIDANCE}`;
}

function wait(intervalMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, intervalMs));
}
