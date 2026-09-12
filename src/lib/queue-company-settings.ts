/* The company-wide queue settings section (`queue` in company_settings).
 *
 * One key today: how long a person whose last browser session dropped keeps
 * their duty before the queues sign them out. The section is saved whole,
 * so a save must start from what is stored and change only its own key -
 * another screen may own other keys in the same section tomorrow. */

export const QUEUE_SECTION = 'queue';

export const GRACE_RANGE = { min: 15, max: 86400, default: 60 };

export interface QueueCompanySettings {
  /* Seconds; null = not set, the platform default (60) applies. */
  disconnect_grace_seconds: number | null;
}

/* Whatever the section holds, read as a number of seconds or null. */
export const readGraceSeconds = (raw: unknown): number | null => {
  const value = (raw as any)?.disconnect_grace_seconds;
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(GRACE_RANGE.min, Math.min(GRACE_RANGE.max, Math.round(n)));
};

/* The section to save: everything already stored, with only the grace changed. */
export const mergeQueueSettings = (
  existing: unknown,
  patch: Partial<QueueCompanySettings>,
): Record<string, unknown> => {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  if ('disconnect_grace_seconds' in patch) {
    base.disconnect_grace_seconds = readGraceSeconds({
      disconnect_grace_seconds: patch.disconnect_grace_seconds,
    });
  }
  return base;
};

/* "1 minute", "2 minutes 30 seconds", "45 seconds". */
export const describeGrace = (seconds: number | null): string => {
  const s = seconds ?? GRACE_RANGE.default;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  const parts: string[] = [];
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  if (rest || !m) parts.push(`${rest} second${rest === 1 ? '' : 's'}`);
  return parts.join(' ');
};
