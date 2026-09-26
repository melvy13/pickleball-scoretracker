import { Team } from '../models/team.model';
import { Pair, SeedLevel } from '../models/pair.model';

export interface SeedData {
  teams: Team[];
  pairs: Pair[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSeedData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['File does not contain a valid JSON object.'] };
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj['teams']) || obj['teams'].length === 0) {
    errors.push('Missing or empty "teams" array.');
  }
  if (!Array.isArray(obj['pairs']) || obj['pairs'].length === 0) {
    errors.push('Missing or empty "pairs" array.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const teams = obj['teams'] as unknown[];
  const pairs = obj['pairs'] as unknown[];

  const teamIds = new Set<string>();
  for (const t of teams) {
    if (typeof t !== 'object' || t === null || typeof (t as any).id !== 'string' || typeof (t as any).name !== 'string') {
      errors.push('Each team must have a string "id" and "name".');
      break;
    }
    const id = (t as any).id;
    if (teamIds.has(id)) {
      errors.push(`Duplicate team id: "${id}".`);
    }
    teamIds.add(id);
  }

  const pairIds = new Set<string>();
  const seedsByTeam = new Map<string, Set<SeedLevel>>();

  for (const p of pairs) {
    if (typeof p !== 'object' || p === null) {
      errors.push('Each pair must be an object.');
      continue;
    }
    const pair = p as Record<string, unknown>;

    if (typeof pair['id'] !== 'string') {
      errors.push('Each pair must have a string "id".');
      continue;
    }
    if (pairIds.has(pair['id'] as string)) {
      errors.push(`Duplicate pair id: "${pair['id']}".`);
    }
    pairIds.add(pair['id'] as string);

    if (typeof pair['team'] !== 'string' || !teamIds.has(pair['team'] as string)) {
      errors.push(`Pair "${pair['id']}" references unknown team "${pair['team']}".`);
    }

    if (![1, 2, 3].includes(pair['seed'] as number)) {
      errors.push(`Pair "${pair['id']}" has invalid seed "${pair['seed']}" (must be 1, 2, or 3).`);
    }

    if (pair['type'] !== 'XD' && pair['type'] !== 'WD') {
      errors.push(`Pair "${pair['id']}" has invalid type "${pair['type']}" (must be "XD" or "WD").`);
    }

    if (
      !Array.isArray(pair['players']) ||
      pair['players'].length !== 2 ||
      typeof pair['players'][0] !== 'string' ||
      typeof pair['players'][1] !== 'string'
    ) {
      errors.push(`Pair "${pair['id']}" must have a "players" array of exactly 2 strings.`);
    }

    if (typeof pair['voided'] !== 'boolean') {
      errors.push(`Pair "${pair['id']}" must have a boolean "voided" field.`);
    }

    const team = pair['team'] as string;
    const seed = pair['seed'] as SeedLevel;
    if (!seedsByTeam.has(team)) {
      seedsByTeam.set(team, new Set());
    }
    seedsByTeam.get(team)!.add(seed);
  }

  // Every team must have exactly pairs at seeds 1, 2, and 3 — no gaps, no duplicates within a team
  for (const teamId of teamIds) {
    const seeds = seedsByTeam.get(teamId);
    if (!seeds || seeds.size !== 3 || !seeds.has(1) || !seeds.has(2) || !seeds.has(3)) {
      errors.push(`Team "${teamId}" must have exactly one pair at each of seed 1, 2, and 3.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
