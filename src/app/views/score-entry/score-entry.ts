import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TournamentService } from '../../core/tournament.service';
import { Match } from '../../models/match.model';
import { isMatchVoided } from '../../core/standings-calculator';
import { Fixture } from '../../models/fixture.model';

interface ScoreDraft {
  scoreA: number | null;
  scoreB: number | null;
  error: string | null;
}

@Component({
  selector: 'app-score-entry',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './score-entry.scss',
  templateUrl: './score-entry.html',
})
export class ScoreEntryComponent {
  constructor(public tournamentService: TournamentService) {}

  drafts = signal<Record<string, ScoreDraft>>({});

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
    const match = this.tournamentService.matches().find(m => m.id === matchId)!;
    this.drafts.update(d => ({
      ...d,
      [matchId]: { ...this.draftFor(match), error }
    }));
  }

  getPairLabel(pairId: string): string {
    const pair = this.tournamentService.pairs().find(p => p.id === pairId);
    return pair ? `${pair.id} (${pair.type})` : pairId;
  }

  getTeamName(teamId: string): string {
    const team = this.tournamentService.teams().find(t => t.id === teamId);
    return team?.name ?? teamId;
  }

  isVoided(match: Match, fixture: Fixture): boolean {
    return isMatchVoided(match, fixture.teamAId, fixture.teamBId, this.tournamentService.pairs());
  }
}
