import { Pair, SeedLevel } from '../models/pair.model';
import { Match } from '../models/match.model';
import { Fixture } from '../models/fixture.model';
import { AdvancementResult, GeneratedPlayoffs, PlayoffFixture, PlayoffFixtureResolution } from '../models/playoff.model';
import { RankedStanding } from '../models/standings.model';
import { calculateFixtureResult, isMatchVoided } from './standings-calculator';

export function isRoundRobinComplete(
  fixtures: Fixture[],
  matches: Match[],
  pairs: Pair[]
): boolean {
  return fixtures.every(fixture => {
    const result = calculateFixtureResult(fixture, matches, pairs);
    return result.outcome === 'no-contest' || result.fullyPlayed;
  });
}

function buildPlayoffMatches(
  fixtureId: string,
  teamAId: string,
  teamBId: string,
  pairs: Pair[]
): Match[] {
  const seeds: SeedLevel[] = [1, 2, 3];
  const matches: Match[] = [];

  for (const seed of seeds) {
    const pairA = pairs.find(p => p.team === teamAId && p.seed === seed);
    const pairB = pairs.find(p => p.team === teamBId && p.seed === seed);

    if (!pairA || !pairB) {
      throw new Error(`Missing pair for team ${teamAId} or ${teamBId} at seed ${seed}`);
    }

    matches.push({
      id: `${fixtureId}-seed${seed}`,
      fixtureId,
      seed,
      pairAId: pairA.id,
      pairBId: pairB.id,
      scoreA: null,
      scoreB: null,
      completed: false,
      locked: false
    });
  }

  return matches;
}

export function generatePlayoffs(
  rankedStandings: RankedStanding[],
  pairs: Pair[]
): GeneratedPlayoffs {
  const byRank = (rank: number) => rankedStandings.find(s => s.rank === rank);

  const first = byRank(1);
  const second = byRank(2);
  const third = byRank(3);
  const fourth = byRank(4);

  if (!first || !second || !third || !fourth) {
    throw new Error('Standings must have at least 4 distinct ranks to generate playoffs.');
  }

  const sf1Matches = buildPlayoffMatches('SF1', first.teamId, fourth.teamId, pairs);
  const sf2Matches = buildPlayoffMatches('SF2', second.teamId, third.teamId, pairs);

  const sf1: PlayoffFixture = {
    id: 'SF1',
    round: 'semifinal',
    sourceA: { type: 'standing', rank: 1 },
    sourceB: { type: 'standing', rank: 4 },
    teamAId: first.teamId,
    teamBId: fourth.teamId,
    matchIds: sf1Matches.map(m => m.id),
    manualWinnerOverride: null
  };

  const sf2: PlayoffFixture = {
    id: 'SF2',
    round: 'semifinal',
    sourceA: { type: 'standing', rank: 2 },
    sourceB: { type: 'standing', rank: 3 },
    teamAId: second.teamId,
    teamBId: third.teamId,
    matchIds: sf2Matches.map(m => m.id),
    manualWinnerOverride: null
  };

  const thirdPlace: PlayoffFixture = {
    id: 'THIRD',
    round: 'third-place',
    sourceA: { type: 'loser', fixtureId: 'SF1' },
    sourceB: { type: 'loser', fixtureId: 'SF2' },
    teamAId: null,
    teamBId: null,
    matchIds: [],
    manualWinnerOverride: null
  };

  const final: PlayoffFixture = {
    id: 'FINAL',
    round: 'final',
    sourceA: { type: 'winner', fixtureId: 'SF1' },
    sourceB: { type: 'winner', fixtureId: 'SF2' },
    teamAId: null,
    teamBId: null,
    matchIds: [],
    manualWinnerOverride: null
  };

  return {
    fixtures: [sf1, sf2, thirdPlace, final],
    matches: [...sf1Matches, ...sf2Matches]
  };
}

