import { Injectable, signal } from "@angular/core";
import { Fixture } from "../models/fixture.model";
import { Match } from "../models/match.model";
import { Pair } from "../models/pair.model";
import { Team } from "../models/team.model";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { generateTournament } from "./tournament-generator";

const STORAGE_KEY = 'tournament-state';

interface TournamentState {
  teams: Team[];
  pairs: Pair[];
  fixtures: Fixture[];
  matches: Match[];
}

interface SeedData {
  teams: Team[];
  pairs: Pair[];
}

@Injectable({ providedIn: 'root' })
export class TournamentService {
  teams = signal<Team[]>([]);
  pairs = signal<Pair[]>([]);
  fixtures = signal<Fixture[]>([]);
  matches = signal<Match[]>([]);

  constructor(private http: HttpClient) {}

  async init(): Promise<void> {
    const existing = this.loadFromStorage();

    if (existing) {
      this.teams.set(existing.teams);
      this.pairs.set(existing.pairs);
      this.fixtures.set(existing.fixtures);
      this.matches.set(existing.matches);
      return;
    }

    const seedData = await firstValueFrom(
      this.http.get<SeedData>('seed-data.json')
    );

    const { fixtures, matches } = generateTournament(seedData.teams, seedData.pairs);

    this.teams.set(seedData.teams);
    this.pairs.set(seedData.pairs);
    this.fixtures.set(fixtures);
    this.matches.set(matches);

    this.saveToStorage();
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
      matches: this.matches()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
