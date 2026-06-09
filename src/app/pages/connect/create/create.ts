import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { finalizeEvent, Relay, Event, utils, getPublicKey, nip19, kinds, getEventHash, validateEvent } from 'nostr-tools';
import { privateKeyFromSeedWords, generateSeedWords } from 'nostr-tools/nip06';
import { Utilities } from 'src/app/services/utilities';
import { DataService } from 'src/app/services/data';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateService } from '@ngx-translate/core'; //Added this for the transalation i18n
import { ProfileService } from 'src/app/services/profile';
import { AuthenticationService } from 'src/app/services/authentication';
import { ThemeService } from 'src/app/services/theme';
import { SecurityService } from 'src/app/services/security';
import { migratedSetItem } from 'src/app/services/storage-migration';
import { SpeXFeedNameRegistrationService, SpeXFeedNameRegistrationState } from 'src/app/services/spexfeed-name-registration';

@Component({
  selector: 'app-create',
  templateUrl: './create.html',
  styleUrls: ['../connect.css', './create.css'],
  imports: [MatIconModule, 
    ClipboardModule,
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterModule,
    MatCardModule, FormsModule, MatInputModule, TranslateModule]
})
export class CreateProfileComponent {
  privateKey: string = '';
  privateKeyHex: string = '';
  publicKey: string = '';
  publicKeyHex: string = '';
  password: string = '';
  error: string = '';
  profile: any = {};
  step = 1;
  mnemonic = '';
  acceptedPublicLinkWarning = false;
  acceptedNotSpexIdWarning = false;
  spexfeedNameState: SpeXFeedNameRegistrationState = { status: 'idle', input: '', errors: [] };

  constructor(
    private translate: TranslateService, // Add TranslateService
    private utilities: Utilities,
    private dataService: DataService,
    private profileService: ProfileService,
    private authService: AuthenticationService,
    private spexfeedNameRegistration: SpeXFeedNameRegistrationService,
    public theme: ThemeService,
    private router: Router,
    private security: SecurityService
  ) {
    this.translate.use('en'); // This ensures translations are loaded
  }

  ngOnInit() {
    // this.mnemonic = bip39.generateMnemonic(wordlist);
    this.mnemonic = generateSeedWords();

    const privateKey = privateKeyFromSeedWords(this.mnemonic);
    const secretKeyHex = bytesToHex(privateKey);
    this.privateKeyHex = secretKeyHex;
    this.privateKey = nip19.nsecEncode(hexToBytes(this.privateKeyHex));

    this.updatePublicKey();
    // const masterSeed = bip39.mnemonicToSeedSync(this.mnemonic);
  }

  async connect() {
    const userInfo = await this.authService.login();

    if (userInfo.authenticated()) {
      this.router.navigateByUrl('/');
    }
  }

  async anonymous(readOnlyKey?: string) {
    const userInfo = await this.authService.anonymous(readOnlyKey);

    if (userInfo.authenticated()) {
      this.router.navigateByUrl('/');
    }
  }

  async persistKey() {
    setTimeout(async () => {
      if (!this.privateKeyHex) {
        return;
      }

      if (!this.publicKeyHex) {
        return;
      }

      // First attempt to get public key from the private key to see if it's possible:
      const encrypted = await this.security.encryptData(this.privateKeyHex, this.password);
      const decrypted = await this.security.decryptData(encrypted, this.password);

      if (this.privateKeyHex == decrypted) {
        migratedSetItem('blockcore:notes:nostr:prvkey', encrypted);
        migratedSetItem('blockcore:notes:nostr:pubkey', this.publicKeyHex);

        this.profile.npub = this.publicKey;
        this.profile.pubkey = this.publicKeyHex;

        if (this.spexfeedNameState.status === 'verified' && this.spexfeedNameState.handle) {
          this.applySpeXFeedNameClaim(this.spexfeedNameState.handle);
        }

        // Create and sign the profile event.
        const profileContent = this.utilities.reduceProfile(this.profile!);
        let unsignedEvent = this.dataService.createEventWithPubkey(kinds.Metadata, JSON.stringify(profileContent), this.publicKeyHex);
        let signedEvent = unsignedEvent as Event;
        signedEvent.id = await getEventHash(unsignedEvent);

        if (!validateEvent(signedEvent)) {
          this.error = 'Unable to validate the event. Cannot continue.';
        }

        signedEvent = finalizeEvent(signedEvent, hexToBytes(this.privateKeyHex)) as any;

        // Make sure we reset the secrets.
        this.mnemonic = '';
        this.privateKey = '';
        this.privateKeyHex = '';
        this.publicKey = '';
        this.publicKeyHex = '';
        this.password = '';
        this.profile = null;

        this.profileService.newProfileEvent = signedEvent;

        this.router.navigateByUrl('/');
      } else {
        this.error = 'Unable to encrypt and decrypt. Cannot continue.';
        console.error(this.error);
      }

      // this.hidePrivateKey = false;
    }, 10);
  }

