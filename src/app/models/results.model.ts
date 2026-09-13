export type FixtureOutcome = 'teamA' | 'teamB' | 'draw' | 'no-contest';

export interface FixtureResult {
  fixtureId: string;
  outcome: FixtureOutcome;
  teamAWins: number;
  teamBWins: number;
  validMatchCount: number; // non-voided matches that are completed
  totalValidMatches: number;   // non-voided matches total, regardless of completion
  fullyPlayed: boolean;        // true only when every valid match has been completed
}
