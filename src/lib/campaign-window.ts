/**
 * Why a campaign is handing an agent nobody.
 *
 * The server has several reasons for returning an empty contact list - the
 * calling window is shut, the campaign only offers consented leads and none
 * has consent, the record just skipped is the only one left - and until now
 * it returned for all of them without a word. The agent saw "Waiting for
 * another contact" and a countdown that promised a call which could never
 * come.
 *
 * Everything here is decidable from the campaign document the agent already
 * has, so it lives in a plain module with tests rather than inside the card.
 * `campaignWindow` is a port of the server's operatingWindow(): same order of
 * checks, same inclusive bounds, so the two never disagree about whether the
 * campaign is open.
 */

export type CampaignWindow = { open: boolean; reason: string; timezone: string };

type DayConfig = { open?: boolean; start?: string; end?: string };

/** Local wall-clock parts of an instant in a zone, without moment-timezone. */
const localParts = (nowUtc: Date, timezone: string) => {
  let zone = timezone;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
    }).formatToParts(nowUtc);
  } catch {
    /* An unknown zone name must not take the whole card down; fall back to UTC
       the way the server's moment does. */
    zone = 'UTC';
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
    }).formatToParts(nowUtc);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  // Some engines print midnight as "24".
  const hour = Number(get('hour')) % 24;
  return {
    timezone: zone,
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: get('weekday').toLowerCase(),
    minutes: hour * 60 + Number(get('minute')),
  };
};

