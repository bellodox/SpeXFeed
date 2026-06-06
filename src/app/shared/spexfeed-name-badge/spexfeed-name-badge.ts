import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SpeXFeedNameVerificationResult, SpeXFeedNameVerificationStatus } from '../../services/spexfeed-name-verification';

@Component({
  selector: 'app-spexfeed-name-badge',
  templateUrl: './spexfeed-name-badge.html',
  styleUrls: ['./spexfeed-name-badge.css'],
  imports: [CommonModule, MatIconModule],
})
export class SpeXFeedNameBadgeComponent {
  @Input() verification?: SpeXFeedNameVerificationResult;
  @Input() compact = false;

  get visible() {
    return !!this.verification && this.verification.status !== 'no_claim';
  }

  get status(): SpeXFeedNameVerificationStatus {
    return this.verification?.status ?? 'no_claim';
  }

  get icon() {
    if (this.status === 'verified') {
      return 'verified';
    }

    if (this.status === 'mismatch') {
      return 'warning';
    }

    return 'info';
  }

  get label() {
    if (this.status === 'verified') {
      return this.verification?.verifiedName ?? this.verification?.claimedName ?? '';
    }

    return this.verification?.claimedName ?? '';
  }
}
