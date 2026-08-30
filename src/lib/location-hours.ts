/* Whether a location is open right now, and whether its hours make sense.
 *
 * A location decides the clock. Opening times are written as "09:00 to 17:00" with
 * no timezone attached, so the same stored rule means a different moment in London
 * than it does in Dubai. Until now nothing in this app ever turned those two things
 * — the stored hours and the location's timezone — into an answer, so an admin
 * looking at a list of locations could not tell which of them were open.
 *
 * There are three rules worth stating plainly, because they are the ones people get
 * wrong:
 *
 *   1. A holiday beats the weekly hours. Always. A location set to take calls
 *      24 hours a day is still shut on a declared holiday — that is the whole point
 *      of declaring one, and treating "24 hours" as an exception is how a company
 *      ends up answering the phone on Christmas Day.
 *   2. A holiday declared on the location beats a company-wide holiday on the same
 *      date. The more specific rule wins, so a branch that trades on a national
 *      holiday can say so without the company list overruling it.
 *   3. A day is open from the opening time up to, but not including, the closing
 *      time. 17:00 to 17:00 is not "all day", it is nothing, and a call arriving at
 *      exactly 17:00 on a 09:00-17:00 day is out of hours.
 *
 * Split hours are supported — a morning period and an afternoon period on the same
 * day — because a location that shuts for lunch is ordinary. The dialog that saves
 * hours today only stores one period per day, so reading it back gives one period;
 * the shape here is a list so that the second period has somewhere to go when the
 * dialog catches up, and so the overlap check below is worth having.
 *
 * Nothing in here talks to the network or to React. It is all decidable from its
 * inputs, which is why it can be proven by tests/location-hours-test.cjs.
 */

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export const DAY_KEYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

/* One stretch of a day the location is open. 'HH:MM', 24-hour. */
export interface HoursPeriod {
  start: string;
  end: string;
}

export interface WeeklyHours {
  /* "Always take calls" — every day, all day. Holidays still override it. */
  alwaysOpen: boolean;
  days: Record<DayKey, HoursPeriod[]>;
}

export interface HolidayEntry {
  title: string;
  /* 'YYYY-MM-DD'. A single-day holiday stores the same date in both. */
  from: string;
  to: string;
  /* Comes back on the same date every year. The year in `from` is then only the
     year it was first declared, and is ignored when matching. */
  repeatsYearly?: boolean;
  /* Where the holiday was declared. Used to break a tie on the same date. */
  source?: 'location' | 'company';
}

export interface HoursProblem {
  /* Which part of the form the admin should look at. */
  field: string;
  message: string;
  /* Blocking problems make the hours unusable; the rest are worth saying but
     would still behave predictably if saved. */
  blocking: boolean;
}

/* ---------------------------------------------------------------- reading in */

const pad = (value: number) => `${value}`.padStart(2, '0');

/* 'HH:MM' as minutes past midnight, or null when it is not a time at all.
   Deliberately strict: '9:00', '0900' and '25:00' are all refused rather than
   guessed at, because a guessed opening time is worse than a rejected one. */
