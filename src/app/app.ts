import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TournamentService } from './core/tournament.service';
import { SeedData, validateSeedData } from './core/seed-data-validator';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  title = 'pickleball-scoretracker';
  showResetModal = signal(false);
  showUploadModal = signal(false);
  uploadErrors = signal<string[]>([]);
  pendingSeedData = signal<SeedData | null>(null);

  constructor(private tournamentService: TournamentService) {}

  onReset(): void {
    const confirmed = window.confirm(
      'Reset the entire tournament? All scores and voided pairs will be permanently lost.'
    );
    if (confirmed) {
      this.tournamentService.resetTournament();
    }
  }

  openResetModal(): void {
    this.showResetModal.set(true);
  }

  cancelReset(): void {
    this.showResetModal.set(false);
  }

  confirmReset(): void {
    this.tournamentService.resetTournament();
  }

  openUploadModal(): void {
    this.uploadErrors.set([]);
    this.pendingSeedData.set(null);
    this.showUploadModal.set(true);
  }

  cancelUpload(): void {
    this.showUploadModal.set(false);
    this.uploadErrors.set([]);
    this.pendingSeedData.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.pendingSeedData.set(null);

      try {
        const parsed = JSON.parse(reader.result as string);
        const result = validateSeedData(parsed);

        if (!result.valid) {
          this.uploadErrors.set(result.errors);
          return;
        }

        this.uploadErrors.set([]);
        this.pendingSeedData.set(parsed as SeedData);
      } catch {
        this.uploadErrors.set(['File is not valid JSON.']);
      }
    };
    reader.readAsText(file);

    input.value = '';
  }

  confirmUpload(): void {
    const data = this.pendingSeedData();
    if (!data) return;

    this.tournamentService.loadCustomSeedData(data);
    this.showUploadModal.set(false);
    this.pendingSeedData.set(null);
  }
}
