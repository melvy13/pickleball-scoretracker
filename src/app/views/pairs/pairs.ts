import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../core/tournament.service';

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
}
