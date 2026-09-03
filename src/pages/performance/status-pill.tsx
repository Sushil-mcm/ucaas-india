import type { ReactNode } from 'react';

/**
 * A colour is faster to scan across 5 rows than 5 numbers are to read —
 * this is what turns Service level / Abandon into something a supervisor
 * can triage at a glance instead of reading each cell.
 */
export type PillTone = 'pos' | 'warn' | 'neg' | 'neu';

export const slaPillTone = (sla: number | null): PillTone => {
  if (sla === null) return 'neu';
  if (sla >= 80) return 'pos';
  if (sla >= 60) return 'warn';
  return 'neg';
};

export const abandonPillTone = (abandonPercent: number | null): PillTone => {
  if (abandonPercent === null) return 'neu';
  if (abandonPercent <= 5) return 'pos';
  if (abandonPercent <= 15) return 'warn';
  return 'neg';
};

/** `row.abandonRate` arrives pre-formatted ("17%" or "—") since it's shared
 *  with the table's plain-text rendering — this reads the number back out
 *  so the same value can also drive a pill's colour. */
export const parsePercent = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const StatusPill = ({ tone, children }: { tone: PillTone; children: ReactNode }) => (
  <span className={`tag ${tone}`} style={{ fontSize: 11.5, padding: '2px 8px' }}>
    {children}
  </span>
);

export default StatusPill;