export const toMinutes = (value: unknown): number | null => {
  const text = `${value ?? ''}`.trim();
  const match = /^(\d{2}):(\d{2})$/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export const fromMinutes = (value: number): string =>
  `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;

/* Dates reach this module as 'YYYY-MM-DD' strings, as Date objects from the form,
   and occasionally as full timestamps from the API. All three are reduced to the
   calendar day, in local terms, so nothing is compared against a UTC instant. */
export const toDayKey = (value: any): string => {
  if (!value) return '';
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const text = `${value}`;
  return text.length >= 10 ? text.slice(0, 10) : text;
};

const emptyWeek = (): Record<DayKey, HoursPeriod[]> => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
});

/* Turns the stored `operational_hours` blob into the shape above.
 *
 * The stored shape has been through a few hands, so all of them are accepted: a
 * day may hold one `{ start, end }` pair, or a `periods` list, and a day that is
 * switched off may still be carrying the times it had before it was switched off.
 * A day with `open: false` contributes nothing either way. */
export const readWeeklyHours = (operationalHours: any): WeeklyHours => {
  const type = `${operationalHours?.type || ''}`;
  if (!operationalHours || type === '24_hours') {
    return { alwaysOpen: true, days: emptyWeek() };
  }

  const stored = operationalHours?.value || {};
  const days = emptyWeek();

  DAY_KEYS.forEach((day) => {
    const entry = stored?.[day];
    if (!entry || entry?.open === false) return;

    const rawPeriods: any[] = Array.isArray(entry?.periods)
      ? entry.periods
      : [{ start: entry?.start, end: entry?.end }];

    rawPeriods.forEach((period) => {
      const start = `${period?.start ?? ''}`.trim();
      const end = `${period?.end ?? ''}`.trim();
      if (!start && !end) return;
      days[day].push({ start, end });
    });
  });

  return { alwaysOpen: false, days };
};

/* Holidays as stored on a line's own hours (`operational_hours.holidays`).
   Rows without a name or a date are dropped: a holiday that cannot be named
   cannot be explained to the admin when it closes their phones. */
export const readLineHolidays = (operationalHours: any): HolidayEntry[] => {
  const rows = operationalHours?.holidays;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row: any) => row?.title && row?.from)
    .map((row: any) => ({
      title: `${row.title}`,
      from: toDayKey(row.from),
      to: toDayKey(row.to || row.from),
      repeatsYearly: Boolean(row.repeats_yearly ?? row.repeatsYearly),
      source: 'location' as const,
    }));
};

/* --------------------------------------------------------------- validation */

/* Four is the number of separate stretches a day is allowed on established
   business phone systems. It is a soft limit here — more would still behave — but
   a day chopped into five pieces is nearly always a mistake. */
export const MAX_PERIODS_PER_DAY = 4;

/* Problems with a week of opening hours, in the order an admin would want to fix
   them. Overlapping periods are the interesting one: two stretches that cross
   each other are not wrong in any way the phone system would notice, but they
   mean the admin believes something about their hours that is not true, and the
   second period is silently doing nothing. */
export const checkWeeklyHours = (hours: WeeklyHours): HoursProblem[] => {
  const problems: HoursProblem[] = [];
  if (hours.alwaysOpen) return problems;

  let anyOpenDay = false;

  DAY_KEYS.forEach((day) => {
    const periods = hours.days[day] || [];
    if (!periods.length) return;

    const parsed: { start: number; end: number }[] = [];

    periods.forEach((period, index) => {
      const start = toMinutes(period.start);
      const end = toMinutes(period.end);

      if (start === null || end === null) {
        problems.push({
          field: `${day}.${index}`,
          message: `${DAY_LABELS[day]} needs an opening and a closing time, written as HH:MM.`,
          blocking: true,
        });
        return;
      }

      if (end <= start) {
        problems.push({
          field: `${day}.${index}`,
          message:
            end === start
              ? `${DAY_LABELS[day]} opens and closes at ${period.start}, so it is never open.`
              : `${DAY_LABELS[day]} closes at ${period.end}, before it opens at ${period.start}.`,
          blocking: true,
        });
        return;
      }

      parsed.push({ start, end });
    });

    if (parsed.length) anyOpenDay = true;

    /* Sorted first so "overlaps" means what a reader expects rather than
       depending on the order the periods were typed in. */
    const sorted = [...parsed].sort((a, b) => a.start - b.start);
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].start < sorted[index - 1].end) {
        problems.push({
          field: `${day}.overlap`,
          message: `${DAY_LABELS[day]} has two opening times that overlap — ${fromMinutes(
            sorted[index - 1].start,
          )}-${fromMinutes(sorted[index - 1].end)} and ${fromMinutes(sorted[index].start)}-${fromMinutes(
            sorted[index].end,
          )}. Merge them into one.`,
          blocking: false,
        });
      }
    }

    if (sorted.length > MAX_PERIODS_PER_DAY) {
      problems.push({
        field: `${day}.count`,
        message: `${DAY_LABELS[day]} has more than ${MAX_PERIODS_PER_DAY} opening times.`,
        blocking: false,
      });
    }
  });

  if (!anyOpenDay) {
    problems.push({
      field: 'week',
      message: 'This location is never open. Set opening times on at least one day.',
      blocking: true,
    });
  }

  return problems;
};

/* Problems with a list of holidays. Two holidays covering the same date is the
   one to catch: only one of them can decide what happens, so an admin who has
   entered both believes something the phone system will not do. */
export const checkHolidayList = (holidays: HolidayEntry[]): HoursProblem[] => {
  const problems: HoursProblem[] = [];
  const seen = new Map<string, string>();

  (holidays || []).forEach((holiday, index) => {
    const title = `${holiday?.title || ''}`.trim();
    if (!title) {
      problems.push({
        field: `holiday.${index}.title`,
        message: 'A holiday needs a name, so it can be recognised in the list.',
        blocking: true,
      });
    }

    const from = toDayKey(holiday?.from);
    const to = toDayKey(holiday?.to || holiday?.from);

    if (!isDayKey(from) || !isDayKey(to)) {
      problems.push({
        field: `holiday.${index}.from`,
        message: `${title || 'This holiday'} needs a date.`,
        blocking: true,
      });
      return;
    }

    if (to < from) {
      problems.push({
        field: `holiday.${index}.to`,
        message: `${title || 'This holiday'} ends before it starts.`,
        blocking: true,
      });
      return;
    }

    eachDay(from, to).forEach((day) => {
      /* A repeating holiday claims the same day every year, so it is matched on
         month and day only — otherwise two yearly holidays on 25 December would
         look like different dates because they were first declared in
         different years. */
      const key = holiday?.repeatsYearly ? `yearly:${day.slice(5)}` : day;
      const existing = seen.get(key);
      if (existing && existing !== title) {
        problems.push({
          field: `holiday.${index}.from`,
          message: `${title || 'This holiday'} covers ${day}, which ${existing} already covers. Only one of them will decide what happens.`,
          blocking: false,
        });
      } else if (!existing) {
        seen.set(key, title || 'another holiday');
      }
    });
  });

  return problems;
};

const isDayKey = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

/* Every calendar day from one 'YYYY-MM-DD' to another, inclusive. Capped so a
   typo like 2026-01-01 to 2226-01-01 cannot spin. */
const eachDay = (from: string, to: string): string[] => {
  const start = dayKeyToUtc(from);
  const end = dayKeyToUtc(to);
  if (!start || !end) return [];

  const days: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor.getTime() <= end.getTime() && days.length < 400) {
    days.push(
      `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`,
    );
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

/* Built in UTC on purpose. These are calendar days, not moments, and building
   them in local time is how 2026-12-25 renders as the 24th for anyone west of
   the meridian. */
const dayKeyToUtc = (value: string): Date | null => {
  if (!isDayKey(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

/* --------------------------------------------------------------- evaluation */

export interface LocalMoment {
  /* The day of the week where the location is, not where the admin is. */
  day: DayKey;
  /* Minutes past midnight, on the location's clock. */
  minutes: number;
  /* 'YYYY-MM-DD' on the location's clock. */
  dayKey: string;
}

const INTL_DAYS: Record<string, DayKey> = {
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
  Saturday: 'saturday',
  Sunday: 'sunday',
};

/* The date and time at a location, given an instant and the location's timezone.
 *
 * An unknown or empty timezone falls back to the reader's own clock rather than
 * throwing. That is the honest behaviour: it is what the platform already does
 * everywhere else when a location has no timezone set, and the screens that call
 * this say so instead of pretending the answer is authoritative. */
export const localMomentAt = (at: Date, timezone?: string): LocalMoment => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      ...options,
      ...(timezone ? { timeZone: timezone } : {}),
    }).formatToParts(at);
  } catch {
    parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(at);
  }

  const read = (type: string) => parts.find((part) => part.type === type)?.value || '';

  /* Some runtimes report midnight as hour 24 rather than 00 when a 24-hour clock
     is asked for. Left alone, that reads as "closed" for the first minute of
     every day at a 24-hour location. */
  const hour = Number(read('hour')) % 24;
  const minute = Number(read('minute'));

  return {
    day: INTL_DAYS[read('weekday')] || 'monday',
    minutes: hour * 60 + minute,
    dayKey: `${read('year')}-${read('month')}-${read('day')}`,
  };
};

/* The holiday covering a given day, if any.
 *
 * Location holidays are checked before company ones so the specific rule wins —
 * a branch that opens on a national holiday says so on its own list, and the
 * company list does not overrule it. */
export const findHoliday = (dayKey: string, holidays: HolidayEntry[]): HolidayEntry | null => {
  const ordered = [
    ...(holidays || []).filter((holiday) => holiday?.source !== 'company'),
    ...(holidays || []).filter((holiday) => holiday?.source === 'company'),
  ];

  for (const holiday of ordered) {
    const from = toDayKey(holiday?.from);
    const to = toDayKey(holiday?.to || holiday?.from);
    if (!isDayKey(from) || !isDayKey(to)) continue;

    if (holiday?.repeatsYearly) {
      /* Matched on month and day, so the year it was first declared is
         irrelevant. A range that crosses new year is compared as text within the
         year it was declared, which is why the days are expanded rather than
         range-checked. */
      if (eachDay(from, to).some((day) => day.slice(5) === dayKey.slice(5))) return holiday;
      continue;
    }

    if (dayKey >= from && dayKey <= to) return holiday;
  }

  return null;
};

export type OpenState = 'open' | 'closed' | 'holiday';

export interface Resolution {
  state: OpenState;
  /* One sentence an admin can read on the screen without further explanation. */
  reason: string;
  holiday?: HolidayEntry;
  /* The stretch that is currently open, or the next one today. */
  period?: HoursPeriod;
}

/* Is this location open at this instant?
 *
 * The order is the whole point: holiday first, then the weekly hours. A holiday
 * closes a location that is otherwise open 24 hours a day, which is rule 1 at the
 * top of this file and the one that costs a company an answered phone on
 * Christmas Day when it is got the wrong way round. */
export const resolveOpenState = ({
  at,
  timezone,
  hours,
  holidays,
}: {
  at: Date;
  timezone?: string;
  hours: WeeklyHours;
  holidays: HolidayEntry[];
}): Resolution => {
  const moment = localMomentAt(at, timezone);
  const holiday = findHoliday(moment.dayKey, holidays);

  if (holiday) {
    return {
      state: 'holiday',
      reason: `Closed for ${holiday.title}.`,
      holiday,
    };
  }

  if (hours.alwaysOpen) {
    return { state: 'open', reason: 'Open — this location takes calls at any hour.' };
  }

  const periods = (hours.days[moment.day] || [])
    .map((period) => ({
      period,
      start: toMinutes(period.start),
      end: toMinutes(period.end),
    }))
    .filter((entry) => entry.start !== null && entry.end !== null && entry.end! > entry.start!)
    .sort((a, b) => a.start! - b.start!);

  if (!periods.length) {
    return {
      state: 'closed',
      reason: `Closed — ${DAY_LABELS[moment.day]} is not an opening day here.`,
    };
  }

  /* Open from the opening time up to but not including the closing time. A call
     landing at exactly the closing time is out of hours. */
  const current = periods.find(
    (entry) => moment.minutes >= entry.start! && moment.minutes < entry.end!,
  );
  if (current) {
    return {
      state: 'open',
      reason: `Open until ${fromMinutes(current.end!)} local time.`,
      period: current.period,
    };
  }

  const next = periods.find((entry) => moment.minutes < entry.start!);
  if (next) {
    return {
      state: 'closed',
      reason: `Closed — opens at ${fromMinutes(next.start!)} local time.`,
      period: next.period,
    };
  }

  return {
    state: 'closed',
    reason: `Closed for the day — shut at ${fromMinutes(periods[periods.length - 1].end!)} local time.`,
    period: periods[periods.length - 1].period,
  };
};

/* A short description of a week, for a table cell. "Mon-Fri 09:00-17:00" where
   the week is uniform, and a day count where it is not, because nine words of
   times in one column is unreadable. */
export const describeWeeklyHours = (hours: WeeklyHours): string => {
  if (hours.alwaysOpen) return '24 hours';

  const openDays = DAY_KEYS.filter((day) => (hours.days[day] || []).length > 0);
  if (!openDays.length) return 'Never open';

  const signature = (day: DayKey) =>
    (hours.days[day] || []).map((period) => `${period.start}-${period.end}`).join(', ');

  const first = signature(openDays[0]);
  const uniform = openDays.every((day) => signature(day) === first);

  const shortLabel = (day: DayKey) => DAY_LABELS[day].slice(0, 3);
  const contiguous = openDays.every(
    (day, index) => index === 0 || DAY_KEYS.indexOf(day) === DAY_KEYS.indexOf(openDays[index - 1]) + 1,
  );

  if (uniform && contiguous && openDays.length > 1) {
    return `${shortLabel(openDays[0])}–${shortLabel(openDays[openDays.length - 1])} ${first}`;
  }
  if (uniform) {
    return `${openDays.map(shortLabel).join(', ')} ${first}`;
  }
  return `${openDays.length} open days, hours vary`;
};
