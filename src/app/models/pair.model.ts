export type PairType = 'XD' | 'WD';
export type SeedLevel = 1 | 2 | 3;

export interface Pair {
  id: string;
  team: string;
  seed: SeedLevel;
  type: PairType;
  players: [string, string];
  voided: boolean;
}
