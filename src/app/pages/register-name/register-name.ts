import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApplicationState } from '../../services/applicationstate';
import { SpeXFeedNameRegistrationService, SpeXFeedNameRegistrationState } from '../../services/spexfeed-name-registration';
import { canonicalizeNostrPublicKey, validateNostrPublicKey } from '../../services/spexfeed-name';

@Component({
  selector: 'app-register-name',
  templateUrl: './register-name.html',
  styleUrls: ['./register-name.css'],
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
})
export class RegisterNameComponent {
  handleInput = '';
  nostrPubkey = '';
  acceptedPublicLinkWarning = false;
  acceptedNotSpexIdWarning = false;
  state: SpeXFeedNameRegistrationState = { status: 'idle', input: '', errors: [] };
  publicKeyErrors: string[] = [];

  constructor(
    public appState: ApplicationState,
    private registrationService: SpeXFeedNameRegistrationService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.appState.updateTitle('Register SpeXFeed Name'), 0);
    this.appState.showBackButton = false;
    this.appState.actions = [];
    this.nostrPubkey = this.appState.getPublicKey() ?? '';
    this.updatePublicKeyValidation();
  }

  get normalizedRodName(): string {
    const normalizedHandle = this.handleInput.trim().toLowerCase().replace(/^sf\//, '');
    return normalizedHandle ? `sf/${normalizedHandle}` : 'sf/<handle>';
  }

  get isProcessing(): boolean {
    return this.state.status === 'checking' || this.state.status === 'submitting' || this.state.status === 'pending';
  }

  get canSubmit(): boolean {
    return this.state.status === 'available' && this.acceptedPublicLinkWarning && this.acceptedNotSpexIdWarning && this.publicKeyErrors.length === 0;
  }

  async checkName(): Promise<void> {
    if (!this.validatePublicKeyAndSyncState()) {
      return;
    }

    this.state = await this.registrationService.checkName(this.handleInput);
  }

  async submitRegistration(): Promise<void> {
    if (!this.validatePublicKeyAndSyncState()) {
      return;
    }

    if (!this.canSubmit || !this.state.handle) {
      return;
    }

    this.state = await this.registrationService.submitRegistration(this.state.handle, this.nostrPubkey);

    if (this.state.status === 'pending' && this.state.requestId) {
      this.state = await this.registrationService.trackConfirmation(this.state.requestId);
    }
  }

  handlePublicKeyChange(): void {
    this.updatePublicKeyValidation();
  }

  private validatePublicKeyAndSyncState(): boolean {
    this.updatePublicKeyValidation();

    if (this.publicKeyErrors.length > 0) {
      this.state = {
        status: 'invalid',
        input: this.handleInput,
        errors: [],
      };
      return false;
    }

    this.nostrPubkey = canonicalizeNostrPublicKey(this.nostrPubkey);
    return true;
  }

  private updatePublicKeyValidation(): void {
    this.publicKeyErrors = validateNostrPublicKey(this.nostrPubkey);
  }
}
