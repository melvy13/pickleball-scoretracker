import { Component } from '@angular/core';
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

  constructor(private tournamentService: TournamentService) {}

  onReset(): void {
    const confirmed = window.confirm(
      'Reset the entire tournament? All scores and voided pairs will be permanently lost.'
    );
    if (confirmed) {
      this.tournamentService.resetTournament();
    }
  }
}
