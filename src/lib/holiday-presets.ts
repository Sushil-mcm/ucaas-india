/* The public-holiday rules, and the dates they produce.
 *
 * Lifted out of the Holidays screen so it can be RUN without React. Every date
 * here is either a fixed calendar date or produced by a rule that computes
 * exactly for any year, which is a claim worth checking rather than believing:
 * a wrong Thanksgiving closes somebody's phone line on a working day, and
 * nobody finds out until a customer complains. `scripts/verify-holiday-presets.mjs`
 * checks the output against dates taken from the official calendars.
 *
 * Holidays that follow the lunar calendars - Diwali, Holi, Eid, and the
 * state-by-state Indian lists - are deliberately absent: there is no rule for
 * them here, and a guessed Diwali is worse than no Diwali. The screen says so
 * where the picker is.
 */

const pad = (value: number) => `${value}`.padStart(2, '0');

const utcToIso = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/* Parsed into a local-noon Date so a browser west of UTC cannot render
   2026-12-25 as the 24th. */
const isoToDate = (iso: string): Date | null => {
  const parts = `${iso}`.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
};

const prettyDate = (iso: string) => {
  const date = isoToDate(iso);
  if (!date) return iso || '\u2014';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};


/* Every date below is either a fixed calendar date or produced by a rule that
   computes exactly for any year, so nothing is transcribed from a year-specific
   table that would rot. Holidays that follow the lunar calendars — Diwali, Holi,
   Eid, and the state-by-state Indian lists — are deliberately absent: there is
   no rule for them here, and a guessed Diwali is worse than no Diwali. The panel
   says so where the picker is. */

export type PresetRule = {
  name: string;
  /* Fixed date. */
  month?: number;
  day?: number;
  /* Nth weekday of a month; nth = -1 means the last one. 0 = Sunday. */
  weekday?: number;
  nth?: number;
  /* Days from Easter Sunday (Good Friday = -2, Easter Monday = +1). */
  easterOffset?: number;
  /* The Monday strictly before month/day — Canada's Victoria Day. */
  mondayBefore?: boolean;
  /* A date in the Islamic calendar: month 1-12, day of that month. Converted
     with the Umm al-Qura calendar the browser already ships. */
  hijriMonth?: number;
  hijriDay?: number;
};

/* The Gregorian date of a Hijri month and day, in a given Gregorian year.
 *
 * Done by reading each day of the year back through `Intl` rather than by
 * hand-rolling the arithmetic, which is where these conversions usually go
 * wrong. Cached per year because four holidays each scanning a year is four
 * scans of the same 365 days.
 *
 * WHAT THIS IS AND IS NOT. Umm al-Qura is a CALCULATED calendar. India, and
 * most of the world outside Saudi Arabia, fixes these days by local moon
 * sighting, which can fall a day later. So this produces the right date to
 * within a day and the screen says so on every one of them — an admin gets a
 * date to confirm rather than a blank, and is told to confirm it. */
const hijriCache = new Map<number, Map<string, string>>();

const hijriIndexFor = (year: number): Map<string, string> => {
  const cached = hijriCache.get(year);
  if (cached) return cached;

  const index = new Map<string, string>();
  try {
    const format = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    });
    for (
      let cursor = new Date(Date.UTC(year, 0, 1));
      cursor.getUTCFullYear() === year;
      cursor = new Date(cursor.getTime() + 86400000)
    ) {
      const parts = Object.fromEntries(
        format.formatToParts(cursor).map((part) => [part.type, part.value]),
      );
      const key = `${parseInt(parts.month, 10)}-${parseInt(parts.day, 10)}`;
      /* First occurrence only. A Hijri year is shorter than a Gregorian one, so
         a date near the start of the Islamic year can fall twice in one
         Gregorian year; offering it twice would just be a duplicate row. */
      if (!index.has(key)) index.set(key, utcToIso(cursor));
    }
  } catch {
    /* An environment without the Islamic calendar returns nothing, and the
       caller drops those holidays rather than guessing at them. */
  }

  hijriCache.set(year, index);
  return index;
};

/* Meeus/Jones/Butcher. Cross-checked by hand against Easter Sunday 20 Apr 2025,
   5 Apr 2026 and 28 Mar 2027. */
export const easterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
};

