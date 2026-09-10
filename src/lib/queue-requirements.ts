/* Skill requirements on a queue, one row per category.
 *
 * The rules the queue picker applies (backend-patches/queue-agent-service/
 * patch_skill_categories.py), mirrored here so the Routing tab, the Members
 * tab and the ring preview say exactly what the picker will do:
 *
 *   qualify  every row must be met - inside a row any one skill (or all of
 *            them when the row says ALL) at that row's bar;
 *   score    per row, the person's best star among the row's skills (the sum
 *            for ALL) times the row's weight, added up; "best_first" rings
 *            the top score first, "fair" leaves the ring strategy's order;
 *   relax    each row on its own clock - never, one star after N seconds,
 *            dropped after N, or one star after N then dropped after 2N.
 *            "ladder" follows the ring's own widening, one notch per round,
 *            which is what the old flat list always did.
 *
 * A queue with no rows but a flat required_skills list is one ladder row. */

export type RelaxTo = 'never' | 'one_star' | 'drop' | 'one_star_then_drop' | 'ladder';
export type RowMatch = 'ALL' | 'ANY';
export type RoutingOrder = 'best_first' | 'fair';

export interface RequirementRow {
  category_id: string;
  category_name: string;
  skill_ids: string[];
  min_stars: number;
  match: RowMatch;
  weight: number;
  relax: { after_seconds: number; to: RelaxTo };
}

export interface QueueRouting {
  required_skills: string[];
  min_stars: number;
  evaluation: RowMatch;
  /* 1-10 between queues that share people; 5 when unset. */
  priority?: number;
  requirements?: RequirementRow[];
  order?: RoutingOrder;
}

export interface RatedStars {
  skill_id: string;
  stars: number;
}

export const RELAX_MODES: RelaxTo[] = ['never', 'one_star', 'drop', 'one_star_then_drop', 'ladder'];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const dedupe = (ids: unknown[]) =>
  Array.from(new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean)));

export const normaliseRow = (raw: any): RequirementRow | null => {
  if (!raw || typeof raw !== 'object') return null;
  const ids = dedupe(Array.isArray(raw.skill_ids) ? raw.skill_ids : Array.isArray(raw.skills) ? raw.skills : []);
  if (!ids.length) return null;
  const relax = raw.relax && typeof raw.relax === 'object' ? raw.relax : {};
  const to = RELAX_MODES.includes(relax.to) ? (relax.to as RelaxTo) : 'never';
  return {
    category_id: String(raw.category_id ?? ''),
    category_name: String(raw.category_name ?? ''),
    skill_ids: ids,
    min_stars: clamp(Math.round(Number(raw.min_stars)) || 1, 1, 5),
    match: String(raw.match ?? 'ANY').toUpperCase() === 'ALL' ? 'ALL' : 'ANY',
    weight: clamp(Math.round(Number(raw.weight)) || 1, 1, 5),
    relax: { after_seconds: Math.max(0, Math.round(Number(relax.after_seconds)) || 0), to },
  };
};

export const normaliseRows = (raw: unknown): RequirementRow[] =>
  Array.isArray(raw) ? (raw.map(normaliseRow).filter(Boolean) as RequirementRow[]) : [];

/* The rows the picker evaluates: the list when it has any, else the flat
   legacy fields as one row that follows the ring's own widening. */
export const effectiveRows = (routing: Partial<QueueRouting> | undefined | null): RequirementRow[] => {
  const rows = normaliseRows(routing?.requirements);
  if (rows.length) return rows;
  const required = dedupe(Array.isArray(routing?.required_skills) ? routing!.required_skills : []);
  if (!required.length) return [];
  return [
    {
      category_id: '',
      category_name: '',
      skill_ids: required,
      min_stars: clamp(Number(routing?.min_stars) || 1, 1, 5),
      match: routing?.evaluation === 'ANY' ? 'ANY' : 'ALL',
      weight: 1,
      relax: { after_seconds: 0, to: 'ladder' },
    },
  ];
};

/* The flat fields an older picker reads, written beside the rows so a clone
   that has not been patched still asks for the skills at the lowest bar. */
export const legacyFromRows = (rows: RequirementRow[]) => ({
  required_skills: dedupe(rows.flatMap((r) => r.skill_ids)),
  min_stars: rows.length ? Math.min(...rows.map((r) => r.min_stars)) : 1,
  evaluation: 'ALL' as RowMatch,
});

/* The bars a ladder row passes through as the ring widens. */
export const skillStages = (minStars: number): number[] => {
  const stages = [clamp(minStars || 1, 1, 5)];
  if (stages[0] > 1) stages.push(1);
  stages.push(0);
  return stages;
};

export interface Moment {
  /* Widening round, 0-based, and seconds waited. */
  round: number;
  waited: number;
  widen: boolean;
}

/* The lowest rating a row asks for at this moment; 0 once it has relaxed away. */
export const rowBar = (row: RequirementRow, at: Moment): number => {
  const floor = row.min_stars;
  if (row.relax.to === 'ladder') {
    if (!at.widen) return floor;
    const stages = skillStages(floor);
    return stages[Math.min(at.round, stages.length - 1)];
  }
  if (row.relax.to === 'never') return floor;
  const after = row.relax.after_seconds;
  if (at.waited < after) return floor;
  if (row.relax.to === 'one_star') return 1;
  if (row.relax.to === 'drop') return 0;
  return at.waited < 2 * after ? 1 : 0;
};