export function resolvePlayoffFixture(
  fixture: PlayoffFixture,
  allMatches: Match[],
  allPairs: Pair[]
): PlayoffFixtureResolution {
  const notPlayed: PlayoffFixtureResolution = {
    fullyPlayed: false,
    winnerId: null,
    loserId: null,
    teamAWins: 0,
    teamBWins: 0,
    gamePointDiffA: 0,
    requiresManualOverride: false
  };

  if (!fixture.teamAId || !fixture.teamBId || fixture.matchIds.length === 0) {
    return notPlayed;
  }

  const fixtureMatches = fixture.matchIds
    .map(id => allMatches.find(m => m.id === id))
    .filter((m): m is Match => m !== undefined);

  let teamAWins = 0;
  let teamBWins = 0;
  let gamePointsForA = 0;
  let gamePointsAgainstA = 0;
  let validCount = 0;
  let completedCount = 0;

  for (const match of fixtureMatches) {
    const voided = isMatchVoided(match, fixture.teamAId, fixture.teamBId, allPairs);
    if (voided) continue;

    validCount++;
    if (!match.completed) continue;

    completedCount++;

    gamePointsForA += match.scoreA ?? 0;
    gamePointsAgainstA += match.scoreB ?? 0;

    if ((match.scoreA ?? 0) > (match.scoreB ?? 0)) {
      teamAWins++;
    } else {
      teamBWins++;
    }
  }

  const fullyPlayed = validCount > 0 && completedCount === validCount;
  if (!fullyPlayed) {
    return { ...notPlayed, teamAWins, teamBWins, gamePointDiffA: gamePointsForA - gamePointsAgainstA };
  }

  const gamePointDiffA = gamePointsForA - gamePointsAgainstA;

  // 1. Match wins
  if (teamAWins !== teamBWins) {
    const winnerId = teamAWins > teamBWins ? fixture.teamAId : fixture.teamBId;
    const loserId = teamAWins > teamBWins ? fixture.teamBId : fixture.teamAId;
    return { fullyPlayed: true, winnerId, loserId, teamAWins, teamBWins, gamePointDiffA, requiresManualOverride: false };
  }

  // 2. Game point differential
  if (gamePointDiffA !== 0) {
    const winnerId = gamePointDiffA > 0 ? fixture.teamAId : fixture.teamBId;
    const loserId = gamePointDiffA > 0 ? fixture.teamBId : fixture.teamAId;
    return { fullyPlayed: true, winnerId, loserId, teamAWins, teamBWins, gamePointDiffA, requiresManualOverride: false };
  }

  // 3. Still tied - manual override required
  if (fixture.manualWinnerOverride) {
    const winnerId = fixture.manualWinnerOverride;
    const loserId = winnerId === fixture.teamAId ? fixture.teamBId : fixture.teamAId;
    return { fullyPlayed: true, winnerId, loserId, teamAWins, teamBWins, gamePointDiffA, requiresManualOverride: false };
  }

  return {
    fullyPlayed: true,
    winnerId: null,
    loserId: null,
    teamAWins,
    teamBWins,
    gamePointDiffA,
    requiresManualOverride: true
  };
}

export function advancePlayoffTeams(
  fixtures: PlayoffFixture[],
  allMatches: Match[],
  pairs: Pair[]
): AdvancementResult {
  const sf1 = fixtures.find(f => f.id === 'SF1');
  const sf2 = fixtures.find(f => f.id === 'SF2');
  const third = fixtures.find(f => f.id === 'THIRD');
  const final = fixtures.find(f => f.id === 'FINAL');

  if (!sf1 || !sf2 || !third || !final) {
    return { updatedFixtures: fixtures, newMatches: [] };
  }

  const sf1Result = resolvePlayoffFixture(sf1, allMatches, pairs);
  const sf2Result = resolvePlayoffFixture(sf2, allMatches, pairs);

  const newMatches: Match[] = [];
  let updatedThird = third;
  let updatedFinal = final;

  if (final.matchIds.length === 0 && sf1Result.winnerId && sf2Result.winnerId) {
    const finalMatches = buildPlayoffMatches('FINAL', sf1Result.winnerId, sf2Result.winnerId, pairs);
    newMatches.push(...finalMatches);
    updatedFinal = {
      ...final,
      teamAId: sf1Result.winnerId,
      teamBId: sf2Result.winnerId,
      matchIds: finalMatches.map(m => m.id)
    };
  }

  if (third.matchIds.length === 0 && sf1Result.loserId && sf2Result.loserId) {
    const thirdMatches = buildPlayoffMatches('THIRD', sf1Result.loserId, sf2Result.loserId, pairs);
    newMatches.push(...thirdMatches);
    updatedThird = {
      ...third,
      teamAId: sf1Result.loserId,
      teamBId: sf2Result.loserId,
      matchIds: thirdMatches.map(m => m.id)
    };
  }

  const updatedFixtures = fixtures.map(f => {
    if (f.id === 'THIRD') return updatedThird;
    if (f.id === 'FINAL') return updatedFinal;
    return f;
  });

  return { updatedFixtures, newMatches };
}
