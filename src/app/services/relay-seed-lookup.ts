import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** Represents a single relay seed entry from the blockchain registry. */
export interface RelaySeedEntry {
  url: string;
  role: string;
  read: boolean;
  write: boolean;
  priority: number;
}

/** The validated relay seed record from the backend. */
export interface RelaySeedRecord {
  type: string;
  version: number;
  updatedAt: number;
  scope: string;
  relays: RelaySeedEntry[];
  sources: string[];
}

/** Response shape from the backend relay-seeds endpoint. */
export interface RelaySeedLookupResponse {
  status: 'found' | 'not-found' | 'invalid' | 'error';
  scope: string;
  record?: RelaySeedRecord;
  errors?: string[];
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RelaySeedLookupService {
  /** Base URL for the relay seeds API endpoint. */
  private readonly baseUrl = '/api/rod/relay-seeds';

  constructor(private http: HttpClient) {}

  /** Fetch relay seeds for a given scope (defaults to 'global'). */
  async fetchSeeds(scope: string = 'global'): Promise<RelaySeedLookupResponse> {
    try {
      const url = scope === 'global' ? this.baseUrl : `${this.baseUrl}/${scope}`;
      const response = await firstValueFrom(this.http.get<RelaySeedLookupResponse>(url));
      return response;
    } catch (err: any) {
      return {
        status: 'error',
        scope,
        message: err?.message || 'Failed to fetch relay seeds',
      };
    }
  }
}
