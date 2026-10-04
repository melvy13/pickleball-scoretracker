import { FixtureOutcome, FixtureResult } from "../models/results.model";
import { Fixture } from "../models/fixture.model";
import { Match } from "../models/match.model";
import { Pair, SeedLevel } from "../models/pair.model";
import { Team } from "../models/team.model";
import { PairStanding, RankedPairStanding, RankedStanding, TeamStanding } from "../models/standings.model";

export function getExcludedSeedsForTeam(teamId: string, allPairs: Pair[]): Set<SeedLevel> {
  const teamPairs = allPairs.filter(p => p.team === teamId);
  const voidedPairs = teamPairs.filter(p => p.voided);
  if (voidedPairs.length === 0) {
    return new Set();
  }

  if (voidedPairs.length === 1) {
    return new Set([voidedPairs[0].seed]);
  }

  // 2 or 3 pairs voided: whole team excluded, all 3 seeds drop
  return new Set([1, 2, 3]);
}

export function isMatchVoided(match: Match, teamAId: string, teamBId: string, allPairs: Pair[]): boolean {
  const excludedForA = getExcludedSeedsForTeam(teamAId, allPairs);
  const excludedForB = getExcludedSeedsForTeam(teamBId, allPairs);

  return excludedForA.has(match.seed) || excludedForB.has(match.seed);
}

export function isHandicapMatch(match: Match, allPairs: Pair[]): boolean {
  const pairA = allPairs.find(p => p.id === match.pairAId);
  const pairB = allPairs.find(p => p.id === match.pairBId);

  if (!pairA || !pairB) return false;

  return pairA.type !== pairB.type;
}

export function calculateFixtureResult(fixture: Fixture, allMatches: Match[], allPairs: Pair[]): FixtureResult {
  const fixtureMatches = fixture.matchIds
    .map(id => allMatches.find(m => m.id === id))
    .filter((m): m is Match => m !== undefined);

  let teamAWins = 0;
  let teamBWins = 0;
  let validMatchCount = 0;
  let totalValidMatches = 0;

  for (const match of fixtureMatches) {
    const voided = isMatchVoided(match, fixture.teamAId, fixture.teamBId, allPairs);
    if (voided) continue;
    totalValidMatches++;

    if (!match.completed) continue;
    validMatchCount++;

    if (match.scoreA === match.scoreB) continue; // shouldn't happen but guard anyway

    const teamAWonThisMatch = (match.scoreA ?? 0) > (match.scoreB ?? 0);
    if (teamAWonThisMatch) {
      teamAWins++;
    } else {
      teamBWins++;
    }
  }

  let outcome: FixtureOutcome;
  if (totalValidMatches === 0) {
    outcome = 'no-contest';
  } else if (teamAWins > teamBWins) {
    outcome = 'teamA';
  } else if (teamBWins > teamAWins) {
    outcome = 'teamB';
  } else {
    outcome = 'draw';
  }

  return {
    fixtureId: fixture.id,
    outcome,
    teamAWins,
    teamBWins,
    validMatchCount,
    totalValidMatches,
    fullyPlayed: totalValidMatches > 0 && validMatchCount === totalValidMatches
  };
}

