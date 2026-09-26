import { Component, computed, signal } from '@angular/core';
import { TournamentService } from '../../core/tournament.service';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [],
  styleUrl: './schedule.scss',
  templateUrl: './schedule.html',
})
export class ScheduleComponent {
  constructor(public tournamentService: TournamentService) {}

  orderedFixtures = computed(() =>
    [...this.tournamentService.fixtures()].sort((a, b) => a.order - b.order)
  );

  recentlyMovedId = signal<string | null>(null);

  moveUp(fixtureId: string): void {
    this.swap(fixtureId, -1);
  }

  moveDown(fixtureId: string): void {
    this.swap(fixtureId, 1);
  }

  private swap(fixtureId: string, direction: -1 | 1): void {
    const ordered = this.orderedFixtures();
    const index = ordered.findIndex(f => f.id === fixtureId);
    const targetIndex = index + direction;

    if (index === -1 || targetIndex < 0 || targetIndex >= ordered.length) {
      return;
    }

    const reordered = [...ordered];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    this.tournamentService.reorderFixtures(reordered.map(f => f.id));
    this.flashRow(fixtureId);
  }

  private flashRow(fixtureId: string): void {
    this.recentlyMovedId.set(null);
    setTimeout(() => this.recentlyMovedId.set(fixtureId), 0);
    setTimeout(() => this.recentlyMovedId.set(null), 1000);
  }

  getTeamName(teamId: string): string {
    const team = this.tournamentService.teams().find(t => t.id === teamId);
    return team?.name ?? teamId;
  }
}
