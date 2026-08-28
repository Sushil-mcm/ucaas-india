/* Making the company ring time actually decide how long a phone rings.
 *
 * Admin > Company > Ring time saves one number for the whole company, at
 * `settings.company_ring_time.seconds` in the reserved company record (see
 * src/lib/company-defaults.ts). Until this file existed, nothing read it: a
 * person's phone was seeded from the first entry of `RINGING_OPTIONS`, a
 * hardcoded two-item list, and that seeded value is what gets sent to the API
 * as `call_handling.incoming_calls.device_options[].timeout`. So an admin who
 * shortened the company ring time changed nothing at all.
 *
 * This is the missing reader. Three rules it will not bend:
 *
 *   1. No company value saved means behave exactly as before. The fallback is
 *      the very same object the code falls back to today, so a tenant that has
 *      never opened the ring time page sees no difference whatsoever.
 *   2. It only ever fills a ring time nobody has set. A device an admin has
 *      deliberately put on 45 seconds is never quietly reset — that failure is
 *      worse than the setting doing nothing.
 *   3. A company value the two shipped choices cannot express is offered as a
 *      real choice rather than rounded to the nearest one. Rounding would show
 *      the admin a number they did not pick and give no clue why.
 *
 * Deliberately pure: no React, no query client, no network. Hand it the company
 * settings blob and the value currently on the form, get an option object back.
 */

import { RINGING_OPTIONS } from '@/constants/forwarding-consts';

/** Where the company ring time page keeps its number. */
export const COMPANY_RING_TIME_KEY = 'company_ring_time';

/**
 * The range the company page offers, repeated here so a number typed straight
 * into the API cannot put a device outside it. Systems that cap this refuse
 * anything above a minute, so a longer value would not survive the trip anyway.
 */
export const MIN_RING_SECONDS = 5;
export const MAX_RING_SECONDS = 60;

/**
 * Five seconds is one ring, which is how the shipped labels count and how a
 * caller experiences the wait. '6 times / 30 secs' is exactly 30 / 5.
 */
const SECONDS_PER_RING = 5;

/**
 * What every one of these seeds falls back to: the first entry of
 * `RINGING_OPTIONS`, the same object the code uses today. It is exported by
 * reference on purpose — with no company value saved, the seeded option is not
 * merely equal to the current default, it IS the current default.
 */
export const DEFAULT_RING_TIME_OPTION = RINGING_OPTIONS[0];

/**
 * The shape the device ring time is held in on the form. Matches a
 * `RINGING_OPTIONS` entry exactly: both fields are strings, and `value` is the
 * seconds as a string because `transformPayloadNew` sends it straight through
 * as `timeout`.
 */
export interface RingTimeOption {
  label: string;
  value: string;
}

/** What the company has actually saved, once it has been read and checked. */
export interface CompanyRingTime {
  /** Seconds to use: a whole number, held inside 5-60. */
  seconds: number;
  /** What was stored before clamping, so a caller can say the range was hit. */
  storedSeconds: number;
  /** True when the stored number was outside 5-60 and had to be pulled in. */
  wasClamped: boolean;
  /**
   * The company page's "use this for people added from now on" switch. Absent
   * means on: the page ships that switch on, and a record written before the
   * switch existed should behave the same as one written with it on.
   */
  appliesToNewPeople: boolean;
}

/** Company settings arrive as an object or as an unparsed JSON string. */
const toObject = (raw: unknown): Record<string, unknown> | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
};

const clamp = (seconds: number): number =>
  Math.min(MAX_RING_SECONDS, Math.max(MIN_RING_SECONDS, seconds));

/** '30' -> '6 times / 30 secs', the wording the shipped list already uses. */
const buildLabel = (seconds: number): string => {
  const rings = Math.round(seconds / SECONDS_PER_RING);
  return `${rings} ${rings === 1 ? 'time' : 'times'} / ${seconds} secs`;
};

/**
 * Turn a number of seconds into an option. When it matches one of the shipped
 * choices, the shipped object itself comes back rather than a copy, so a
 * company value of 30 is indistinguishable from today's behaviour.
 */
export const buildRingTimeOption = (seconds: number): RingTimeOption => {
  const known = RINGING_OPTIONS.find((option) => option.value === String(seconds));
  return known ?? { label: buildLabel(seconds), value: String(seconds) };
};

/**
 * Read the company ring time out of the settings blob.
 *
 * Returns null whenever there is nothing usable to act on — no record, no
 * `company_ring_time`, or a seconds value that is not a positive number. Null
 * means "carry on exactly as before"; it never means zero.
 */