export function calculateStandings(teams: Team[], fixtures: Fixture[], allMatches: Match[], allPairs: Pair[]): TeamStanding[] {
  const standingsMap = new Map<string, TeamStanding>();

  for (const team of teams) {
    standingsMap.set(team.id, {
      teamId: team.id,
      fixturesPlayed: 0,
      fixturesWon: 0,
      fixturesDrawn: 0,
      fixturesLost: 0,
      points: 0,
      matchWins: 0,
      matchLosses: 0,
      gamePointsFor: 0,
      gamePointsAgainst: 0
    });
  }

  for (const fixture of fixtures) {
    const result = calculateFixtureResult(fixture, allMatches, allPairs);

    if (result.outcome === 'no-contest') continue;

    const teamA = standingsMap.get(fixture.teamAId)!;
    const teamB = standingsMap.get(fixture.teamBId)!;

    teamA.matchWins += result.teamAWins;
    teamA.matchLosses += result.teamBWins;
    teamB.matchWins += result.teamBWins;
    teamB.matchLosses += result.teamAWins;

    if (result.fullyPlayed) {
      teamA.fixturesPlayed++;
      teamB.fixturesPlayed++;

      if (result.outcome === 'teamA') {
        teamA.points += 2;
        teamA.fixturesWon++;
        teamB.fixturesLost++;
      } else if (result.outcome === 'teamB') {
        teamB.points += 2;
        teamB.fixturesWon++;
        teamA.fixturesLost++;
      } else if (result.outcome === 'draw') {
        teamA.points += 1;
        teamB.points += 1;
        teamA.fixturesDrawn++;
        teamB.fixturesDrawn++;
      }
    }
  }

  for (const match of allMatches) {
    if (!match.completed) continue;

    const fixture = fixtures.find(f => f.matchIds.includes(match.id));
    if (!fixture) continue;

    const voided = isMatchVoided(match, fixture.teamAId, fixture.teamBId, allPairs);
    if (voided) continue;

    const teamA = standingsMap.get(fixture.teamAId)!;
    const teamB = standingsMap.get(fixture.teamBId)!;

    teamA.gamePointsFor += match.scoreA ?? 0;
    teamA.gamePointsAgainst += match.scoreB ?? 0;
    teamB.gamePointsFor += match.scoreB ?? 0;
    teamB.gamePointsAgainst += match.scoreA ?? 0;
  }

  return Array.from(standingsMap.values());
}

export function rankStandings(standings: TeamStanding[]): RankedStanding[] {
  const withDifferentials = standings.map(s => ({
    ...s,
    matchDifferential: s.matchWins - s.matchLosses,
    gamePointDifferential: s.gamePointsFor - s.gamePointsAgainst
  }));

  const sorted = [...withDifferentials].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.matchDifferential !== a.matchDifferential) return b.matchDifferential - a.matchDifferential;
    return b.gamePointDifferential - a.gamePointDifferential;
  });

  const ranked: RankedStanding[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];

    if (i > 0) {
      const prev = sorted[i - 1];
      const isTiedWithPrev =
        team.points === prev.points &&
        team.matchDifferential === prev.matchDifferential &&
        team.gamePointDifferential === prev.gamePointDifferential;

      if (!isTiedWithPrev) {
        currentRank = i + 1;
      }
      // if tied, currentRank stays the same as prev -> shared placement
    }

    ranked.push({ ...team, rank: currentRank });
  }

  return ranked;
}

export function calculatePairStandingsForSeed(seed: SeedLevel, allPairs: Pair[], allMatches: Match[]): PairStanding[] {
  const seedPairs = allPairs.filter(p => p.seed === seed && !p.voided);

  const standingsMap = new Map<string, PairStanding>();
  for (const pair of seedPairs) {
    standingsMap.set(pair.id, {
      pairId: pair.id,
      team: pair.team,
      seed: pair.seed,
      matchesPlayed: 0,
      matchWins: 0,
      matchLosses: 0,
      gamePointsFor: 0,
      gamePointsAgainst: 0
    });
  }

  const seedMatches = allMatches.filter(m => m.seed === seed && m.completed);
  for (const match of seedMatches) {
    const pairA = standingsMap.get(match.pairAId);
    const pairB = standingsMap.get(match.pairBId);

    if (!pairA || !pairB) continue;
    if (match.scoreA === null || match.scoreB === null) continue;

    pairA.matchesPlayed++;
    pairB.matchesPlayed++;
    pairA.gamePointsFor += match.scoreA;
    pairA.gamePointsAgainst += match.scoreB;
    pairB.gamePointsFor += match.scoreB;
    pairB.gamePointsAgainst += match.scoreA;

    if (match.scoreA > match.scoreB) {
      pairA.matchWins++;
      pairB.matchLosses++;
    } else {
      pairB.matchWins++;
      pairA.matchLosses++;
    }
  }

  return Array.from(standingsMap.values());
}

