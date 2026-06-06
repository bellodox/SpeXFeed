import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  normalizeSpeXFeedLookupName,
  parseSpeXFeedLookupRecord,
  SpeXFeedHttpNameLookupAdapter,
} from '../../services/spexfeed-name-lookup';

@Component({
  selector: 'app-name-resolver',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px;">
      <div *ngIf="loading" style="text-align: center;">
        <mat-spinner diameter="40"></mat-spinner>
        <p style="margin-top: 16px; color: #888;">Looking up {{ displayName }}...</p>
      </div>

      <div *ngIf="error" style="text-align: center; max-width: 420px;">
        <div style="font-size: 48px; line-height: 1; color: #f44336;">⚠</div>
        <h3>Name Not Found</h3>
        <p style="color: #888;">{{ errorMessage }}</p>
        <button type="button" (click)="goHome()">Go Home</button>
      </div>
    </div>
  `,
  styleUrl: './name-resolver.css',
})
export class NameResolverComponent {
  loading = true;
  error = false;
  errorMessage = '';
  displayName = '';

  private readonly lookupAdapter = new SpeXFeedHttpNameLookupAdapter();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    const handle = this.route.snapshot.paramMap.get('handle');

    if (!handle) {
      this.showError('No name specified.');
      return;
    }

    this.displayName = `sf/${handle}`;

    const normalizedName = normalizeSpeXFeedLookupName(handle);

    if (!normalizedName.valid || !normalizedName.rodName) {
      this.showError(normalizedName.errors[0] ?? 'Invalid SpeXFeed name.');
      return;
    }

    try {
      const lookupResult = await this.lookupAdapter.lookupName(normalizedName.rodName);

      if (!lookupResult.found) {
        this.showError(`The name "${handle}" is not registered.`);
        return;
      }

      const parsedRecord = parseSpeXFeedLookupRecord(lookupResult.value ?? '');

      if (parsedRecord.status !== 'registered' || !parsedRecord.record?.p) {
        this.showError(`The name "${handle}" exists but does not have a valid SpeXFeed profile linked.`);
        return;
      }

      await this.router.navigate(['/p', parsedRecord.record.p], { replaceUrl: true });
    } catch {
      this.showError('Failed to look up this name. Please try again later.');
    }
  }

  goHome() {
    void this.router.navigate(['/']);
  }

  private showError(message: string) {
    this.loading = false;
    this.error = true;
    this.errorMessage = message;
  }
}
