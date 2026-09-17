import { SeedLevel } from "./pair.model";

export interface TeamStanding {
  teamId: string;
  fixturesPlayed: number;
  fixturesWon: number;
  fixturesDrawn: number;
  fixturesLost: number;
  points: number;
  matchWins: number;
  matchLosses: number;
  gamePointsFor: number;
  gamePointsAgainst: number;
}

export interface RankedStanding extends TeamStanding {
  rank: number;
  matchDifferential: number;
  gamePointDifferential: number;
}

export interface PairStanding {
  pairId: string;
  team: string;
  seed: SeedLevel;
  matchesPlayed: number;
  matchWins: number;
  matchLosses: number;
  gamePointsFor: number;
  gamePointsAgainst: number;
}

export interface RankedPairStanding extends PairStanding {
  rank: number;
  matchDifferential: number;
  gamePointDifferential: number;
}
