import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../core/tournament.service';
import { PlayoffFixture, PlayoffFixtureResolution } from '../../models/playoff.model';
import { resolvePlayoffFixture } from '../../core/playoff-generator';
import { Match } from '../../models/match.model';
import { isHandicapMatch, isMatchVoided } from '../../core/standings-calculator';

interface ScoreDraft {
  scoreA: number | null;
  scoreB: number | null;
  error: string | null;
}

const ROUND_ORDER: Record<string, number> = {
  SF1: 0,
  SF2: 1,
  THIRD: 2,
  FINAL: 3
};

@Component({
  selector: 'app-playoffs',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './playoffs.scss',
  templateUrl: './playoffs.html',
})
export class PlayoffsComponent {
  constructor(public tournamentService: TournamentService) {}

  drafts = signal<Record<string, ScoreDraft>>({});

  orderedFixtures = computed(() =>
    [...this.tournamentService.playoffFixtures()].sort(
      (a, b) => (ROUND_ORDER[a.id] ?? 99) - (ROUND_ORDER[b.id] ?? 99)
    )
  );

  canGenerate = computed(() => this.tournamentService.canGeneratePlayoffs());
  // hasPlayoffs = computed(() => this.tournamentService.playoffFixtures().length > 0);

  generate(): void {
    this.tournamentService.buildPlayoffs();
  }

  resolution(fixture: PlayoffFixture): PlayoffFixtureResolution {
    return resolvePlayoffFixture(fixture, this.tournamentService.matches(), this.tournamentService.pairs());
  }

  matchesFor(fixture: PlayoffFixture): Match[] {
    return fixture.matchIds
      .map(id => this.tournamentService.matches().find(m => m.id === id))
      .filter((m): m is Match => m !== undefined);
  }

  roundLabel(fixture: PlayoffFixture): string {
    switch (fixture.round) {
      case 'semifinal': return 'Semifinal';
      case 'third-place': return '3rd Place';
      case 'final': return 'Final';
    }
  }

  draftFor(match: Match): ScoreDraft {
    const existing = this.drafts()[match.id];
    if (existing) return existing;
    return { scoreA: match.scoreA, scoreB: match.scoreB, error: null };
  }

  updateDraft(matchId: string, field: 'scoreA' | 'scoreB', value: number | null): void {
    const match = this.tournamentService.matches().find(m => m.id === matchId)!;
    this.drafts.update(d => ({
      ...d,
      [matchId]: { ...this.draftFor(match), [field]: value, error: null }
    }));
  }

  submitScore(match: Match): void {
    const draft = this.draftFor(match);

    if (draft.scoreA === null || draft.scoreB === null) {
      this.setDraftError(match.id, 'Both scores are required.');
      return;
    }

    try {
      this.tournamentService.updateScore(match.id, draft.scoreA, draft.scoreB);
      this.setDraftError(match.id, null);
    } catch (e) {
      this.setDraftError(match.id, (e as Error).message);
    }
  }

  unlock(matchId: string): void {
    this.tournamentService.unlockMatch(matchId);
  }

  private setDraftError(matchId: string, error: string | null): void {
    this.drafts.update(d => ({
      ...d,
      [matchId]: { ...this.draftFor(this.tournamentService.matches().find(m => m.id === matchId)!), error }
    }));
  }

  isVoided(match: Match, fixture: PlayoffFixture): boolean {
    if (!fixture.teamAId || !fixture.teamBId) return false;
    return isMatchVoided(match, fixture.teamAId, fixture.teamBId, this.tournamentService.pairs());
  }

  isHandicap(match: Match): boolean {
    return isHandicapMatch(match, this.tournamentService.pairs());
  }

  getPairLabel(pairId: string): string {
    const pair = this.tournamentService.pairs().find(p => p.id === pairId);
    return pair ? `${pair.players[0]} / ${pair.players[1]}` : '';
  }

  getTeamName(teamId: string | null): string {
    if (!teamId) return 'TBD';
    const team = this.tournamentService.teams().find(t => t.id === teamId);
    return team?.name ?? teamId;
  }

  setOverride(fixtureId: string, teamId: string): void {
    this.tournamentService.setPlayoffManualOverride(fixtureId, teamId);
  }

  sanitizeNumericInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
  }
}
