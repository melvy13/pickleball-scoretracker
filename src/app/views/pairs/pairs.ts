import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../core/tournament.service';
import { PairType } from '../../models/pair.model';

@Component({
  selector: 'app-pairs',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './pairs.scss',
  templateUrl: './pairs.html',
})
export class PairsComponent {
  constructor(public tournamentService: TournamentService) {}

  onVoidChange(pairId: string, checked: boolean): void {
    this.tournamentService.setPairVoided(pairId, checked);
  }

  getTeamName(teamId: string): string {
    const team = this.tournamentService.teams().find(t => t.id === teamId);
    return team?.name ?? teamId;
  }

  onTeamNameChange(teamId: string, name: string): void {
    this.tournamentService.updateTeamName(teamId, name);
  }

  onTypeChange(pairId: string, type: PairType): void {
    this.tournamentService.updatePairType(pairId, type);
  }

  onPlayerChange(pairId: string, index: 0 | 1, value: string, currentPlayers: [string, string]): void {
    const updated: [string, string] = [...currentPlayers] as [string, string];
    updated[index] = value;
    this.tournamentService.updatePairPlayers(pairId, updated);
  }
}
