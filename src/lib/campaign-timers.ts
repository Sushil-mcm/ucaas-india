/* The four preview-dialer timers: one place for their defaults and ranges.
 *
 * Every timer is a campaign setting with a company default, except
 * contact_retry, which is company-only (it is an internal poll interval, not
 * something a campaign should differ on). The company defaults live in one
 * company-settings section, `campaign_timers`; a campaign copies them into
 * dialerSetting when it is created and may change the first three.
 *
 * The server (campaign-api Joi) validates the same ranges; this file mirrors
 * them so the form can refuse a value before the round trip. Change a number
 * here AND in campaign-api src/schemas/campaignTimers.ts, never one alone.
 *
 * Two browser delays are deliberately NOT here: the 10 s progressive skip
 * settle and the 1.5 s preview skip settle in dialpad-campaign-overview.tsx
 * are UI settle delays, not timers an admin should tune. */

export const CAMPAIGN_TIMERS_SECTION = 'campaign_timers';

export const WRAPUP_MODES = [
  'OPTIONAL',
  'MANDATORY',
  'MANDATORY_TIMEOUT',
  'MANDATORY_FORCED_TIMEOUT',
  'AGENT_REQUESTED',
] as const;
export type WrapupMode = (typeof WRAPUP_MODES)[number];

export interface CampaignTimers {
  schema_version: 1;
  /* Seconds an agent gets to look at a lead before it dials (preview only). */
  preview_time: number;
  /* Seconds of wrap-up after a call, and which rule applies to it. */
  wrapup_time: number;
  wrapup_mode: WrapupMode;
  /* Seconds between the wrap-up ending and the next lead being offered. */
  wait_after_call: number;
  /* Seconds between polls when the campaign has nobody to offer yet. */
  contact_retry: number;
}

export type CampaignTimerKey = 'preview_time' | 'wrapup_time' | 'wait_after_call' | 'contact_retry';

export const TIMER_RANGES: Record<CampaignTimerKey, { min: number; max: number }> = {
  preview_time: { min: 10, max: 300 },
  wrapup_time: { min: 10, max: 1200 },
  wait_after_call: { min: 0, max: 60 },
  contact_retry: { min: 5, max: 120 },
};

export const DEFAULT_CAMPAIGN_TIMERS: CampaignTimers = {
  schema_version: 1,
  preview_time: 30,
  wrapup_time: 30,
  wrapup_mode: 'MANDATORY_TIMEOUT',
  wait_after_call: 5,
  contact_retry: 15,
};

/* The keys a campaign carries in dialerSetting. contact_retry is never one. */
export type CampaignLevelTimerKey = Exclude<CampaignTimerKey, 'contact_retry'>;
export const CAMPAIGN_LEVEL_TIMER_KEYS: CampaignLevelTimerKey[] = [
  'preview_time',
  'wrapup_time',
  'wait_after_call',
];

/* Plain words for the screen and the form, keyed the same way. */
export const TIMER_LABELS: Record<CampaignTimerKey, { label: string; help: string }> = {
  preview_time: {
    label: 'Preview time (seconds)',
    help: 'Seconds an agent gets to look at a lead before it dials.',
  },
  wrapup_time: {
    label: 'Wrap-up time (seconds)',
    help: 'Seconds an agent has after a call to note the outcome.',
  },
  wait_after_call: {
    label: 'Wait after a call (seconds)',
    help: 'Seconds between the wrap-up ending and the next lead being offered. 0 offers it straight away.',
  },
  contact_retry: {
    label: 'Check for leads every (seconds)',
    help: 'When the campaign has nobody to offer yet, how often the agent screen asks again. Company-wide.',
  },
};

export const isWrapupMode = (value: unknown): value is WrapupMode =>
  typeof value === 'string' && (WRAPUP_MODES as readonly string[]).includes(value);

/* A stored or typed value into one inside the range. Anything that is not a
   number (blank, text, null) becomes the fallback; a number outside the range
   is clamped to its nearest edge; fractions are rounded. */
export const clampTimer = (key: CampaignTimerKey, value: unknown, fallback?: number): number => {
  const { min, max } = TIMER_RANGES[key];
  const n = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
  if (!Number.isFinite(n)) return fallback ?? DEFAULT_CAMPAIGN_TIMERS[key];
  return Math.min(max, Math.max(min, Math.round(n)));
};

/* Is the value already a whole number inside the range? For the form, which
   wants to refuse rather than silently fix what the admin typed. */
export const isWithinRange = (key: CampaignTimerKey, value: unknown): boolean => {
  const { min, max } = TIMER_RANGES[key];
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) && n >= min && n <= max;
};

/* The company section, whatever it holds, into a full valid record. A missing
   or empty section is the defaults; a partial one keeps what it has and fills
   the rest; an out-of-range number is clamped. */
export const normaliseCampaignTimers = (raw: unknown): CampaignTimers => {
  const r: any = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    schema_version: 1,
    preview_time: clampTimer('preview_time', r.preview_time),
    wrapup_time: clampTimer('wrapup_time', r.wrapup_time),
    wrapup_mode: isWrapupMode(r.wrapup_mode) ? r.wrapup_mode : DEFAULT_CAMPAIGN_TIMERS.wrapup_mode,
    wait_after_call: clampTimer('wait_after_call', r.wait_after_call),
    contact_retry: clampTimer('contact_retry', r.contact_retry),
  };
};

