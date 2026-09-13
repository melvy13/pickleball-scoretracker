import { SeedLevel } from './pair.model';

export interface Match {
  id: string;
  fixtureId: string;
  seed: SeedLevel;
  pairAId: string;
  pairBId: string;
  scoreA: number | null;
  scoreB: number | null;
  isHandicapMatch: boolean; // true if this is XD vs WD (UI note only)
  completed: boolean;
  locked: boolean; // true once score is entered; must be explicitly unlocked to edit
}
