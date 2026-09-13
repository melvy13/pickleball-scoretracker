import { Component, computed } from '@angular/core';
import { TournamentService } from '../../core/tournament.service';
import { calculateStandings, rankStandings } from '../../core/standings-calculator';

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [],
  styleUrl: './standings.scss',
  templateUrl: './standings.html',
})
export class StandingsComponent {
  constructor(private tournamentService: TournamentService) {}

  standings = computed(() => {
    const teams = this.tournamentService.teams();
    const fixtures = this.tournamentService.fixtures();
    const matches = this.tournamentService.matches();
    const pairs = this.tournamentService.pairs();

    const raw = calculateStandings(teams, fixtures, matches, pairs);
    return rankStandings(raw);
  });

  getTeamName(teamId: string): string {
    const team = this.tournamentService.teams().find(t => t.id === teamId);
    return team?.name ?? teamId;
  }
}