export const nthWeekdayOf = (year: number, month: number, weekday: number, nth: number): Date => {
  if (nth < 0) {
    const lastDay = new Date(Date.UTC(year, month, 0));
    const back = (lastDay.getUTCDay() - weekday + 7) % 7;
    return new Date(Date.UTC(year, month - 1, lastDay.getUTCDate() - back));
  }
  const first = new Date(Date.UTC(year, month - 1, 1));
  const forward = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + forward + (nth - 1) * 7));
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export const ruleDate = (rule: PresetRule, year: number): Date | null => {
  if (typeof rule.hijriMonth === 'number' && typeof rule.hijriDay === 'number') {
    const iso = hijriIndexFor(year).get(`${rule.hijriMonth}-${rule.hijriDay}`);
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  if (typeof rule.easterOffset === 'number') {
    return addDays(easterSunday(year), rule.easterOffset);
  }
  if (rule.mondayBefore && rule.month && rule.day) {
    const anchor = new Date(Date.UTC(year, rule.month - 1, rule.day));
    /* Strictly before: when the anchor is itself a Monday, step back a week. */
    const back = (anchor.getUTCDay() + 6) % 7 || 7;
    return addDays(anchor, -back);
  }
  if (typeof rule.weekday === 'number' && rule.month && rule.nth) {
    return nthWeekdayOf(year, rule.month, rule.weekday, rule.nth);
  }
  return new Date(Date.UTC(year, (rule.month || 1) - 1, rule.day || 1));
};

/* A rule lands on the same calendar date every year only when it is a plain
   fixed date that was not moved off a weekend. */
export const isFixedDate = (rule: PresetRule) =>
  typeof rule.easterOffset !== 'number' &&
  !rule.mondayBefore &&
  typeof rule.weekday !== 'number' &&
  typeof rule.hijriMonth !== 'number';

export type ObservanceRule = 'none' | 'uk' | 'us';

export interface CountryPreset {
  code: string;
  label: string;
  /* What the list actually covers, shown next to the picker. Every one of these
     countries has holidays this list does not have. */
  scope: string;
  observance: ObservanceRule;
  rules: PresetRule[];
}

export const COUNTRY_PRESETS: CountryPreset[] = [
  {
    code: 'US',
    label: 'United States',
    scope: 'The 11 federal public holidays. States and cities add their own.',
    /* 5 U.S.C. § 6103(b): a holiday on a Saturday is observed the Friday before,
       one on a Sunday the Monday after. */
    observance: 'us',
    rules: [
      { name: "New Year's Day", month: 1, day: 1 },
      { name: 'Martin Luther King Jr. Day', month: 1, weekday: 1, nth: 3 },
      { name: "Washington's Birthday (Presidents' Day)", month: 2, weekday: 1, nth: 3 },
      { name: 'Memorial Day', month: 5, weekday: 1, nth: -1 },
      { name: 'Juneteenth National Independence Day', month: 6, day: 19 },
      { name: 'Independence Day', month: 7, day: 4 },
      { name: 'Labor Day', month: 9, weekday: 1, nth: 1 },
      { name: 'Columbus Day', month: 10, weekday: 1, nth: 2 },
      { name: 'Veterans Day', month: 11, day: 11 },
      { name: 'Thanksgiving Day', month: 11, weekday: 4, nth: 4 },
      { name: 'Christmas Day', month: 12, day: 25 },
    ],
  },
  {
    code: 'GB',
    label: 'United Kingdom (England & Wales)',
    scope: 'Bank holidays for England and Wales. Scotland and Northern Ireland differ.',
    /* A bank holiday falling on a weekend moves to the next weekday that is not
       already a bank holiday — which is what produces 27 and 28 December when
       Christmas lands on a Saturday. */
    observance: 'uk',
    rules: [
      { name: "New Year's Day", month: 1, day: 1 },
      { name: 'Good Friday', easterOffset: -2 },
      { name: 'Easter Monday', easterOffset: 1 },
      { name: 'Early May bank holiday', month: 5, weekday: 1, nth: 1 },
      { name: 'Spring bank holiday', month: 5, weekday: 1, nth: -1 },
      { name: 'Summer bank holiday', month: 8, weekday: 1, nth: -1 },
      { name: 'Christmas Day', month: 12, day: 25 },
      { name: 'Boxing Day', month: 12, day: 26 },
    ],
  },
  {
    code: 'IN',
    label: 'India',
    scope:
      'The three national holidays, the Christian and Islamic gazetted holidays, and Christmas. The Hindu, Sikh, Jain and Buddhist festivals — Diwali, Holi, Dussehra, Janmashtami, Guru Nanak Jayanti, Mahavir Jayanti, Buddha Purnima — follow the Hindu lunisolar calendar, which cannot be worked out from a rule, so they are not here. Add those by hand.',
    /* India does not substitute a weekday when a gazetted holiday falls on a
       weekend, so these are left on their real dates. */
    observance: 'none',
    rules: [
      { name: 'Republic Day', month: 1, day: 26 },
      /* On the central gazetted list, and exactly computable from Easter. */
      { name: 'Good Friday', easterOffset: -2 },
      { name: 'Independence Day', month: 8, day: 15 },
      { name: 'Gandhi Jayanti', month: 10, day: 2 },
      { name: 'Christmas Day', month: 12, day: 25 },
      /* The four Islamic gazetted holidays, by their Hijri dates. Every one is
         marked on screen as needing local confirmation - see the note in
         `buildPreset`. */
      { name: 'Id-ul-Fitr', hijriMonth: 10, hijriDay: 1 },
      { name: 'Id-ul-Zuha (Bakrid)', hijriMonth: 12, hijriDay: 10 },
      { name: 'Muharram', hijriMonth: 1, hijriDay: 10 },
      { name: 'Milad-un-Nabi', hijriMonth: 3, hijriDay: 12 },
    ],
  },
  {
    code: 'CA',
    label: 'Canada (federal)',
    scope: 'The federal general holidays. Every province adds more.',
    observance: 'uk',
    rules: [
      { name: "New Year's Day", month: 1, day: 1 },
      { name: 'Good Friday', easterOffset: -2 },
      { name: 'Victoria Day', month: 5, day: 25, mondayBefore: true },
      { name: 'Canada Day', month: 7, day: 1 },
      { name: 'Labour Day', month: 9, weekday: 1, nth: 1 },
      { name: 'National Day for Truth and Reconciliation', month: 9, day: 30 },
      { name: 'Thanksgiving Day', month: 10, weekday: 1, nth: 2 },
      { name: 'Remembrance Day', month: 11, day: 11 },
      { name: 'Christmas Day', month: 12, day: 25 },
      { name: 'Boxing Day', month: 12, day: 26 },
    ],
  },
];

export interface GeneratedHoliday {
  title: string;
  iso: string;
  repeats_yearly: boolean;
  note?: string;
}

export const buildPreset = (preset: CountryPreset, year: number): GeneratedHoliday[] => {
  const dated = preset.rules
    .map((rule) => ({ rule, date: ruleDate(rule, year) }))
    /* A rule with no date for this year is dropped rather than defaulted. Only
       the Islamic ones can do this, and only where the browser has no Umm
       al-Qura calendar - a missing Eid is a gap an admin can fill by hand, a
       guessed one is a line closed on the wrong day. */
    .filter((entry): entry is { rule: PresetRule; date: Date } => entry.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const taken = new Set(dated.map((entry) => utcToIso(entry.date)));
  const results: GeneratedHoliday[] = [];

  dated.forEach(({ rule, date }) => {
    let observed = date;
    let moved = false;

    if (preset.observance === 'us') {
      const weekday = date.getUTCDay();
      if (weekday === 6) {
        observed = addDays(date, -1);
        moved = true;
      } else if (weekday === 0) {
        observed = addDays(date, 1);
        moved = true;
      }
    } else if (preset.observance === 'uk') {
      while (
        observed.getUTCDay() === 0 ||
        observed.getUTCDay() === 6 ||
        (moved && taken.has(utcToIso(observed)))
      ) {
        observed = addDays(observed, 1);
        moved = true;
      }
    }

    const iso = utcToIso(observed);
    taken.add(iso);

    results.push({
      title: rule.name,
      iso,
      /* Only safe to repeat when the date cannot move - and `!moved` is not
         enough to know that.
      
         What is stored is the OBSERVED date, the day the office is actually
         shut. In a country that substitutes a weekday when a holiday lands on a
         weekend, any fixed date eventually does: Juneteenth is 19 June every
         year, but in 2026 that is a Friday and in 2027 it is a Saturday
         observed on the 18th. Marking it "repeats every year" in 2026 promises
         a date that is wrong in 2027 - and the promise is only discovered by a
         caller who gets through on a day the office is closed.
      
         So a substitution rule disqualifies the whole country from automatic
         repeating, whatever this particular year happens to look like. Only a
         fixed date in a country that never substitutes - India's gazetted
         holidays - is offered as repeating. An admin can still turn the switch
         on themselves; what changed is that the software no longer claims it. */
      repeats_yearly: isFixedDate(rule) && preset.observance === 'none' && !moved,
      note:
        typeof rule.hijriMonth === 'number'
          ? 'Set locally by moon sighting — confirm this date, it can fall a day later'
          : moved
            ? `Observed on this day; the holiday itself is ${prettyDate(utcToIso(date))}`
            : isFixedDate(rule)
              ? preset.observance === 'none'
                ? undefined
                : 'Moves to a weekday in years when it falls on a weekend'
              : 'Falls on a different date each year',
    });
  });

  return results.sort((a, b) => a.iso.localeCompare(b.iso));
};

