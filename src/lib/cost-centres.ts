/* Splitting the bill between departments, for reporting only.
 *
 * A cost centre is a label a finance team puts on spending so it can be reported
 * against a budget — "SALES", "SUPPORT", "R-AND-D". Somebody's licence might be
 * charged 70% to sales and 30% to support.
 *
 * The single most important thing about them, and the thing that must never be
 * lost: **they change nothing about what is charged.** Not the invoice total,
 * not the tax, not who is billed. They are tags for reporting. Anything that
 * makes them look like they move money is wrong.
 *
 * Three rules do the real work here, and each exists because of how finance
 * teams actually use them:
 *
 *   an allocation totals exactly 100%   a split that adds to 90 means 10% of the
 *                                       spend is unaccounted for, which defeats
 *                                       the purpose of splitting it at all
 *   at most ten parts                   past that nobody can read the report,
 *                                       and the split stops being an answer
 *   the most specific wins              a person's own split beats their
 *                                       licence's, which beats their location's
 *
 * All of it is decidable here, which is why it lives as a plain module with
 * tests rather than inside a form.
 */

export interface CostCentre {
  /* Short code the finance system knows it by. Upper case, because half a
     directory in mixed case will not match anything on the other side. */
  code: string;
  name: string;
  /* Optional: how the customer's own ledger refers to it. */
  externalReference?: string;
  /* Archived centres stay readable on old reports but cannot be newly assigned -
     deleting one would silently rewrite history. */
  archived?: boolean;
}

export interface Allocation {
  code: string;
  /* Whole percent. Fractions of a percent are precision nobody has. */
  percent: number;
}

export type AllocationLevel = 'person' | 'licence' | 'location';

export const MAX_PARTS = 10;
export const CODE_MAX = 20;

/* Alphanumeric, hyphen and underscore only, upper-cased. Anything else tends to
   break the export the finance team pastes into their own system. */
export const normaliseCode = (raw: string): string =>
  String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, CODE_MAX);

export interface CentreProblem {
  field: 'code' | 'name';
  message: string;
}

export const checkCentre = (
  centre: Partial<CostCentre>,
  existing: CostCentre[] = [],
): CentreProblem[] => {
  const problems: CentreProblem[] = [];
  const code = normaliseCode(centre.code ?? '');

  if (!code) {
    problems.push({
      field: 'code',
      message: 'Give it a code. Letters, numbers, hyphens and underscores only.',
    });
  } else if (
    existing.some((c) => c.code === code && c !== (centre as CostCentre))
  ) {
    problems.push({
      field: 'code',
      message: `${code} is already in use. Two centres with one code cannot be told apart on a report.`,
    });
  }

  if (!String(centre.name ?? '').trim()) {
    problems.push({
      field: 'name',
      message: 'Give it a name. The code alone means nothing to anybody reading the report.',
    });
  }

  return problems;
};

export interface AllocationProblem {
  message: string;
  /* True when the split is unusable rather than merely untidy. */
  blocking: boolean;
}

export const checkAllocation = (
  parts: Allocation[],
  directory: CostCentre[] = [],
): AllocationProblem[] => {
  const problems: AllocationProblem[] = [];
  const rows = (parts ?? []).filter((p) => p && p.code);

  /* No split at all is fine - it means "use whatever applies above this". */
  if (rows.length === 0) return problems;

  if (rows.length > MAX_PARTS) {
    problems.push({
      blocking: true,
      message: `Split between at most ${MAX_PARTS}. Past that the report stops being readable.`,
    });
  }

  const total = rows.reduce((sum, p) => sum + (Number(p.percent) || 0), 0);
  if (total !== 100) {
    const off = total > 100 ? total - 100 : 100 - total;
    problems.push({
      blocking: true,
      message:
        total > 100
          ? `This adds up to ${total}%, which is ${off}% more than the spend. Take ${off}% off somewhere.`
          : `This adds up to ${total}%. The remaining ${off}% would not be accounted for anywhere.`,
    });
  }

  const seen = new Set<string>();
  rows.forEach((p) => {
    if (seen.has(p.code)) {
      problems.push({
        blocking: true,
        message: `${p.code} appears twice. Add the two shares together into one line.`,
      });
    }
    seen.add(p.code);
  });

  rows.forEach((p) => {
    if (Number(p.percent) <= 0) {
      problems.push({
        blocking: true,
        message: `${p.code} is set to ${p.percent}%. Remove the line rather than allocating nothing to it.`,
      });
    }
  });

  /* Archived centres can stay on an old allocation - the report still needs to
     read - but assigning to one now is almost always a mistake. */
  rows.forEach((p) => {
    const centre = directory.find((c) => c.code === p.code);
    if (centre?.archived) {
      problems.push({
        blocking: false,
        message: `${p.code} is archived. Old reports still show it, but it is probably not where you want new spend going.`,
      });
    }
  });

  return problems;
};

export const isAllocationUsable = (problems: AllocationProblem[]): boolean =>
  !problems.some((p) => p.blocking);

/* Which split applies to a given person's spend. The most specific one wins:
   their own beats the one on their licence, which beats the one on their
   location. Nothing set anywhere means the spend is simply unallocated, which is
   a real and reportable answer rather than an error. */
export const resolveAllocation = (levels: {
  person?: Allocation[];
  licence?: Allocation[];
  location?: Allocation[];
}): { parts: Allocation[]; from: AllocationLevel | 'none' } => {
  const order: AllocationLevel[] = ['person', 'licence', 'location'];
  for (const level of order) {
    const parts = levels[level];
    if (Array.isArray(parts) && parts.length > 0) {
      return { parts, from: level };
    }
  }
  return { parts: [], from: 'none' };
};

/* Splits an amount across an allocation, in whole pence, with the rounding
   remainder given to the largest share.
   Without that last step the parts do not add back to the total - £10 split
   three ways becomes £9.99 - and a finance team will notice immediately and
   trust none of it. */
export const splitAmount = (
  amount: number,
  parts: Allocation[],
): { code: string; amount: number }[] => {
  const rows = (parts ?? []).filter((p) => p && p.code && Number(p.percent) > 0);
  if (!rows.length || !Number.isFinite(amount)) return [];

  const cents = Math.round(amount * 100);
  const split = rows.map((p) => ({
    code: p.code,
    percent: Number(p.percent),
    cents: Math.floor((cents * Number(p.percent)) / 100),
  }));

  const remainder = cents - split.reduce((s, r) => s + r.cents, 0);
  if (remainder !== 0) {
    const biggest = split.reduce((a, b) => (b.percent > a.percent ? b : a), split[0]);
    biggest.cents += remainder;
  }

  return split.map((r) => ({ code: r.code, amount: r.cents / 100 }));
};
