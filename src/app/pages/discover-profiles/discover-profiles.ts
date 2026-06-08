import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApplicationState } from '../../services/applicationstate';
import { RecentRodNameItem, RecentRodNamesService } from '../../services/recent-rod-names';

@Component({
  selector: 'app-discover-profiles',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatListModule, MatProgressSpinnerModule],
  templateUrl: './discover-profiles.html',
  styleUrls: ['./discover-profiles.css'],
})
export class DiscoverProfilesComponent {
  recentNames: RecentRodNameItem[] = [];
  isLoading = true;
  hasError = false;

  constructor(
    public appState: ApplicationState,
    private readonly recentRodNamesService: RecentRodNamesService
  ) {}

  ngOnInit(): void {
    this.appState.updateTitle('Discover Profiles');
    this.appState.showBackButton = true;
    this.appState.actions = [];

    this.recentRodNamesService.getRecentNames().subscribe((response) => {
      this.recentNames = response.items ?? [];
      this.hasError = response.error === true;
      this.isLoading = false;
    });
  }

  trackByName(index: number, item: RecentRodNameItem): string {
    return item.txid || item.name || `${item.handle}-${index}`;
  }

  hasProfileLink(item: RecentRodNameItem): boolean {
    return Boolean(item.pubkey && item.valid);
  }
}
