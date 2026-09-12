/**
 * The campaign's calendar, kept in the campaign's own timezone.
 *
 * A campaign runs in one zone (settings.operational_hours.regional.timezone)
 * and the server stores its start and end as midnight in that zone. The
 * wizard used to fill the dates from the browser's clock: a person in India
 * creating a New York campaign after their own midnight got "tomorrow" in
 * New York, and the campaign sat paused "Before the campaign start date"
 * until the next day (live test, 9 Sep 2026, campaign 215c).
 *
 * Everything here is pure - hand it a zone and an instant, get strings back -
 * so the rule is testable without a browser. Dates are 'YYYY-MM-DD'.
 */
import moment from 'moment';

const DAY = 'YYYY-MM-DD';

const isDay = (value: unknown): value is string => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

/** The calendar day of `now` in `timezone`; the browser's own day when the zone is missing or unknown. */
export const dayIn = (timezone: string | null | undefined, now: Date = new Date()): string => {
  const zone = String(timezone || '').trim();
  if (zone) {
    try {
      /* en-CA writes YYYY-MM-DD, which is what a date input and the API want. */
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
    } catch {
      /* unknown zone: fall through to the browser's day */
    }
  }
  return moment(now).format(DAY);
};

/** What a new campaign starts with: today in its zone, ending a month later. */
export const defaultCampaignDates = (
  timezone: string | null | undefined,
  now: Date = new Date(),
): { startDate: string; endDate: string } => {
  const startDate = dayIn(timezone, now);
  return { startDate, endDate: moment(startDate, DAY).add(1, 'month').format(DAY) };
};

/**
 * What the wizard should do with its dates when the campaign's zone settles
 * or changes: move them to "today in that zone" - unless the person has
 * already typed a date (theirs stands), the campaign already exists (what it
 * saved stands), or no zone is chosen yet. Returns null when nothing should
 * move, so the caller writes only when a value actually differs.
 */
export const followZoneDates = (
  state: {
    isEditMode?: boolean;
    timezone?: string | null;
    datesTouched?: boolean;
    startDate?: string | null;
    endDate?: string | null;
  },
  now: Date = new Date(),
): { startDate: string; endDate: string } | null => {
  const zone = String(state.timezone || '').trim();
  if (state.isEditMode || !zone || state.datesTouched) return null;
  const next = defaultCampaignDates(zone, now);
  if (state.startDate === next.startDate && state.endDate === next.endDate) return null;
  return next;
};

/**
 * A stored campaign date read back as the day it was saved as. The server
 * keeps midnight in the campaign's zone as a UTC instant; formatting that
 * instant in the browser's zone shows the day before for anyone west of the
 * campaign. Without a zone the old behaviour (the browser's day) stands.
 */
export const storedDay = (
  value: string | Date | null | undefined,
  timezone: string | null | undefined,
): string => {
  if (!value) return '';
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return '';
  if (String(timezone || '').trim()) return dayIn(timezone, instant);
  return moment(instant).format(DAY);
};

/** Calendar days from start to end, both included; 0 when either is missing or the order is wrong. */
export const windowDayCount = (start: unknown, end: unknown): number => {
  if (!isDay(start) || !isDay(end)) return 0;
  const days = moment(end, DAY).diff(moment(start, DAY), 'days') + 1;
  return days > 0 ? days : 0;
};

const WEEKDAY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Days in the window on which the campaign may call: a day counts when its
 * weekday is switched on in the hours grid. A grid with nothing switched on
 * counts nothing, which is what the screen should say too.
 */
export const callingDayCount = (
  start: unknown,
  end: unknown,
  hours: Record<string, { open?: boolean }> | null | undefined,
): number => {
  const total = windowDayCount(start, end);
  if (!total) return 0;
  const open = new Set(
    Object.entries(hours || {})
      .filter(([, day]) => day && day.open !== false && day.open !== undefined)
      .map(([name]) => name.toLowerCase()),
  );
  if (!open.size) return 0;
  let count = 0;
  const cursor = moment(start as string, DAY);
  for (let i = 0; i < total; i += 1) {
    if (open.has(WEEKDAY[cursor.day()])) count += 1;
    cursor.add(1, 'day');
  }
  return count;
};

/** "31 days · 23 calling days", for the chip beside the dates. */
export const describeWindow = (
  start: unknown,
  end: unknown,
  hours: Record<string, { open?: boolean }> | null | undefined,
): string => {
  const total = windowDayCount(start, end);
  if (!total) return '0 days';
  const calling = callingDayCount(start, end, hours);
  return `${total} ${total === 1 ? 'day' : 'days'} · ${calling} calling`;
};

export type ReportWindow = { from: string; to: string; timezone: string };

const browserZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/**
 * The days a campaign's call-log figures cover, in the campaign's own zone.
 *
 * From the campaign's start (never more than 93 days back, the report's
 * limit) to today - or, for a campaign that has finished, to the day it
 * finished, so a completed campaign reads as its run and not "up to today in
 * the viewer's zone" (row #12, 9 Sep: the card said "today in Asia/Calcutta"
 * for a New York campaign). Days are the campaign's zone because that is how
 * the report groups them; the viewer's zone was used before, so the same
 * campaign showed different days to people in different places.
 */
export const reportWindowFor = (
  campaign?: {
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    campaignStatus?: string | null;
    updatedAt?: string | Date | null;
    timezone?: string | null;
  } | null,
  now: Date = new Date(),
): ReportWindow => {
  const timezone = String(campaign?.timezone || '').trim() || browserZone();
  const today = dayIn(timezone, now);
  const earliest = moment(today, DAY).subtract(92, 'days');
  const startDay = storedDay(campaign?.startDate, timezone);
  const start = startDay ? moment(startDay, DAY) : null;
  const from = start && start.isValid() && start.isAfter(earliest) ? start : earliest;

  let to = moment(today, DAY);
  const status = String(campaign?.campaignStatus || '').toUpperCase();
  if (status === 'COMPLETED' || status === 'COMPLETE') {
    /* The finish is the completion write (updatedAt) or the planned end,
       whichever came first; a campaign edited after it finished still ends
       on its end date. Never after today, never before it began. */
    const doneDay = campaign?.updatedAt ? dayIn(timezone, new Date(campaign.updatedAt)) : '';
    const endDay = storedDay(campaign?.endDate, timezone);
    [doneDay, endDay]
      .filter((day) => isDay(day))
      .forEach((day) => {
        const candidate = moment(day, DAY);
        if (candidate.isBefore(to)) to = candidate;
      });
  }
  if (to.isBefore(from)) to = from.clone();
  return { from: from.format(DAY), to: to.format(DAY), timezone };
};