export function rankPairStandings(
  standings: PairStanding[],
  allMatches: Match[]
): RankedPairStanding[] {
  const withDerived = standings.map(s => ({
    ...s,
    points: s.matchWins * 2,
    gamePointDifferential: s.gamePointsFor - s.gamePointsAgainst
  }));

  const sorted = [...withDerived].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.gamePointDifferential - a.gamePointDifferential;
  });

  // group consecutive pairs that are tied on points + game point diff
  const groups = [];
  for (const pair of sorted) {
    const lastGroup = groups[groups.length - 1];
    if (
      lastGroup &&
      lastGroup[0].points === pair.points &&
      lastGroup[0].gamePointDifferential === pair.gamePointDifferential
    ) {
      lastGroup.push(pair);
    } else {
      groups.push([pair]);
    }
  }

  // within each tied group, break ties using head-to-head mini-league
  const resolvedGroups = groups.map(group =>
    group.length === 1 ? group : breakTieWithHeadToHead(group, allMatches)
  );

  const finalOrder = resolvedGroups.flat();

  const ranked: RankedPairStanding[] = [];
  let currentRank = 1;

  for (let i = 0; i < finalOrder.length; i++) {
    const pair = finalOrder[i];

    if (i > 0) {
      const prev = finalOrder[i - 1];
      const stillTied =
        pair.points === prev.points &&
        pair.gamePointDifferential === prev.gamePointDifferential &&
        (pair as any).h2hRank === (prev as any).h2hRank;

      if (!stillTied) {
        currentRank = i + 1;
      }
    }

    const { h2hRank, ...rest } = pair as any;

    ranked.push({ ...rest, rank: currentRank });
  }

  return ranked;
}

function breakTieWithHeadToHead<T extends PairStanding>(
  tiedGroup: T[],
  allMatches: Match[]
): (T & { h2hRank: number })[] {
  const tiedIds = new Set(tiedGroup.map(p => p.pairId));

  // Only matches played between two pairs that are both in this tied group
  const relevantMatches = allMatches.filter(
    m => m.completed && tiedIds.has(m.pairAId) && tiedIds.has(m.pairBId)
  );

  const miniPoints = new Map<string, number>();
  const miniGamePointDiff = new Map<string, number>();
  for (const pair of tiedGroup) {
    miniPoints.set(pair.pairId, 0);
    miniGamePointDiff.set(pair.pairId, 0);
  }

  for (const match of relevantMatches) {
    if (match.scoreA === null || match.scoreB === null) continue;

    miniGamePointDiff.set(match.pairAId, miniGamePointDiff.get(match.pairAId)! + (match.scoreA - match.scoreB));
    miniGamePointDiff.set(match.pairBId, miniGamePointDiff.get(match.pairBId)! + (match.scoreB - match.scoreA));

    if (match.scoreA > match.scoreB) {
      miniPoints.set(match.pairAId, miniPoints.get(match.pairAId)! + 2);
    } else {
      miniPoints.set(match.pairBId, miniPoints.get(match.pairBId)! + 2);
    }
  }

  const sorted = [...tiedGroup].sort((a, b) => {
    const pointsDiff = miniPoints.get(b.pairId)! - miniPoints.get(a.pairId)!;
    if (pointsDiff !== 0) return pointsDiff;
    return miniGamePointDiff.get(b.pairId)! - miniGamePointDiff.get(a.pairId)!;
  });

  const result: (T & { h2hRank: number })[] = [];
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const prevPoints = miniPoints.get(sorted[i - 1].pairId)!;
      const prevDiff = miniGamePointDiff.get(sorted[i - 1].pairId)!;
      const curPoints = miniPoints.get(sorted[i].pairId)!;
      const curDiff = miniGamePointDiff.get(sorted[i].pairId)!;
      if (prevPoints !== curPoints || prevDiff !== curDiff) {
        rank = i + 1;
      }
    }
    result.push({ ...sorted[i], h2hRank: rank });
  }

  return result;
}