/* What a campaign's dialerSetting resolves to for one timer: the campaign's
   own value when it has one, else the company default, else the built-in
   default. An older campaign saved before wait_after_call existed has no
   value stored, and this is where it picks up the company's number. */
export const resolveCampaignTimer = (
  key: CampaignTimerKey,
  dialerSetting: any,
  company: Partial<CampaignTimers> | null | undefined,
): number => {
  const own = dialerSetting?.[key];
  const ownN = own === '' || own === null || own === undefined ? NaN : Number(own);
  if (Number.isFinite(ownN)) return clampTimer(key, ownN);
  const companyN = Number(company?.[key]);
  if (Number.isFinite(companyN)) return clampTimer(key, companyN);
  return DEFAULT_CAMPAIGN_TIMERS[key];
};

/* The dialerSetting keys a NEW campaign starts with, taken from the company. */
export const campaignTimerSeed = (
  company: Partial<CampaignTimers> | null | undefined,
): Pick<CampaignTimers, 'preview_time' | 'wrapup_time' | 'wrapup_mode' | 'wait_after_call'> => {
  const full = normaliseCampaignTimers(company);
  return {
    preview_time: full.preview_time,
    wrapup_time: full.wrapup_time,
    wrapup_mode: full.wrapup_mode,
    wait_after_call: full.wait_after_call,
  };
};

/* ---- The campaign form: what to write into dialerSetting -----------------
 *
 * One decision for the Calling rules block, made without React so it can be
 * proven: a NEW campaign takes every timer from the company section (or the
 * built-in defaults when the section was never saved); an EXISTING campaign
 * keeps every number it has, and only a timer it never stored (wait_after_call
 * on a campaign saved before it existed) is filled from the company - and
 * only once the form holds the campaign's own values, or the fill would race
 * the reset and overwrite them. The keys are the form's dialerSetting keys;
 * the caller writes each one with setValue. An empty result means "touch
 * nothing". */
export type CampaignTimerSeedInput = {
  isEditMode: boolean;
  /* The edit form has copied the campaign's stored values into the fields. */
  isFormInitialized: boolean;
  /* Company › Campaign timers as loaded; null/undefined = never saved. */
  companyTimers: Partial<CampaignTimers> | null | undefined;
  /* The form's current dialerSetting values (edit mode only). */
  current: Record<string, unknown> | null | undefined;
};

export type CampaignTimerSeedWrites = Partial<
  Record<CampaignLevelTimerKey | 'wrapup_mode', number | WrapupMode>
>;

const isBlankTimer = (value: unknown): boolean =>
  value === undefined || value === null || value === '';

export const planCampaignTimerSeed = (input: CampaignTimerSeedInput): CampaignTimerSeedWrites => {
  const seed = campaignTimerSeed(input.companyTimers);
  if (!input.isEditMode) {
    return { ...seed };
  }
  if (!input.isFormInitialized) return {};
  const current = input.current && typeof input.current === 'object' ? input.current : {};
  const writes: CampaignTimerSeedWrites = {};
  for (const key of CAMPAIGN_LEVEL_TIMER_KEYS) {
    if (isBlankTimer(current[key])) writes[key] = seed[key];
  }
  return writes;
};

/* ---- The dialer panel: what the timers make it do -------------------------
 *
 * Two decisions the panel used to make inline, lifted here so they can be
 * proven with a fixed clock. */

/* When the preview countdown runs out. Dialling for the agent is opt-in per
   campaign (preview_timeout_action DIAL) and only when a call could actually
   be placed; everything else returns the lead to the pool, which keeps a
   person in charge of every call that gets placed. */
export type PreviewTimeoutDecision = 'dial' | 'return_to_pool';
export const previewTimeoutDecision = (
  action: unknown,
  canCall: boolean,
): PreviewTimeoutDecision =>
  String(action || 'RETURN_TO_POOL').toUpperCase() === 'DIAL' && canCall ? 'dial' : 'return_to_pool';

/* How long the panel waits before asking for the next lead. A lead in hand:
   the campaign's wait-after-call. Nothing callable: the company's
   check-for-leads interval, shortened to the next scheduled retry when that
   comes sooner, never under one second so the screen cannot spin. */
export type NextOfferDelayInput = {
  callableCount: number;
  /* Epoch ms of the earliest future retry among the rows returned, or null. */
  nextRetryAt: number | null;
  nowMs: number;
  waitAfterCallMs: number;
  contactRetryMs: number;
};
export const nextOfferDelayMs = (input: NextOfferDelayInput): number => {
  if (input.callableCount > 0) return Math.max(0, input.waitAfterCallMs);
  if (input.nextRetryAt && input.nextRetryAt > input.nowMs) {
    return Math.max(1000, Math.min(input.nextRetryAt - input.nowMs, input.contactRetryMs));
  }
  return input.contactRetryMs;
};