const toMinutes = (hhmm: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const campaignWindow = (campaign: any, nowUtc: Date = new Date()): CampaignWindow => {
  const timezone = String(campaign?.timezone || 'UTC');
  const local = localParts(nowUtc, timezone);

  if (campaign?.startDate && nowUtc.getTime() < new Date(campaign.startDate).getTime()) {
    return { open: false, reason: 'Before the campaign start date.', timezone: local.timezone };
  }
  if (campaign?.endDate && nowUtc.getTime() > new Date(campaign.endDate).getTime()) {
    return { open: false, reason: 'After the campaign end date.', timezone: local.timezone };
  }

  const hours = campaign?.settings?.operational_hours;
  const holidays: string[] = Array.isArray(hours?.holidays) ? hours.holidays : [];
  if (holidays.includes(local.date)) {
    return { open: false, reason: 'Today is a campaign holiday.', timezone: local.timezone };
  }
  if (!hours || !hours.value || typeof hours.value !== 'object') {
    return { open: true, reason: 'No calling hours set; open all day.', timezone: local.timezone };
  }
  const dayConfig: DayConfig | undefined = hours.value[local.weekday];
  const dayName = local.weekday.charAt(0).toUpperCase() + local.weekday.slice(1);
  if (!dayConfig || dayConfig.open === false) {
    return { open: false, reason: `Closed on ${dayName}s.`, timezone: local.timezone };
  }
  if (!dayConfig.start || !dayConfig.end) {
    return { open: true, reason: 'Open all day.', timezone: local.timezone };
  }
  const start = toMinutes(dayConfig.start);
  const end = toMinutes(dayConfig.end);
  if (start === null || end === null) {
    return { open: true, reason: 'Open all day.', timezone: local.timezone };
  }
  if (local.minutes >= start && local.minutes <= end) {
    return { open: true, reason: `Open ${dayConfig.start}-${dayConfig.end}.`, timezone: local.timezone };
  }
  return {
    open: false,
    reason: `Calling hours are ${dayConfig.start}-${dayConfig.end} today.`,
    timezone: local.timezone,
  };
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * When the campaign next opens, in its own timezone, as words: "today at
 * 09:00", "Wednesday at 09:00", or null when no day within a week is open.
 * A day with no start time is open from midnight. Holidays are skipped.
 */
export const nextOpening = (campaign: any, nowUtc: Date = new Date()): string | null => {
  const hours = campaign?.settings?.operational_hours;
  if (!hours || !hours.value || typeof hours.value !== 'object') return 'straight away';
  const timezone = String(campaign?.timezone || 'UTC');
  const local = localParts(nowUtc, timezone);
  const holidays: string[] = Array.isArray(hours.holidays) ? hours.holidays : [];
  const todayIndex = DAY_NAMES.indexOf(local.weekday);
  for (let ahead = 0; ahead <= 7; ahead += 1) {
    const day = DAY_NAMES[(todayIndex + ahead + 7) % 7];
    const config: DayConfig | undefined = hours.value[day];
    if (!config || config.open === false) continue;
    const start = config.start && toMinutes(config.start) !== null ? config.start : '00:00';
    const startMinutes = toMinutes(start) ?? 0;
    if (ahead === 0) {
      if (holidays.includes(local.date)) continue;
      if (local.minutes < startMinutes) return `today at ${start}`;
      continue;
    }
    const date = new Date(nowUtc.getTime() + ahead * 86_400_000);
    if (holidays.includes(localParts(date, timezone).date)) continue;
    return `${ahead === 1 ? 'tomorrow' : capital(day)} at ${start}`;
  }
  return null;
};

export type HoursNotice = { title: string; text: string };

/**
 * The popup when the dialer engine stops a campaign for its calling hours
 * (campaign-state-update with pausedBy HOURS), or the browser refuses a
 * preview call outside them. One sentence on what happened, one on what
 * happens next.
 */
export const hoursStopNotice = (campaign: any, nowUtc: Date = new Date()): HoursNotice => {
  const name = String(campaign?.name || 'This campaign');
  const timezone = String(campaign?.timezone || 'UTC');
  const reason = String(campaign?.pausedReason || campaignWindow(campaign, nowUtc).reason || '')
    .replace(/\.$/, '');
  const next = nextOpening(campaign, nowUtc);
  const afterEnd = /end date/i.test(reason);
  return {
    title: `${name} has stopped: calling hours ended`,
    text: `${reason ? `${reason} (${timezone}). ` : ''}No more calls will be dialled.${
      afterEnd
        ? ' The campaign is past its end date, so it will not start again on its own.'
        : next
          ? ` It starts again automatically ${next} (${timezone}).`
          : ' It starts again automatically when the calling hours open.'
    }`,
  };
};

/** The campaign's wait before a skipped or unanswered record is offered again, in ms. */
export const retryPeriodMs = (dialerSetting: any): number => {
  const value = Number(dialerSetting?.default_retry_period);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const rawUnit = dialerSetting?.default_retry_period_type;
  const unit = String(
    (rawUnit && typeof rawUnit === 'object' ? rawUnit.value : rawUnit) || 'min',
  ).toLowerCase();
  const perUnit = unit.startsWith('day') ? 86_400_000 : unit.startsWith('hour') ? 3_600_000 : 60_000;
  return value * perUnit;
};

export type EmptyOfferExplanation = {
  /** Plain sentence for the agent. */
  message: string;
  /** True when no contact can arrive on its own - the countdown should stop. */
  terminal: boolean;
};

export type EmptyOfferInput = {
  campaign: any;
  now?: Date;
  /** When this agent last skipped or timed out a record, epoch ms. */
  lastSkipAt?: number | null;
};

const minutesWord = (ms: number) => {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
};

/**
 * The reasons, most certain first. Returns null when the honest answer is
 * "a contact should be on its way" and the ordinary waiting text is right.
 */
export const explainEmptyOffer = ({
  campaign,
  now = new Date(),
  lastSkipAt = null,
}: EmptyOfferInput): EmptyOfferExplanation | null => {
  if (!campaign) return null;

  const window = campaignWindow(campaign, now);
  if (!window.open) {
    return {
      message: `Outside this campaign's calling hours: ${window.reason.replace(/\.$/, '')} (${window.timezone}).`,
      terminal: true,
    };
  }

  if (campaign?.require_consent === true) {
    return {
      message:
        'This campaign only offers contacts with consent on file. If none of the uploaded contacts has consent, nothing will be offered.',
      terminal: true,
    };
  }

  const retryMs = retryPeriodMs(campaign?.dialerSetting);
  if (lastSkipAt && retryMs > 0) {
    const left = lastSkipAt + retryMs - now.getTime();
    if (left > 0) {
      return {
        message: `Nothing else to offer right now. The record you passed on comes back in about ${minutesWord(left)}.`,
        terminal: false,
      };
    }
  }

  return null;
};
