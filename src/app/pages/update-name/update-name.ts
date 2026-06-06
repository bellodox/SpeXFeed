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
import { getSpeXFeedNameClaim } from '../../services/spexfeed-name-verification';
import { SpeXFeedProfileRecordV1 } from '../../services/spexfeed-name';
import { SpeXFeedProfileUpdatePreview, SpeXFeedProfileUpdateSubmitResult, SpeXFeedNameProfileUpdateService, buildSpeXFeedProfileUpdatePreview } from '../../services/spexfeed-name-profile-update';
import { ProfileService } from '../../services/profile';

@Component({
  selector: 'app-update-name',
  templateUrl: './update-name.html',
  styleUrls: ['./update-name.css'],
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
})
export class UpdateNameComponent {
  handleInput = '';
  displayName = '';
  about = '';
  avatarUrl = '';
  relayText = '';
  nostrPubkey = '';
  acceptedRotationWarning = false;
  currentRecord?: SpeXFeedProfileRecordV1;
  preview: SpeXFeedProfileUpdatePreview = buildSpeXFeedProfileUpdatePreview({ handle: '', displayName: '', about: '', avatarUrl: '', relayText: '', nostrPubkey: '' });
  state: SpeXFeedProfileUpdateSubmitResult = { status: 'idle', input: '', errors: [] };

  constructor(
    public appState: ApplicationState,
    private readonly updateService: SpeXFeedNameProfileUpdateService,
    private readonly profileService: ProfileService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.appState.updateTitle('Update SpeXFeed Name'), 0);
    this.appState.showBackButton = false;
    this.appState.actions = [];
    this.nostrPubkey = this.appState.getPublicKey() ?? '';

    this.refreshPreview();
    this.loadClaimedRecord();
  }

  async loadClaimedRecord(): Promise<void> {
    const profile = await this.profileService.getProfile(this.nostrPubkey);
    const claimedName = profile ? getSpeXFeedNameClaim(profile) : undefined;

    if (!claimedName) {
      return;
    }

    this.handleInput = claimedName;
    this.refreshPreview();
    await this.loadRecord();
  }

  get canSubmit(): boolean {
    return Boolean(
      this.state.status === 'available' &&
        this.preview.request &&
        this.preview.validation.valid &&
        (!this.preview.rotatesLinkedKey || this.acceptedRotationWarning)
    );
  }

  async loadRecord(): Promise<void> {
    if (!this.handleInput.trim()) {
      this.currentRecord = undefined;
      this.state = {
        status: 'invalid',
        input: this.handleInput,
        errors: ['Name is required.'],
        message: 'Enter a SpeXFeed Name before loading a record.',
      };
      this.refreshPreview(false);
      return;
    }

    this.state = { status: 'checking', input: this.handleInput, errors: [] };
    const lookupResult = await this.updateService.loadCurrentRecord(this.handleInput);

    if (lookupResult.status !== 'registered' || !lookupResult.record) {
      this.currentRecord = undefined;
      this.state = {
        status: lookupResult.status === 'invalid_name' ? 'invalid' : 'failed',
        input: this.handleInput,
        handle: lookupResult.handle,
        rodName: lookupResult.rodName,
        errors: lookupResult.errors.length ? lookupResult.errors : ['SpeXFeed Name record was not found.'],
        message: 'Load an existing sf.profile record before updating.',
      };
      this.refreshPreview();
      return;
    }

    this.currentRecord = lookupResult.record;
    this.handleInput = lookupResult.handle ?? this.handleInput;
    this.displayName = lookupResult.record.d ?? '';
    this.about = lookupResult.record.a ?? '';
    this.avatarUrl = lookupResult.record.i ?? '';
    this.relayText = lookupResult.record.r?.join('\n') ?? '';
    const authenticatedPublicKey = this.appState.getPublicKey()?.trim().toLowerCase();
    const loadedRecordPublicKey = lookupResult.record.p;

    if (!authenticatedPublicKey) {
      this.nostrPubkey = loadedRecordPublicKey;
    } else {
      this.nostrPubkey = authenticatedPublicKey;
    }

    this.acceptedRotationWarning = false;
    const keyMismatch = Boolean(authenticatedPublicKey && authenticatedPublicKey !== loadedRecordPublicKey);
    this.state = {
      status: keyMismatch ? 'invalid' : 'available',
      input: this.handleInput,
      handle: lookupResult.handle,
      rodName: lookupResult.rodName,
      record: lookupResult.record,
      errors: keyMismatch ? ['The loaded SpeXFeed Name is linked to a different Nostr public key than the authenticated user. Update submission is blocked to prevent accidental key overwrite.'] : [],
      message: keyMismatch ? 'Loaded record key does not match the authenticated Nostr key.' : 'Current ROD profile record loaded.',
    };
    this.refreshPreview();
  }

  refreshPreview(includeHandleValidation = true): void {
    if (!includeHandleValidation && !this.handleInput.trim()) {
      this.preview = buildSpeXFeedProfileUpdatePreview({ handle: 'placeholder', displayName: this.displayName, about: this.about, avatarUrl: this.avatarUrl, relayText: this.relayText, nostrPubkey: this.nostrPubkey }, this.currentRecord);
      this.preview = {
        ...this.preview,
        request: undefined,
        validation: { valid: false, errors: [] },
        rotatesLinkedKey: false,
      };

      if (!this.preview.rotatesLinkedKey) {
        this.acceptedRotationWarning = false;
      }

      return;
    }

    this.preview = buildSpeXFeedProfileUpdatePreview(
      {
        handle: this.handleInput,
        displayName: this.displayName,
        about: this.about,
        avatarUrl: this.avatarUrl,
        relayText: this.relayText,
        nostrPubkey: this.nostrPubkey,
      },
      this.currentRecord
    );

    if (!this.preview.rotatesLinkedKey) {
      this.acceptedRotationWarning = false;
    }
  }

  async submitUpdate(): Promise<void> {
    this.refreshPreview();

    if (!this.canSubmit || !this.preview.request) {
      return;
    }

    this.state = { status: 'submitting', input: this.preview.request.handle, handle: this.preview.request.handle, rodName: this.preview.request.rodName, record: this.preview.request.record, errors: [] };
    this.state = await this.updateService.submitUpdate(this.preview.request);

    if (this.state.status === 'pending' && this.state.requestId) {
      this.state = await this.updateService.trackUpdateConfirmation(this.state);
    }

    if (this.state.detectedRecord) {
      this.currentRecord = this.state.detectedRecord;
      this.refreshPreview();
    }
  }
}
