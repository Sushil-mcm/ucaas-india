/**
 * The service-level series - by hour or by day, per queue, from totals - as
 * the report endpoint returns it, plus the small amount of arithmetic the
 * screens do on top of it.
 *
 * The one rule this file exists to enforce: a service level for several
 * queues, or for several hours, is computed from the summed counts, never by
 * averaging the percentages. A queue that took 2 calls at 100% and 200 calls
 * at 40% did not run at 70%. The dashboard tile used to do exactly that
 * averaging; every figure derived here goes through `serviceLevelOf` instead.
 */
import { SERVICE_LEVEL_DEFAULTS, type ServiceLevelTarget } from '@/lib/queue-service-target';

export type SeriesGranularity = 'hour' | 'day';

export type SeriesTarget = {
  percent: number;
  seconds: number;
  short_abandon_seconds: number;
};

export type SeriesCounts = {
  offered: number;
  answered: number;
  /** Answered calls whose wait was recorded - the only ones that can be judged. */
  answered_measured: number;
  answered_unmeasured: number;
  answered_within_target: number;
  answered_wait_total: number;
  abandoned: number;
  short_abandons: number;
  voicemail: number;
  /** Callers the queue sent on - voicemail, menu, extension, timeout - rather
   *  than served or lost. In offered, out of abandoned and out of SL %.
   *  Absent from a server built before the count existed. */
  flow_outs?: number;
};

export type SeriesMeasures = {
  service_level_percent: number | null;
  /** @deprecated alias of service_level_percent; gone next release. */
  sla_within_20_sec_percent?: number | null;
  abandon_percent: number | null;
  asa_seconds: number | null;
  /** Historical buckets have no live queue; always 0 from the report. */
  waiting: number;
};

export type SeriesBucket = { bucket: string } & SeriesCounts & SeriesMeasures;

export type QueueSeries = {
  queue_uuid: string;
  /** Added by the gateway so a screen need not fetch the queue list again. */
  queue_name?: string;
  target: SeriesTarget;
  totals: SeriesCounts & SeriesMeasures;
  series: SeriesBucket[];
};

export type QueueSeriesResponse = {
  granularity: SeriesGranularity;
  timezone: string;
  from: string;
  to: string;
  buckets: string[];
  queues: QueueSeries[];
  totals: { totals: SeriesCounts & SeriesMeasures; series: SeriesBucket[] } | null;
};

/** The counts a service level needs, whatever produced them. */
export type ServiceLevelCounts = {
  answeredWithinTarget: number;
  answeredMeasured: number;
  abandoned: number;
};

export const emptyServiceLevelCounts = (): ServiceLevelCounts => ({
  answeredWithinTarget: 0,
  answeredMeasured: 0,
  abandoned: 0,
});

export const addServiceLevelCounts = (
  into: ServiceLevelCounts,
  add: Partial<ServiceLevelCounts>,
): ServiceLevelCounts => {
  into.answeredWithinTarget += add.answeredWithinTarget || 0;
  into.answeredMeasured += add.answeredMeasured || 0;
  into.abandoned += add.abandoned || 0;
  return into;
};

/**
 * Answered within target over the calls that could be judged: answered calls
 * with a recorded wait, plus abandons beyond the short-abandon floor. Null
 * when there is nothing to judge - "no data" is not "0%".
 */
export const serviceLevelOf = (counts: ServiceLevelCounts): number | null => {
  const judged = counts.answeredMeasured + counts.abandoned;
  return judged ? (counts.answeredWithinTarget / judged) * 100 : null;
};

export const countsOfSeries = (row: SeriesCounts): ServiceLevelCounts => ({
  answeredWithinTarget: row.answered_within_target,
  answeredMeasured: row.answered_measured,
  abandoned: row.abandoned,
});

export type TargetSummary = {
  /** What the tile says under the figure. */
  text: string;
  /** The percent every selected queue agreed on, or null when they differ. */
  percent: number | null;
  /** The seconds every selected queue agreed on, or null when they differ. */
  seconds: number | null;
  /** True when at least two queues are measured against different numbers. */
  differ: boolean;
};

const distinct = (values: number[]) => Array.from(new Set(values));

/**
 * One line of target text for a set of queues. "80% within 20 s" when they
 * all ask for the same thing (or none set anything and the platform default
 * applies to all); "per-queue targets" when they do not, because quoting one
 * number over a figure measured against several would be a lie.
 */
export const describeTargets = (
  targets: Array<Pick<ServiceLevelTarget, 'percent' | 'seconds'> | SeriesTarget>,
): TargetSummary => {
  const percents = distinct(
    targets.map((target) =>
      target.percent === null || target.percent === undefined
        ? SERVICE_LEVEL_DEFAULTS.percent
        : target.percent,
    ),
  );
  const seconds = distinct(
    targets.map((target) => target.seconds ?? SERVICE_LEVEL_DEFAULTS.seconds),
  );
  if (!targets.length) {
    return {
      text: `${SERVICE_LEVEL_DEFAULTS.percent}% within ${SERVICE_LEVEL_DEFAULTS.seconds} s`,
      percent: SERVICE_LEVEL_DEFAULTS.percent,
      seconds: SERVICE_LEVEL_DEFAULTS.seconds,
      differ: false,
    };
  }
  if (percents.length === 1 && seconds.length === 1) {
    return {
      text: `${percents[0]}% within ${seconds[0]} s`,
      percent: percents[0],
      seconds: seconds[0],
      differ: false,
    };
  }
  return {
    text: 'per-queue targets',
    percent: percents.length === 1 ? percents[0] : null,
    seconds: seconds.length === 1 ? seconds[0] : null,
    differ: true,
  };
};

/** "Sep 03, 14:00" for an hour bucket, "Wed, Sep 03" for a day. */
export const bucketLabel = (bucket: string, granularity: SeriesGranularity): string => {
  const [date, time] = bucket.split(' ');
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return bucket;
  const when = new Date(year, month - 1, day);
  const dayText = when.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
  if (granularity === 'hour') return `${dayText} ${time || ''}`.trim();
  return `${when.toLocaleDateString(undefined, { weekday: 'short' })}, ${dayText}`;
};

/**
 * How a service level reads against its goal: at or above the goal is good,
 * within twenty points under it is a warning, further is bad. With no common
 * goal (per-queue targets) the platform default stands in for the colour
 * only - the text beside it already says the targets differ.
 */
export const serviceLevelBand = (
  percent: number | null,
  targetPercent: number | null,
): 'good' | 'warn' | 'bad' | null => {
  if (percent === null) return null;
  const goal = targetPercent ?? SERVICE_LEVEL_DEFAULTS.percent;
  if (percent >= goal) return 'good';
  if (percent >= goal - 20) return 'warn';
  return 'bad';
};
