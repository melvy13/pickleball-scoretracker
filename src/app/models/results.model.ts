export type FixtureOutcome = 'teamA' | 'teamB' | 'draw' | 'no-contest';

export interface FixtureResult {
  fixtureId: string;
  outcome: FixtureOutcome;
  teamAWins: number;
  teamBWins: number;
  validMatchCount: number; // matches that weren't voided
}
