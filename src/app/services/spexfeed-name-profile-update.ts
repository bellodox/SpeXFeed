import { Inject, inject, Injectable } from '@angular/core';
import { SpeXFeedNameLookupResult, SpeXFeedNameLookupService } from './spexfeed-name-lookup';
import { SpeXFeedNameRegistrationAdapter, SpeXFeedNameRegistrationState, SpeXFeedNameUpdateRequest, SPEXFEED_NAME_REGISTRATION_ADAPTER, buildSpeXFeedNameUpdateRequest } from './spexfeed-name-registration';
import { SpeXFeedNameValidationResult, SpeXFeedProfileRecordV1, validateSpeXFeedProfileRecord } from './spexfeed-name';

export interface SpeXFeedProfileUpdateFormValue {
  handle: string;
  displayName: string;
  about: string;
  avatarUrl: string;
  relayText: string;
  nostrPubkey: string;
}

export interface SpeXFeedProfileUpdatePreview {
  request?: SpeXFeedNameUpdateRequest;
  validation: SpeXFeedNameValidationResult;
  relays: string[];
  rotatesLinkedKey: boolean;
}

export interface SpeXFeedProfileUpdateSubmitResult extends SpeXFeedNameRegistrationState {
  detectedRecord?: SpeXFeedProfileRecordV1;
}

const DEFAULT_CONFIRMATION_INTERVAL_MS = 5000;
const DEFAULT_CONFIRMATION_ATTEMPTS = 24;

/** Builds Sprint 5 profile update preview state from editable form fields. */
export function buildSpeXFeedProfileUpdatePreview(formValue: SpeXFeedProfileUpdateFormValue, currentRecord?: SpeXFeedProfileRecordV1, updatedAt = Math.floor(Date.now() / 1000)): SpeXFeedProfileUpdatePreview {
  const relays = parseRelayLines(formValue.relayText);

  try {
    const request = buildSpeXFeedNameUpdateRequest(formValue.handle, formValue.nostrPubkey, updatedAt, {
      displayName: formValue.displayName,
      about: formValue.about,
      avatarUrl: formValue.avatarUrl,
      relays,
    });

    return {
      request,
      validation: validateSpeXFeedProfileRecord(request.record),
      relays,
      rotatesLinkedKey: Boolean(currentRecord && currentRecord.p !== request.record.p),
    };
  } catch (error) {
    return {
      validation: { valid: false, errors: [error instanceof Error ? error.message : 'Profile update preview failed.'] },
      relays,
      rotatesLinkedKey: false,
    };
  }
}

/** Coordinates Sprint 5 profile update submission, confirmation tracking, and post-confirmation detection. */
@Injectable({
  providedIn: 'root',
})
export class SpeXFeedNameProfileUpdateService {
  constructor(
    private readonly lookupService: SpeXFeedNameLookupService = inject(SpeXFeedNameLookupService),
    @Inject(SPEXFEED_NAME_REGISTRATION_ADAPTER) private readonly adapter: SpeXFeedNameRegistrationAdapter = inject(SPEXFEED_NAME_REGISTRATION_ADAPTER)
  ) {}

  async loadCurrentRecord(handle: string): Promise<SpeXFeedNameLookupResult> {
    return this.lookupService.resolveProfile(handle);
  }

  async submitUpdate(request: SpeXFeedNameUpdateRequest): Promise<SpeXFeedNameRegistrationState> {
    try {
      const submitResult = await this.adapter.submitRequest(request);

      return {
        status: submitResult.status === 'verified' ? 'verified' : submitResult.status === 'failed' ? 'failed' : 'pending',
        input: request.handle,
        handle: request.handle,
        rodName: request.rodName,
        record: request.record,
        requestId: submitResult.requestId,
        message: submitResult.message,
        errors: submitResult.status === 'failed' ? [submitResult.message ?? 'Profile update failed.'] : [],
      };
    } catch (error) {
      return createFailedState(request.handle, error);
    }
  }

  async trackUpdateConfirmation(state: SpeXFeedNameRegistrationState, intervalMs = DEFAULT_CONFIRMATION_INTERVAL_MS, maxAttempts = DEFAULT_CONFIRMATION_ATTEMPTS): Promise<SpeXFeedProfileUpdateSubmitResult> {
    if (!state.requestId) {
      return createFailedState(state.input, new Error('Request id is required.'));
    }

    let currentState = state;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const confirmationResult = await this.adapter.getRequestStatus(state.requestId);
        currentState = {
          ...currentState,
          status: confirmationResult.status,
          requestId: confirmationResult.requestId,
          message: confirmationResult.message,
          errors: confirmationResult.status === 'failed' ? [confirmationResult.message ?? 'Profile update failed.'] : [],
        };

        if (confirmationResult.status === 'verified') {
          return this.detectUpdatedRecord(currentState);
        }

        if (confirmationResult.status === 'failed') {
          return currentState;
        }
      } catch (error) {
        return createFailedState(state.input, error);
      }

      if (attempt < maxAttempts - 1) {
        await wait(intervalMs);
      }
    }

    return {
      ...currentState,
      status: 'pending',
      message: 'Profile update is still pending confirmation.',
      errors: [],
    };
  }

  async detectUpdatedRecord(state: SpeXFeedNameRegistrationState): Promise<SpeXFeedProfileUpdateSubmitResult> {
    if (!state.handle || !state.record) {
      return state;
    }

    const lookupResult = await this.lookupService.resolveProfile(state.handle);
    const detectedRecord = lookupResult.record;
    const detectedUpdate = Boolean(detectedRecord && detectedRecord.u >= state.record.u && detectedRecord.p === state.record.p);

    return {
      ...state,
      status: detectedUpdate ? 'verified' : 'pending',
      detectedRecord,
      message: detectedUpdate ? 'Profile update confirmed and detected in the ROD record.' : 'Profile update confirmed, waiting for the updated ROD record to resolve.',
    };
  }
}

function parseRelayLines(relayText: string): string[] {
  return relayText
    .split(/[\n,]/)
    .map((relayUrl) => relayUrl.trim())
    .filter(Boolean);
}

function createFailedState(input: string, error: unknown): SpeXFeedNameRegistrationState {
  return {
    status: 'failed',
    input,
    errors: [error instanceof Error ? error.message : 'Profile update failed.'],
  };
}

function wait(intervalMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, intervalMs));
}