export const readCompanyRingTime = (companySettings: unknown): CompanyRingTime | null => {
  const settings = toObject(companySettings);
  if (!settings) return null;

  const ringTime = toObject(settings[COMPANY_RING_TIME_KEY]);
  if (!ringTime) return null;

  const storedSeconds = Number(ringTime.seconds);
  if (!Number.isFinite(storedSeconds) || storedSeconds <= 0) return null;

  const rounded = Math.round(storedSeconds);
  const seconds = clamp(rounded);

  return {
    seconds,
    /* Reported exactly as stored, not as rounded: an admin told that 90 became
       60 can see what happened, where 'storedSeconds: 60' would say nothing. */
    storedSeconds,
    wasClamped: seconds !== rounded,
    appliesToNewPeople: ringTime.apply_to_new_people !== false,
  };
};

/**
 * Whether a company value is allowed to be used as a starting point at all.
 * The switch being off means the number is recorded as the company's intention
 * but is not offered to anyone, which is exactly what the page promises.
 */
const isUsable = (ringTime: CompanyRingTime | null): ringTime is CompanyRingTime =>
  !!ringTime && ringTime.appliesToNewPeople;

/**
 * The option to start a device off with: the company's number when one is
 * saved and switched on, otherwise the built-in default, unchanged.
 */
export const getCompanyRingTimeOption = (companySettings: unknown): RingTimeOption => {
  const ringTime = readCompanyRingTime(companySettings);
  return isUsable(ringTime) ? buildRingTimeOption(ringTime.seconds) : DEFAULT_RING_TIME_OPTION;
};

/**
 * Whether a device already carries a ring time somebody chose.
 *
 * A device read back from the API is `{ label, value: item.timeout }`, and a
 * record saved before ring times existed has no `timeout` at all, so `value`
 * comes through undefined. That is the only case counted as free.
 */
export const hasStoredRingTime = (current: unknown): boolean => {
  if (current === null || typeof current === 'undefined') return false;

  const raw =
    typeof current === 'object' && current !== null && 'value' in current
      ? (current as { value?: unknown }).value
      : current;

  if (raw === null || typeof raw === 'undefined') return false;
  if (typeof raw === 'string' && raw.trim() === '') return false;

  return Number.isFinite(Number(raw)) && Number(raw) > 0;
};

/**
 * The one call a seeding site needs.
 *
 * Give it whatever ring time the device currently has — `undefined` for a
 * device being invented from nothing — and the company settings blob. A device
 * that already has a value keeps it, untouched and unclamped, because it was
 * somebody's decision. Only an empty one gets the company number, and with no
 * company number that is the built-in default, exactly as today.
 */
export const seedDeviceRingTime = (current: unknown, companySettings: unknown): RingTimeOption => {
  if (hasStoredRingTime(current)) {
    if (typeof current === 'object' && current !== null && 'value' in current) {
      const stored = current as { label?: unknown; value?: unknown };
      /* The value is kept exactly as saved, unclamped: it was somebody's
         decision. Only a missing or blank label is filled in, because a select
         with a blank label shows the admin an empty box for a real setting. */
      const label = typeof stored.label === 'string' ? stored.label.trim() : '';
      return {
        label: label || buildLabel(Number(stored.value)),
        value: String(stored.value),
      };
    }
    return buildRingTimeOption(Number(current));
  }

  return getCompanyRingTimeOption(companySettings);
};

/**
 * The list to hand a ring time select.
 *
 * The two shipped choices, plus the company's number when it is not one of
 * them, plus whatever this device is already set to when that is not one of
 * them either. Without this, a select whose value is 45 shows blank, and the
 * first thing the admin touches silently rewrites it to 30.
 */
export const getRingTimeOptions = (
  companySettings: unknown,
  currentValue?: unknown,
): RingTimeOption[] => {
  const options = [...RINGING_OPTIONS];

  const add = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const value = String(Math.round(seconds));
    if (options.some((option) => option.value === value)) return;
    options.push(buildRingTimeOption(Math.round(seconds)));
  };

  const ringTime = readCompanyRingTime(companySettings);
  if (isUsable(ringTime)) add(ringTime.seconds);

  if (hasStoredRingTime(currentValue)) {
    const raw =
      typeof currentValue === 'object' && currentValue !== null && 'value' in currentValue
        ? (currentValue as { value?: unknown }).value
        : currentValue;
    add(Number(raw));
  }

  /* Nothing extra to show means hand back the shipped list in the shipped
     order: a tenant with no company value must see the same select they saw
     yesterday, down to which choice sits at the top. Sorting only kicks in once
     there is a third entry, where an unordered list would be worse. */
  if (options.length === RINGING_OPTIONS.length) return options;

  return options.sort((a, b) => Number(a.value) - Number(b.value));
};

export default getCompanyRingTimeOption;