export const STRICT: Moment = { round: 0, waited: 0, widen: false };

export const starsOf = (rated: RatedStars[] | undefined): Map<string, number> =>
  new Map((rated || []).map((r) => [String(r.skill_id), Number(r.stars) || 0]));

export const rowHolds = (stars: Map<string, number>, row: RequirementRow, bar: number): boolean => {
  if (bar <= 0) return true;
  const hits = row.skill_ids.map((id) => (stars.get(id) || 0) >= bar);
  return row.match === 'ALL' ? hits.every(Boolean) : hits.some(Boolean);
};

export const rowScore = (stars: Map<string, number>, row: RequirementRow): number => {
  const values = row.skill_ids.map((id) => stars.get(id) || 0);
  const base = row.match === 'ALL' ? values.reduce((a, b) => a + b, 0) : Math.max(0, ...values);
  return base * row.weight;
};

/* Whether a person meets every row at the given moment. No rows: everybody. */
export const holdsRows = (rated: RatedStars[] | undefined, rows: RequirementRow[], at: Moment = STRICT): boolean => {
  const stars = starsOf(rated);
  return rows.every((row) => rowHolds(stars, row, rowBar(row, at)));
};

export const rowsScore = (rated: RatedStars[] | undefined, rows: RequirementRow[], at: Moment = STRICT): number => {
  const stars = starsOf(rated);
  return rows.reduce((sum, row) => sum + (rowBar(row, at) > 0 ? rowScore(stars, row) : 0), 0);
};

/* 0..1: how strongly a person fits, for ordering the preview. */
export const rowsFit = (rated: RatedStars[] | undefined, rows: RequirementRow[]): number => {
  if (!rows.length) return 1;
  const top = rows.reduce((sum, row) => sum + 5 * row.weight * (row.match === 'ALL' ? row.skill_ids.length : 1), 0);
  return top > 0 ? clamp(rowsScore(rated, rows) / top, 0, 1) : 0;
};

/* 2 = meets every row at its bar, 1 = holds every row's skills at one star
   or more, 0 = does not. The rows relax from 2 towards 0 as the caller waits. */
export const rowsStage = (rated: RatedStars[] | undefined, rows: RequirementRow[]): 0 | 1 | 2 => {
  if (!rows.length) return 2;
  if (holdsRows(rated, rows)) return 2;
  const stars = starsOf(rated);
  return rows.every((row) => rowHolds(stars, row, 1)) ? 1 : 0;
};

/* Which rows a person fails at the strict bar, for the Members tab. */
export const failingRows = (rated: RatedStars[] | undefined, rows: RequirementRow[]): RequirementRow[] => {
  const stars = starsOf(rated);
  return rows.filter((row) => !rowHolds(stars, row, row.min_stars));
};

/* One sentence per row about its clock, for the editor. */
export const describeRelax = (row: RequirementRow): string => {
  const after = row.relax.after_seconds;
  switch (row.relax.to) {
    case 'never':
      return 'Holds for the whole wait.';
    case 'one_star':
      return `Drops to 1 star after ${after}s, then holds.`;
    case 'drop':
      return `Dropped after ${after}s.`;
    case 'one_star_then_drop':
      return `Drops to 1 star after ${after}s, dropped after ${2 * after}s.`;
    case 'ladder':
      return skillStages(row.min_stars).length > 2
        ? 'Follows the ring: one notch lower each round, then dropped.'
        : 'Follows the ring: dropped from the second round.';
  }
  return '';
};

export interface LadderRound {
  round: number;
  fromSeconds: number;
  tiersUpTo: number;
  /* The bar of each row this round, in row order; 0 = dropped. */
  bars: number[];
}

/* The rounds a widening queue goes through: each round adds the next tier
   and moves every ladder row one notch. Rows on their own clock are shown at
   the round's starting second. Mirrors decide_ring() in the picker. */
export const widenLadder = ({
  tiers,
  rows,
  widenAfterSeconds,
}: {
  tiers: number[];
  rows: RequirementRow[];
  widenAfterSeconds: number;
}): LadderRound[] => {
  const levels = Array.from(new Set(tiers.map((t) => Math.max(1, Number(t) || 1)))).sort((a, b) => a - b);
  if (!levels.length) levels.push(1);
  const ladderLength = Math.max(1, ...rows.filter((r) => r.relax.to === 'ladder').map((r) => skillStages(r.min_stars).length));
  const rounds = Math.max(levels.length, ladderLength);
  const step = Math.max(0, Number(widenAfterSeconds) || 0);
  return Array.from({ length: rounds }, (_, i) => ({
    round: i + 1,
    fromSeconds: i * step,
    tiersUpTo: levels[Math.min(i, levels.length - 1)],
    bars: rows.map((row) => rowBar(row, { round: i, waited: i * step, widen: true })),
  }));
};
