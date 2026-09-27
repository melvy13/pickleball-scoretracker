export interface Fixture {
  id: string;
  teamAId: string;
  teamBId: string;
  matchIds: [string, string, string]; // one per seed, in seed order
  order: number;
}