  updatePublicKey() {
    this.error = '';
    this.publicKey = '';
    this.privateKeyHex = '';

    if (!this.privateKey) {
      this.publicKey = '';
      return;
    }

    if (this.privateKey.startsWith('npub')) {
      this.error = 'The key value must be a "nsec" value. You entered "npub", which is your public key.';
      return;
    }

    if (this.privateKey.startsWith('nsec')) {
      this.privateKeyHex = bytesToHex(nip19.decode(this.privateKey).data as Uint8Array);
    } else {
      this.privateKeyHex = this.privateKey;
    }

    try {
      this.publicKeyHex = getPublicKey(hexToBytes(this.privateKeyHex));
      this.publicKey = nip19.npubEncode(this.publicKeyHex);
    } catch (err: any) {
      this.error = err.message;
    }
  }

  get nicknameInput(): string {
    return typeof this.profile?.name === 'string' ? this.profile.name : '';
  }

  get normalizedRodName(): string {
    const normalizedHandle = this.nicknameInput.trim().toLowerCase().replace(/^sf\//, '');
    return normalizedHandle ? `sf/${normalizedHandle}` : 'sf/<handle>';
  }

  get canCheckSpeXFeedName(): boolean {
    return this.nicknameInput.trim().length > 0 && this.publicKeyHex.length === 64 && !this.isSpeXFeedNameProcessing;
  }

  get canRegisterSpeXFeedName(): boolean {
    return this.spexfeedNameState.status === 'available' && this.acceptedPublicLinkWarning && this.acceptedNotSpexIdWarning && !this.isSpeXFeedNameProcessing;
  }

  get isSpeXFeedNameProcessing(): boolean {
    return this.spexfeedNameState.status === 'checking' || this.spexfeedNameState.status === 'submitting' || this.spexfeedNameState.status === 'pending';
  }

  get hasHelperSetupInstructions(): boolean {
    if (this.spexfeedNameState.status !== 'failed') {
      return false;
    }

    const combinedMessage = [this.spexfeedNameState.message, ...this.spexfeedNameState.errors].join(' ').toLowerCase();
    return combinedMessage.includes('createwallet spexfeed') || combinedMessage.includes('loadwallet spexfeed') || combinedMessage.includes('localhost:11999');
  }

  handleNicknameChange(): void {
    this.acceptedPublicLinkWarning = false;
    this.acceptedNotSpexIdWarning = false;
    this.spexfeedNameState = { status: 'idle', input: '', errors: [] };
  }

  async checkSpeXFeedName(): Promise<void> {
    if (!this.canCheckSpeXFeedName) {
      return;
    }

    this.spexfeedNameState = await this.spexfeedNameRegistration.checkName(this.nicknameInput);
  }

  async registerSpeXFeedName(): Promise<void> {
    if (!this.canRegisterSpeXFeedName || !this.spexfeedNameState.handle || !this.publicKeyHex) {
      return;
    }

    this.spexfeedNameState = await this.spexfeedNameRegistration.submitRegistration(this.spexfeedNameState.handle, this.publicKeyHex);

    if (this.spexfeedNameState.status === 'pending' && this.spexfeedNameState.requestId) {
      this.spexfeedNameState = await this.spexfeedNameRegistration.trackConfirmation(this.spexfeedNameState.requestId);
    }

    if (this.spexfeedNameState.status === 'verified' && this.spexfeedNameState.handle) {
      this.applySpeXFeedNameClaim(this.spexfeedNameState.handle);
    }
  }

  private applySpeXFeedNameClaim(handle: string): void {
    const normalizedHandle = handle.trim().toLowerCase();
    this.profile.spexfeed_name = normalizedHandle;
    this.profile.spexfeed = {
      ...(this.profile.spexfeed ?? {}),
      name: normalizedHandle,
    };
  }
}
