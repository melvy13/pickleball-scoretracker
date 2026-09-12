import { Fixture } from "../models/fixture.model";
import { Match } from "../models/match.model";
import { Pair, SeedLevel } from "../models/pair.model";
import { Team } from "../models/team.model";

export interface GeneratedTournament {
  fixtures: Fixture[];
  matches: Match[];
}

export function generateTournament(teams: Team[], pairs: Pair[]): GeneratedTournament {
  const fixtures: Fixture[] = [];
  const matches: Match[] = [];

  // Index pairs by "team-seed" for quick lookup
  const pairByTeamSeed = new Map<string, Pair>();
  for (const pair of pairs) {
    pairByTeamSeed.set(`${pair.team}-${pair.seed}`, pair);
  }

  const seeds: SeedLevel[] = [1, 2, 3];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const teamA = teams[i];
      const teamB = teams[j];
      const fixtureId = `${teamA.id}-vs-${teamB.id}`; // e.g. fixtureId = "A-vs-B"

      const matchIds: string[] = [];

      for (const seed of seeds) {
        // pull teamA's pair & teamB's pair from the same seed
        const pairA = pairByTeamSeed.get(`${teamA.id}-${seed}`);
        const pairB = pairByTeamSeed.get(`${teamB.id}-${seed}`);

        if (!pairA || !pairB) {
          throw new Error(
            `Missing pair for team ${teamA.id} or ${teamB.id} at seed ${seed}`
          );
        }

        const matchId = `${fixtureId}-seed${seed}`; // e.g. A-vs-B-seed1
        const isHandicapMatch = pairA.type !== pairB.type;

        matches.push({
          id: matchId,
          fixtureId,
          seed,
          pairAId: pairA.id,
          pairBId: pairB.id,
          scoreA: null,
          scoreB: null,
          isHandicapMatch,
          completed: false
        });

        matchIds.push(matchId);
      }

      fixtures.push({
        id: fixtureId,
        teamAId: teamA.id,
        teamBId: teamB.id,
        matchIds: matchIds as [string, string, string]
      });
    }
  }

  return { fixtures, matches };
}
