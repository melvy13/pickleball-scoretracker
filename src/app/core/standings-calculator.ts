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

export function rankStandings(
  standings: TeamStanding[],
  fixtures: Fixture[],
  allMatches: Match[],
  allPairs: Pair[]
): RankedStanding[] {
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

  const groups = [];
  for (const team of sorted) {
    const lastGroup = groups[groups.length - 1];
    if (
      lastGroup &&
      lastGroup[0].points === team.points &&
      lastGroup[0].matchDifferential === team.matchDifferential &&
      lastGroup[0].gamePointDifferential === team.gamePointDifferential
    ) {
      lastGroup.push(team);
    } else {
      groups.push([team]);
    }
  }

  const resolvedGroups = groups.map(group =>
    group.length === 1 ? group : breakTeamTieWithHeadToHead(group, fixtures, allMatches, allPairs)
  );

  const finalOrder = resolvedGroups.flat();

  const ranked: RankedStanding[] = [];
  let currentRank = 1;

  for (let i = 0; i < finalOrder.length; i++) {
    const team = finalOrder[i];

    if (i > 0) {
      const prev = finalOrder[i - 1];
      const stillTied =
        team.points === prev.points &&
        team.matchDifferential === prev.matchDifferential &&
        team.gamePointDifferential === prev.gamePointDifferential &&
        (team as any).h2hRank === (prev as any).h2hRank;

      if (!stillTied) {
        currentRank = i + 1;
      }
    }

    const { h2hRank, ...rest } = team as any;
    ranked.push({ ...rest, rank: currentRank });
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

export function rankPairStandings(standings: PairStanding[]): RankedPairStanding[] {
  const withDifferential = standings.map(s => ({
    ...s,
    matchDifferential: s.matchWins - s.matchLosses,
    gamePointDifferential: s.gamePointsFor - s.gamePointsAgainst
  }));

  const sorted = [...withDifferential].sort((a, b) => {
    if (b.matchDifferential !== a.matchDifferential) return b.matchDifferential - a.matchDifferential;
    return b.gamePointDifferential - a.gamePointDifferential;
  });

  const ranked: RankedPairStanding[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const pair = sorted[i];

    if (i > 0) {
      const prev = sorted[i - 1];
      const isTiedWithPrev =
        pair.matchDifferential === prev.matchDifferential &&
        pair.gamePointDifferential === prev.gamePointDifferential;

      if (!isTiedWithPrev) {
        currentRank = i + 1;
      }
    }

    ranked.push({ ...pair, rank: currentRank });
  }

  return ranked;
}

function breakTeamTieWithHeadToHead<T extends TeamStanding>(
  tiedGroup: T[],
  fixtures: Fixture[],
  allMatches: Match[],
  allPairs: Pair[]
): (T & { h2hRank: number })[] {
  const tiedIds = new Set(tiedGroup.map(t => t.teamId));

  // Only fixtures played between two teams that are both in this tied group
  const relevantFixtures = fixtures.filter(
    f => tiedIds.has(f.teamAId) && tiedIds.has(f.teamBId)
  );

  const miniPoints = new Map<string, number>();
  const miniMatchWins = new Map<string, number>();
  const miniMatchLosses = new Map<string, number>();
  const miniGamePointDiff = new Map<string, number>();
  for (const team of tiedGroup) {
    miniPoints.set(team.teamId, 0);
    miniMatchWins.set(team.teamId, 0);
    miniMatchLosses.set(team.teamId, 0);
    miniGamePointDiff.set(team.teamId, 0);
  }

  for (const fixture of relevantFixtures) {
    const result = calculateFixtureResult(fixture, allMatches, allPairs);

    if (result.outcome === 'no-contest') continue;

    miniMatchWins.set(fixture.teamAId, miniMatchWins.get(fixture.teamAId)! + result.teamAWins);
    miniMatchLosses.set(fixture.teamAId, miniMatchLosses.get(fixture.teamAId)! + result.teamBWins);
    miniMatchWins.set(fixture.teamBId, miniMatchWins.get(fixture.teamBId)! + result.teamBWins);
    miniMatchLosses.set(fixture.teamBId, miniMatchLosses.get(fixture.teamBId)! + result.teamAWins);

    if (result.fullyPlayed) {
      if (result.outcome === 'teamA') {
        miniPoints.set(fixture.teamAId, miniPoints.get(fixture.teamAId)! + 2);
      } else if (result.outcome === 'teamB') {
        miniPoints.set(fixture.teamBId, miniPoints.get(fixture.teamBId)! + 2);
      } else if (result.outcome === 'draw') {
        miniPoints.set(fixture.teamAId, miniPoints.get(fixture.teamAId)! + 1);
        miniPoints.set(fixture.teamBId, miniPoints.get(fixture.teamBId)! + 1);
      }
    }

    for (const matchId of fixture.matchIds) {
      const match = allMatches.find(m => m.id === matchId);
      if (!match || !match.completed) continue;
      const voided = isMatchVoided(match, fixture.teamAId, fixture.teamBId, allPairs);
      if (voided) continue;

      miniGamePointDiff.set(fixture.teamAId, miniGamePointDiff.get(fixture.teamAId)! + ((match.scoreA ?? 0) - (match.scoreB ?? 0)));
      miniGamePointDiff.set(fixture.teamBId, miniGamePointDiff.get(fixture.teamBId)! + ((match.scoreB ?? 0) - (match.scoreA ?? 0)));
    }
  }

  const miniDiff = (teamId: string) => miniMatchWins.get(teamId)! - miniMatchLosses.get(teamId)!;

  const sorted = [...tiedGroup].sort((a, b) => {
    const pointsDiff = miniPoints.get(b.teamId)! - miniPoints.get(a.teamId)!;
    if (pointsDiff !== 0) return pointsDiff;
    const matchDiffDiff = miniDiff(b.teamId) - miniDiff(a.teamId);
    if (matchDiffDiff !== 0) return matchDiffDiff;
    return miniGamePointDiff.get(b.teamId)! - miniGamePointDiff.get(a.teamId)!;
  });

  const result: (T & { h2hRank: number })[] = [];
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const prevId = sorted[i - 1].teamId;
      const curId = sorted[i].teamId;
      const samePoints = miniPoints.get(prevId) === miniPoints.get(curId);
      const sameDiff = miniDiff(prevId) === miniDiff(curId);
      const sameGpDiff = miniGamePointDiff.get(prevId) === miniGamePointDiff.get(curId);
      if (!samePoints || !sameDiff || !sameGpDiff) {
        rank = i + 1;
      }
    }
    result.push({ ...sorted[i], h2hRank: rank });
  }

  return result;
}
