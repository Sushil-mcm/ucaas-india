/* Break reasons: company-wide, admin-defined, Lunch and Break built in.
 *
 * Stored as one company-settings section (`break_reasons`). The list is the
 * same for every queue and campaign - established platforms keep it at the
 * company level too, because a reason is about the person, not the queue.
 * `limit_minutes` is a SOFT limit: the agent sees the clock go amber and
 * the supervisor sees "over by N"; nothing forces the state. */

export const BREAK_REASONS_SECTION = 'break_reasons';

/* Activity codes (11 Sep 2026). A break reason grew into an activity code:
   the same row the chip offers and the report counts, plus what the
   workforce layer needs to schedule it and to count shrinkage. The queue
   picker keeps reading the same status words; only the vocabulary here grew. */
export type ActivityCategory = 'break' | 'meal' | 'meeting' | 'training' | 'time_off' | 'unavailable' | 'off_queue_work';

export const ACTIVITY_CATEGORIES: Array<{ key: ActivityCategory; label: string; paid: boolean; work: boolean; shrinkage: 'planned' | 'unplanned' | null }> = [
  { key: 'break', label: 'Break', paid: true, work: false, shrinkage: 'planned' },
  { key: 'meal', label: 'Meal', paid: false, work: false, shrinkage: 'planned' },
  { key: 'meeting', label: 'Meeting', paid: true, work: true, shrinkage: 'planned' },
  { key: 'training', label: 'Training', paid: true, work: true, shrinkage: 'planned' },
  { key: 'off_queue_work', label: 'Off-queue work', paid: true, work: true, shrinkage: null },
  { key: 'time_off', label: 'Time off', paid: false, work: false, shrinkage: 'planned' },
  { key: 'unavailable', label: 'Unavailable', paid: false, work: false, shrinkage: 'unplanned' },
];

export const categoryOf = (key: unknown): (typeof ACTIVITY_CATEGORIES)[number] =>
  ACTIVITY_CATEGORIES.find((c) => c.key === String(key ?? '')) || ACTIVITY_CATEGORIES[0];

export interface BreakReason {
  id: string;
  name: string;
  /* Soft limit in minutes; null = no limit. */
  limit_minutes: number | null;
  /* Optional soft cap on how many times a day; null = no cap. */
  max_per_day: number | null;
  built_in: boolean;
  /* Activity-code fields. Older rows have none: the category's defaults apply. */
  category: ActivityCategory;
  paid: boolean;
  counts_as_work: boolean;
  shrinkage: 'planned' | 'unplanned' | null;
  /* Whether an agent may pick it on the chip; scheduled-only codes (training,
     meetings) are placed by a schedule instead. */
  agent_may_pick: boolean;
}

export interface BreakReasonsSettings {
  schema_version: 1 | 2;
  reasons: BreakReason[];
}

export const BUILT_IN_REASONS: BreakReason[] = [
  { id: 'break', name: 'Break', limit_minutes: 15, max_per_day: null, built_in: true, category: 'break', paid: true, counts_as_work: false, shrinkage: 'planned', agent_may_pick: true },
  { id: 'lunch', name: 'Lunch', limit_minutes: 30, max_per_day: 1, built_in: true, category: 'meal', paid: false, counts_as_work: false, shrinkage: 'planned', agent_may_pick: true },
];

export const LIMIT_RANGE = { min: 1, max: 240 };

/* Read whatever the section holds and make it a full, sane list: the built-in
   two are always present (renaming them is fine, deleting is not), custom ones
   keep their order, limits are clamped. */
export const normaliseBreakReasons = (raw: unknown): BreakReasonsSettings => {
  const list = Array.isArray((raw as any)?.reasons) ? (raw as any).reasons : [];
  const seen = new Set<string>();
  const reasons: BreakReason[] = [];
  const push = (r: any, builtIn: boolean) => {
    const id = String(r?.id ?? '').trim();
    const name = String(r?.name ?? '').trim().slice(0, 50);
    if (!id || !name || seen.has(id)) return;
    seen.add(id);
    const limit = Number(r?.limit_minutes);
    const max = Number(r?.max_per_day);
    const category = ACTIVITY_CATEGORIES.some((c) => c.key === r?.category) ? (r.category as ActivityCategory) : builtIn && id === 'lunch' ? 'meal' : 'break';
    const defaults = categoryOf(category);
    reasons.push({
      id,
      name,
      category,
      paid: typeof r?.paid === 'boolean' ? r.paid : defaults.paid,
      counts_as_work: typeof r?.counts_as_work === 'boolean' ? r.counts_as_work : defaults.work,
      shrinkage: r?.shrinkage === 'planned' || r?.shrinkage === 'unplanned' ? r.shrinkage : r?.shrinkage === null ? null : defaults.shrinkage,
      agent_may_pick: typeof r?.agent_may_pick === 'boolean' ? r.agent_may_pick : true,
      limit_minutes:
        Number.isFinite(limit) && limit > 0
          ? Math.max(LIMIT_RANGE.min, Math.min(LIMIT_RANGE.max, Math.round(limit)))
          : null,
      max_per_day: Number.isFinite(max) && max > 0 ? Math.min(20, Math.round(max)) : null,
      built_in: builtIn,
    });
  };
  for (const builtIn of BUILT_IN_REASONS) {
    const stored = list.find((r: any) => String(r?.id ?? '') === builtIn.id);
    push(stored ? { ...builtIn, ...stored } : builtIn, true);
  }
  for (const r of list) {
    if (!BUILT_IN_REASONS.some((b) => b.id === String(r?.id ?? ''))) push(r, false);
  }
  return { schema_version: 2, reasons };
};

export const newReasonId = (name: string, existing: BreakReason[]): string => {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'reason';
  let id = base;
  let n = 2;
  while (existing.some((r) => r.id === id)) id = `${base}-${n++}`;
  return id;
};

/** What the chip offers: codes an agent may pick themselves. */
export const pickableReasons = (reasons: BreakReason[]): BreakReason[] => reasons.filter((r) => r.agent_may_pick !== false);

/** reason_id → category label, for the breaks report. */
export const categoryLabels = (reasons: BreakReason[]): Record<string, string> =>
  Object.fromEntries(reasons.map((r) => [r.id, categoryOf(r.category).label]));
