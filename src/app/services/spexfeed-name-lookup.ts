import { Inject, inject, Injectable, InjectionToken } from '@angular/core';
import {
  SPEXFEED_NAME_NAMESPACE,
  SPEXFEED_NAME_RECORD_TYPE,
  SpeXFeedProfileRecordV1,
  validateSpeXFeedHandle,
  validateSpeXFeedProfileRecord,
} from './spexfeed-name';
import { readErrorResponseMessage, readJsonResponse } from './spexfeed-name-http-utils';

export type SpeXFeedNameLookupStatus =
  | 'available'
  | 'registered'
  | 'invalid_name'
  | 'invalid_record'
  | 'wrong_type'
  | 'lookup_failure';

export interface SpeXFeedNameLookupResponse {
  found: boolean;
  name?: string;
  value?: string | null;
}

export interface SpeXFeedNameLookupAdapter {
  lookupName(rodName: string): Promise<SpeXFeedNameLookupResponse>;
}

export interface SpeXFeedNameLookupResult {
  status: SpeXFeedNameLookupStatus;
  input: string;
  handle?: string;
  rodName?: string;
  available: boolean;
  found: boolean;
  valid: boolean;
  pubkey?: string;
  record?: SpeXFeedProfileRecordV1;
  errors: string[];
}

export const SPEXFEED_NAME_LOOKUP_ADAPTER = new InjectionToken<SpeXFeedNameLookupAdapter>(
  'SPEXFEED_NAME_LOOKUP_ADAPTER',
  {
    factory: () => new SpeXFeedHttpNameLookupAdapter(),
  }
);

/** Normalizes a raw user-provided name into the canonical sf/<handle> lookup target. */
export function normalizeSpeXFeedLookupName(input: string): { valid: boolean; handle?: string; rodName?: string; errors: string[] } {
  if (typeof input !== 'string') {
    return { valid: false, errors: ['Name must be a string.'] };
  }

  const trimmedInput = input.trim().toLowerCase();

  if (trimmedInput.length === 0) {
    return { valid: false, errors: ['Name is required.'] };
  }

  const slashIndex = trimmedInput.indexOf('/');
  const prefixedHandleResult = slashIndex >= 0 ? normalizePrefixedHandle(trimmedInput) : null;

  if (prefixedHandleResult && !prefixedHandleResult.valid) {
    return prefixedHandleResult;
  }

  const handle = prefixedHandleResult?.handle ?? trimmedInput;

  if (!handle) {
    return {
      valid: false,
      errors: ['Name must be a handle or an sf/<handle> name.'],
    };
  }

  const handleErrors = validateSpeXFeedHandle(handle);

  if (handleErrors.length > 0) {
    return {
      valid: false,
      errors: handleErrors,
    };
  }

  return {
    valid: true,
    handle,
    rodName: `${SPEXFEED_NAME_NAMESPACE}/${handle}`,
    errors: [],
  };
}

/** Parses a raw ROD name value into a typed Sprint 1 sf.profile record classification. */
export function parseSpeXFeedLookupRecord(value: string): SpeXFeedNameLookupResult {
  if (typeof value !== 'string') {
    return createInvalidRecordResult('invalid_record', ['Record value must be a JSON string.']);
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(value);
  } catch {
    return createInvalidRecordResult('invalid_record', ['Malformed JSON.']);
  }

  if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
    return createInvalidRecordResult('invalid_record', ['Record must be a JSON object.']);
  }

  const candidateRecord = parsedValue as Partial<SpeXFeedProfileRecordV1> & Record<string, unknown>;

  if (candidateRecord.t !== SPEXFEED_NAME_RECORD_TYPE) {
    return createInvalidRecordResult('wrong_type', ['Record type must be sf.profile.']);
  }

  const validationResult = validateSpeXFeedProfileRecord(candidateRecord);

  if (!validationResult.valid || !validationResult.record) {
    return {
      status: 'invalid_record',
      input: value,
      available: false,
      found: true,
      valid: false,
      errors: validationResult.errors,
    };
  }

  return {
    status: 'registered',
    input: value,
    handle: validationResult.record.n,
    rodName: validationResult.rodName,
    available: false,
    found: true,
    valid: true,
    pubkey: validationResult.record.p,
    record: validationResult.record,
    errors: [],
  };
}

