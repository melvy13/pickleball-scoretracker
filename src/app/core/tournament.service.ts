import { Injectable, signal } from "@angular/core";
import { Fixture } from "../models/fixture.model";
import { Match } from "../models/match.model";
import { Pair, PairType } from "../models/pair.model";
import { Team } from "../models/team.model";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { generateTournament } from "./tournament-generator";
import { PlayoffFixture } from "../models/playoff.model";
import { isRoundRobinComplete, generatePlayoffs, advancePlayoffTeams } from "./playoff-generator";
import { calculateStandings, rankStandings } from "./standings-calculator";
import { SeedData } from "./seed-data-validator";

const STORAGE_KEY = 'tournament-state';

interface TournamentState {
  teams: Team[];
  pairs: Pair[];
  fixtures: Fixture[];
  matches: Match[];
  playoffFixtures: PlayoffFixture[];
}

@Injectable({ providedIn: 'root' })
export class TournamentService {
  teams = signal<Team[]>([]);
  pairs = signal<Pair[]>([]);
  fixtures = signal<Fixture[]>([]);
  matches = signal<Match[]>([]);
  playoffFixtures = signal<PlayoffFixture[]>([]);

  constructor(private http: HttpClient) {}

  async init(): Promise<void> {
    const existing = this.loadFromStorage();

    if (existing) {
      this.teams.set(existing.teams);
      this.pairs.set(existing.pairs);
      this.fixtures.set(existing.fixtures);
      this.matches.set(existing.matches);
      this.playoffFixtures.set(existing.playoffFixtures);
      return;
    }

    const seedData = await this.loadSeedData();

    const { fixtures, matches } = generateTournament(seedData.teams, seedData.pairs, seedData.fixtureOrder);

    this.teams.set(seedData.teams);
    this.pairs.set(seedData.pairs);
    this.fixtures.set(fixtures);
    this.matches.set(matches);
    this.playoffFixtures.set([]);

    this.saveToStorage();
  }

  private async loadSeedData(): Promise<SeedData> {
    try {
      return await firstValueFrom(this.http.get<SeedData>('seed-data.local.json'));
    } catch {
      return await firstValueFrom(this.http.get<SeedData>('seed-data.json'));
    }
  }

  private loadFromStorage(): TournamentState | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as TournamentState;
    } catch {
      return null;
    }
  }

  private saveToStorage(): void {
    const state: TournamentState = {
      teams: this.teams(),
      pairs: this.pairs(),
      fixtures: this.fixtures(),
      matches: this.matches(),
      playoffFixtures: this.playoffFixtures()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  updateScore(matchId: string, scoreA: number, scoreB: number): void {
    const match = this.matches().find(m => m.id === matchId);
    if (!match) {
      throw new Error(`Match not found: ${matchId}`);
    }
    if (match.locked) {
      throw new Error(`Match ${matchId} is locked. Unlock it before editing.`);
    }

    const isValid =
      (scoreA === 15 && scoreB >= 0 && scoreB <= 14) ||
      (scoreB === 15 && scoreA >= 0 && scoreA <= 14);

    if (!isValid) {
      throw new Error(
        `Invalid score: ${scoreA}-${scoreB}. Winner must have exactly 15, loser 0-14.`
      );
    }

    this.matches.update(matches =>
      matches.map(match =>
        match.id === matchId
          ? { ...match, scoreA, scoreB, completed: true, locked: true }
          : match
      )
    );

    this.tryAdvancePlayoffs();
    this.saveToStorage();
  }

  unlockMatch(matchId: string): void {
    this.matches.update(matches =>
      matches.map(match =>
        match.id === matchId
          ? { ...match, locked: false }
          : match
      )
    );

    this.saveToStorage();
  }

  setPairVoided(pairId: string, voided: boolean): void {
    const pair = this.pairs().find(p => p.id === pairId);
    if (!pair) {
      throw new Error(`Pair not found: ${pairId}`);
    }

    this.pairs.update(pairs =>
      pairs.map(pair =>
        pair.id === pairId
          ? { ...pair, voided }
          : pair
      )
    );

    this.saveToStorage();
  }

  resetTournament(): void {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  updateTeamName(teamId: string, name: string): void {
    this.teams.update(teams =>
      teams.map(t => (t.id === teamId ? { ...t, name } : t))
    );
    this.saveToStorage();
  }

  updatePairPlayers(pairId: string, players: [string, string]): void {
    this.pairs.update(pairs =>
      pairs.map(p => (p.id === pairId ? { ...p, players } : p))
    );
    this.saveToStorage();
  }

  updatePairType(pairId: string, type: PairType): void {
    this.pairs.update(pairs =>
      pairs.map(p => (p.id === pairId ? { ...p, type } : p))
    );
    this.saveToStorage();
  }

  canGeneratePlayoffs(): boolean {
    return (
      this.playoffFixtures().length === 0 &&
      isRoundRobinComplete(this.fixtures(), this.matches(), this.pairs())
    );
  }

  buildPlayoffs(): void {
    if (!this.canGeneratePlayoffs()) {
      throw new Error('Round robin is not complete, or playoffs were already generated.');
    }

    const standings = rankStandings(
      calculateStandings(this.teams(), this.fixtures(), this.matches(), this.pairs()),
      this.fixtures(),
      this.matches(),
      this.pairs()
    );
    const { fixtures, matches } = generatePlayoffs(standings, this.pairs());

    this.playoffFixtures.set(fixtures);
    this.matches.update(m => [...m, ...matches]);

    this.saveToStorage();
  }

  private tryAdvancePlayoffs(): void {
    const current = this.playoffFixtures();
    if (current.length === 0) return;

    const { updatedFixtures, newMatches } = advancePlayoffTeams(current, this.matches(), this.pairs());

    this.playoffFixtures.set(updatedFixtures);
    if (newMatches.length > 0) {
      this.matches.update(m => [...m, ...newMatches]);
    }
  }

  setPlayoffManualOverride(fixtureId: string, winnerTeamId: string): void {
    this.playoffFixtures.update(fixtures =>
      fixtures.map(f => (f.id === fixtureId ? { ...f, manualWinnerOverride: winnerTeamId } : f))
    );
    this.tryAdvancePlayoffs();
  }
  loadCustomSeedData(data: SeedData): void {
    const { fixtures, matches } = generateTournament(data.teams, data.pairs, data.fixtureOrder);

    this.teams.set(data.teams);
    this.pairs.set(data.pairs);
    this.fixtures.set(fixtures);
    this.matches.set(matches);
    this.saveToStorage();
  }

  reorderFixtures(orderedFixtureIds: string[]): void {
    const orderMap = new Map<string, number>();
    orderedFixtureIds.forEach((id, index) => orderMap.set(id, index));

    this.fixtures.update(fixtures =>
      fixtures.map(fixture => ({
        ...fixture,
        order: orderMap.get(fixture.id) ?? fixture.order
      }))
    );

    this.saveToStorage();
  }
}
