import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface RecentRodNameItem {
  name: string;
  handle: string;
  height: number;
  txid: string;
  pubkey: string;
  displayName: string;
  valid: boolean;
}

export interface RecentRodNamesResponse {
  items: RecentRodNameItem[];
  total: number;
  error?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RecentRodNamesService {
  private readonly endpoint = '/api/rod/names/recent?limit=25';

  constructor(private readonly http: HttpClient) {}

  getRecentNames(): Observable<RecentRodNamesResponse> {
    return this.http.get<RecentRodNamesResponse>(this.endpoint).pipe(
      catchError((error) => {
        console.error('Failed to load recent ROD names.', error);

        return of({
          items: [],
          total: 0,
          error: true,
        });
      })
    );
  }
}
