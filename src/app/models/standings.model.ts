export interface TeamStanding {
  teamId: string;
  fixturesPlayed: number;
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
