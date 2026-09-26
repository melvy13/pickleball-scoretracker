import { Match } from "./match.model";

export type PlayoffRound = 'semifinal' | 'third-place' | 'final';

export type PlayoffSource =
  | { type: 'standing'; rank: number }
  | { type: 'winner'; fixtureId: string }
  | { type: 'loser'; fixtureId: string };

export interface PlayoffFixture {
  id: string;
  round: PlayoffRound;
  sourceA: PlayoffSource;
  sourceB: PlayoffSource;
  teamAId: string | null;
  teamBId: string | null;
  matchIds: string[];
  manualWinnerOverride: string | null;
}

export interface GeneratedPlayoffs {
  fixtures: PlayoffFixture[];
  matches: Match[];
}

export interface PlayoffFixtureResolution {
  fullyPlayed: boolean;
  winnerId: string | null;
  loserId: string | null;
  teamAWins: number;
  teamBWins: number;
  gamePointDiffA: number;
  requiresManualOverride: boolean;
}

export interface AdvancementResult {
  updatedFixtures: PlayoffFixture[];
  newMatches: Match[];
}
