import { Component, computed } from '@angular/core';
import { TournamentService } from '../../core/tournament.service';
import { SeedLevel } from '../../models/pair.model';
import { calculatePairStandingsForSeed, rankPairStandings } from '../../core/standings-calculator';

@Component({
  selector: 'app-pair-rankings',
  standalone: true,
  imports: [],
  styleUrl: './pair-rankings.scss',
  templateUrl: './pair-rankings.html',
})
export class PairRankingsComponent {
  constructor(public tournamentService: TournamentService) {}

  private seedRankings = (seed: SeedLevel) =>
    computed(() =>
      rankPairStandings(
        calculatePairStandingsForSeed(seed, this.tournamentService.pairs(), this.tournamentService.matches())
      )
    );
  
  seed1Rankings = this.seedRankings(1);
  seed2Rankings = this.seedRankings(2);
  seed3Rankings = this.seedRankings(3);

  getTeamName(teamId: string): string {
    const team = this.tournamentService.teams().find(t => t.id === teamId);
    return team?.name ?? teamId;
  }

  getPlayerNames(pairId: string): string {
    const pair = this.tournamentService.pairs().find(p => p.id === pairId);
    return pair ? `${pair.players[0]} / ${pair.players[1]}` : '';
  }
}
