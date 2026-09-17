import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TournamentService } from './core/tournament.service';

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
}
