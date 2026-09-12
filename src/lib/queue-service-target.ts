/**
 * A queue's answering target, read from its own settings.
 *
 * The target lives at `settings.after_call.service_level` and is already
 * honoured end to end: the gateway sends each queue's seconds to the call-log
 * report, which measures every queue against its own number. This module is
 * the one place the website reads that block, so Performance, the Queue report
 * and the editor cannot disagree about what "the target" is for a given queue.
 *
 * Two defaults are deliberate and match the platform:
 *
 *   - 80% in 20 seconds is the long-standing contact-centre convention and is
 *     what the report falls back to when a queue has not set a target. A queue
 *     with the switch off is therefore measured against 20s, not against
 *     nothing — the same rule the report applies server-side.
 *   - A hang-up inside 5 seconds is a misdial or a wrong number, not a customer
 *     giving up. Reports set those aside so they neither count against the
 *     centre nor pad out its totals. The floor is a queue's to change, because
 *     a sales line and a crisis line do not mean the same thing by "too quick".
 *
 * Settings arrive as an object from some endpoints and as a JSON string from
 * others; both are accepted here so a change of shape breaks one function.
 */

export const SERVICE_LEVEL_DEFAULTS = {
  percent: 80,
  seconds: 20,
  shortAbandonSeconds: 5,
} as const;

/** Bounds shared with the editor and the report: a target of 0 means "not set". */
export const SERVICE_LEVEL_LIMITS = {
  percent: { min: 1, max: 100 },
  seconds: { min: 1, max: 3600 },
  shortAbandon: { min: 0, max: 60 },
} as const;

export type ServiceLevelTarget = {
  /** Whether the queue asked for its own target. */
  enabled: boolean;
  /** The share of calls the queue wants answered within `seconds`, or null when
      no target was set — there is no goal to compare against, only a measure. */
  percent: number | null;
  /** The seconds every service-level figure for this queue is measured against.
      Always a usable number: the platform default stands in when none is set. */
  seconds: number;
  /** Hang-ups faster than this are left out of abandonment and service level. */
  shortAbandonSeconds: number;
};

export const readQueueSettings = (rowOrSettings: any): any => {
  const raw =
    rowOrSettings && typeof rowOrSettings === 'object' && 'settings' in rowOrSettings
      ? rowOrSettings.settings
      : rowOrSettings;
  if (!raw) return {};
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
};

const within = (value: unknown, min: number, max: number): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n >= min && n <= max ? Math.floor(n) : null;
};

export const serviceLevelTargetOf = (rowOrSettings: any): ServiceLevelTarget => {
  const level = readQueueSettings(rowOrSettings)?.after_call?.service_level || {};
  const enabled = Boolean(level?.enabled);
  const percent = within(level?.percent, SERVICE_LEVEL_LIMITS.percent.min, SERVICE_LEVEL_LIMITS.percent.max);
  const seconds = within(level?.seconds, SERVICE_LEVEL_LIMITS.seconds.min, SERVICE_LEVEL_LIMITS.seconds.max);
  // The floor applies whether or not a target is set: a misdial is a misdial.
  const floor = within(
    level?.short_abandon_seconds,
    SERVICE_LEVEL_LIMITS.shortAbandon.min,
    SERVICE_LEVEL_LIMITS.shortAbandon.max,
  );

  return {
    enabled,
    percent: enabled ? percent : null,
    seconds: enabled && seconds !== null ? seconds : SERVICE_LEVEL_DEFAULTS.seconds,
    shortAbandonSeconds: floor ?? SERVICE_LEVEL_DEFAULTS.shortAbandonSeconds,
  };
};

/** Every queue's target, keyed by queue uuid, from a queue-list response. */
export const serviceLevelTargetsByUuid = (queueRows: any[]): Record<string, ServiceLevelTarget> => {
  const map: Record<string, ServiceLevelTarget> = {};
  (Array.isArray(queueRows) ? queueRows : []).forEach((row) => {
    const uuid = String(row?.uuid || '').trim();
    if (uuid) map[uuid] = serviceLevelTargetOf(row);
  });
  return map;
};

export default serviceLevelTargetOf;