/** Default browser-safe adapter that targets a backend HTTP endpoint without embedding wallet credentials. */
@Injectable({
  providedIn: 'root',
})
export class SpeXFeedHttpNameLookupAdapter implements SpeXFeedNameLookupAdapter {
  endpoint = '/api/rod/name';

  async lookupName(rodName: string): Promise<SpeXFeedNameLookupResponse> {
    const [namespace, handle] = rodName.split('/');

    if (!namespace || !handle) {
      throw new Error('Name lookup requires canonical sf/<handle> format.');
    }

    const response = await fetch(`${this.endpoint}/${encodeURIComponent(namespace)}/${encodeURIComponent(handle)}`);

    if (response.status === 404) {
      return {
        found: false,
        name: rodName,
        value: null,
      };
    }

    if (!response.ok) {
      const errorMessage = await readErrorResponseMessage(response, `Lookup failed with HTTP ${response.status}.`);
      throw new Error(errorMessage);
    }

    return await readJsonResponse<SpeXFeedNameLookupResponse>(response, 'Name lookup');
  }
}

/** Provides Sprint 2 ROD-name lookup, availability, record parsing, and profile resolution. */
@Injectable({
  providedIn: 'root',
})
export class SpeXFeedNameLookupService {
  private readonly adapter: SpeXFeedNameLookupAdapter;

  constructor(@Inject(SPEXFEED_NAME_LOOKUP_ADAPTER) adapter: SpeXFeedNameLookupAdapter) {
    this.adapter = adapter;
  }

  async checkAvailability(input: string): Promise<SpeXFeedNameLookupResult> {
    const lookupResult = await this.lookup(input);

    if (lookupResult.status === 'registered' || lookupResult.status === 'invalid_record' || lookupResult.status === 'wrong_type') {
      return {
        ...lookupResult,
        available: false,
      };
    }

    return lookupResult;
  }

  async resolveProfile(input: string): Promise<SpeXFeedNameLookupResult> {
    return this.lookup(input);
  }

  private async lookup(input: string): Promise<SpeXFeedNameLookupResult> {
    const normalizedInput = normalizeSpeXFeedLookupName(input);

    if (!normalizedInput.valid || !normalizedInput.handle || !normalizedInput.rodName) {
      return {
        status: 'invalid_name',
        input,
        available: false,
        found: false,
        valid: false,
        errors: normalizedInput.errors,
      };
    }

    try {
      const lookupResponse = await this.adapter.lookupName(normalizedInput.rodName);

      if (!lookupResponse.found) {
        return {
          status: 'available',
          input,
          handle: normalizedInput.handle,
          rodName: normalizedInput.rodName,
          available: true,
          found: false,
          valid: true,
          errors: [],
        };
      }

      const parsedRecord = parseSpeXFeedLookupRecord(lookupResponse.value ?? '');

      return {
        ...parsedRecord,
        input,
        handle: normalizedInput.handle,
        rodName: normalizedInput.rodName,
      };
    } catch (error) {
      return {
        status: 'lookup_failure',
        input,
        handle: normalizedInput.handle,
        rodName: normalizedInput.rodName,
        available: false,
        found: false,
        valid: false,
        errors: [error instanceof Error ? error.message : 'Lookup failed.'],
      };
    }
  }
}

function normalizePrefixedHandle(input: string): { valid: boolean; handle?: string; errors: string[] } {
  const segments = input.split('/');

  if (segments.length !== 2 || segments[0] !== SPEXFEED_NAME_NAMESPACE || !segments[1]) {
    return {
      valid: false,
      errors: ['Name must be a handle or an sf/<handle> name.'],
    };
  }

  return {
    valid: true,
    handle: segments[1],
    errors: [],
  };
}

function createInvalidRecordResult(status: 'invalid_record' | 'wrong_type', errors: string[]): SpeXFeedNameLookupResult {
  return {
    status,
    input: '',
    available: false,
    found: true,
    valid: false,
    errors,
  };
}
