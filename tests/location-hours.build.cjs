var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var location_hours_exports = {};
__export(location_hours_exports, {
  DAY_KEYS: () => DAY_KEYS,
  MAX_PERIODS_PER_DAY: () => MAX_PERIODS_PER_DAY,
  checkHolidayList: () => checkHolidayList,
  checkWeeklyHours: () => checkWeeklyHours,
  describeWeeklyHours: () => describeWeeklyHours,
  findHoliday: () => findHoliday,
  fromMinutes: () => fromMinutes,
  localMomentAt: () => localMomentAt,
  readLineHolidays: () => readLineHolidays,
  readWeeklyHours: () => readWeeklyHours,
  resolveOpenState: () => resolveOpenState,
  toDayKey: () => toDayKey,
  toMinutes: () => toMinutes
});
module.exports = __toCommonJS(location_hours_exports);
const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];
const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday"
};
const pad = (value) => `${value}`.padStart(2, "0");
const toMinutes = (value) => {
  const text = `${value ?? ""}`.trim();
  const match = /^(\d{2}):(\d{2})$/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};
const fromMinutes = (value) => `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
const toDayKey = (value) => {
  if (!value) return "";
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const text = `${value}`;
  return text.length >= 10 ? text.slice(0, 10) : text;
};
const emptyWeek = () => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: []
});
const readWeeklyHours = (operationalHours) => {
  const type = `${operationalHours?.type || ""}`;
  if (!operationalHours || type === "24_hours") {
    return { alwaysOpen: true, days: emptyWeek() };
  }
  const stored = operationalHours?.value || {};
  const days = emptyWeek();
  DAY_KEYS.forEach((day) => {
    const entry = stored?.[day];
    if (!entry || entry?.open === false) return;
    const rawPeriods = Array.isArray(entry?.periods) ? entry.periods : [{ start: entry?.start, end: entry?.end }];
    rawPeriods.forEach((period) => {
      const start = `${period?.start ?? ""}`.trim();
      const end = `${period?.end ?? ""}`.trim();
      if (!start && !end) return;
      days[day].push({ start, end });
    });
  });
  return { alwaysOpen: false, days };
};
const readLineHolidays = (operationalHours) => {
  const rows = operationalHours?.holidays;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => row?.title && row?.from).map((row) => ({
    title: `${row.title}`,
    from: toDayKey(row.from),
    to: toDayKey(row.to || row.from),
    repeatsYearly: Boolean(row.repeats_yearly ?? row.repeatsYearly),
    source: "location"
  }));
};
const MAX_PERIODS_PER_DAY = 4;
const checkWeeklyHours = (hours) => {
  const problems = [];
  if (hours.alwaysOpen) return problems;
  let anyOpenDay = false;
  DAY_KEYS.forEach((day) => {
    const periods = hours.days[day] || [];
    if (!periods.length) return;
    const parsed = [];
    periods.forEach((period, index) => {
      const start = toMinutes(period.start);
      const end = toMinutes(period.end);
      if (start === null || end === null) {
        problems.push({
          field: `${day}.${index}`,
          message: `${DAY_LABELS[day]} needs an opening and a closing time, written as HH:MM.`,
          blocking: true
        });
        return;
      }
      if (end <= start) {
        problems.push({
          field: `${day}.${index}`,
          message: end === start ? `${DAY_LABELS[day]} opens and closes at ${period.start}, so it is never open.` : `${DAY_LABELS[day]} closes at ${period.end}, before it opens at ${period.start}.`,
          blocking: true
        });
        return;
      }
      parsed.push({ start, end });
    });
    if (parsed.length) anyOpenDay = true;
    const sorted = [...parsed].sort((a, b) => a.start - b.start);
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].start < sorted[index - 1].end) {
        problems.push({
          field: `${day}.overlap`,
          message: `${DAY_LABELS[day]} has two opening times that overlap \u2014 ${fromMinutes(
            sorted[index - 1].start
          )}-${fromMinutes(sorted[index - 1].end)} and ${fromMinutes(sorted[index].start)}-${fromMinutes(
            sorted[index].end
          )}. Merge them into one.`,
          blocking: false
        });
      }
    }
    if (sorted.length > MAX_PERIODS_PER_DAY) {
      problems.push({
        field: `${day}.count`,
        message: `${DAY_LABELS[day]} has more than ${MAX_PERIODS_PER_DAY} opening times.`,
        blocking: false
      });
    }
  });
  if (!anyOpenDay) {
    problems.push({
      field: "week",
      message: "This location is never open. Set opening times on at least one day.",
      blocking: true
    });
  }
  return problems;
};
const checkHolidayList = (holidays) => {
  const problems = [];
  const seen = /* @__PURE__ */ new Map();
  (holidays || []).forEach((holiday, index) => {
    const title = `${holiday?.title || ""}`.trim();
    if (!title) {
      problems.push({
        field: `holiday.${index}.title`,
        message: "A holiday needs a name, so it can be recognised in the list.",
        blocking: true
      });
    }
    const from = toDayKey(holiday?.from);
    const to = toDayKey(holiday?.to || holiday?.from);
    if (!isDayKey(from) || !isDayKey(to)) {
      problems.push({
        field: `holiday.${index}.from`,
        message: `${title || "This holiday"} needs a date.`,
        blocking: true
      });
      return;
    }
    if (to < from) {
      problems.push({
        field: `holiday.${index}.to`,
        message: `${title || "This holiday"} ends before it starts.`,
        blocking: true
      });
      return;
    }
    eachDay(from, to).forEach((day) => {
      const key = holiday?.repeatsYearly ? `yearly:${day.slice(5)}` : day;
      const existing = seen.get(key);
      if (existing && existing !== title) {
        problems.push({
          field: `holiday.${index}.from`,
          message: `${title || "This holiday"} covers ${day}, which ${existing} already covers. Only one of them will decide what happens.`,
          blocking: false
        });
      } else if (!existing) {
        seen.set(key, title || "another holiday");
      }
    });
  });
  return problems;
};
const isDayKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const eachDay = (from, to) => {
  const start = dayKeyToUtc(from);
  const end = dayKeyToUtc(to);
  if (!start || !end) return [];
  const days = [];
  const cursor = new Date(start.getTime());
  while (cursor.getTime() <= end.getTime() && days.length < 400) {
    days.push(
      `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`
    );
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};
const dayKeyToUtc = (value) => {
  if (!isDayKey(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
const INTL_DAYS = {
  Monday: "monday",
  Tuesday: "tuesday",
  Wednesday: "wednesday",
  Thursday: "thursday",
  Friday: "friday",
  Saturday: "saturday",
  Sunday: "sunday"
};
const localMomentAt = (at, timezone) => {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      ...options,
      ...timezone ? { timeZone: timezone } : {}
    }).formatToParts(at);
  } catch {
    parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(at);
  }
  const read = (type) => parts.find((part) => part.type === type)?.value || "";
  const hour = Number(read("hour")) % 24;
  const minute = Number(read("minute"));
  return {
    day: INTL_DAYS[read("weekday")] || "monday",
    minutes: hour * 60 + minute,
    dayKey: `${read("year")}-${read("month")}-${read("day")}`
  };
};
const findHoliday = (dayKey, holidays) => {
  const ordered = [
    ...(holidays || []).filter((holiday) => holiday?.source !== "company"),
    ...(holidays || []).filter((holiday) => holiday?.source === "company")
  ];
  for (const holiday of ordered) {
    const from = toDayKey(holiday?.from);
    const to = toDayKey(holiday?.to || holiday?.from);
    if (!isDayKey(from) || !isDayKey(to)) continue;
    if (holiday?.repeatsYearly) {
      if (eachDay(from, to).some((day) => day.slice(5) === dayKey.slice(5))) return holiday;
      continue;
    }
    if (dayKey >= from && dayKey <= to) return holiday;
  }
  return null;
};
const resolveOpenState = ({
  at,
  timezone,
  hours,
  holidays
}) => {
  const moment = localMomentAt(at, timezone);
  const holiday = findHoliday(moment.dayKey, holidays);
  if (holiday) {
    return {
      state: "holiday",
      reason: `Closed for ${holiday.title}.`,
      holiday
    };
  }
  if (hours.alwaysOpen) {
    return { state: "open", reason: "Open \u2014 this location takes calls at any hour." };
  }
  const periods = (hours.days[moment.day] || []).map((period) => ({
    period,
    start: toMinutes(period.start),
    end: toMinutes(period.end)
  })).filter((entry) => entry.start !== null && entry.end !== null && entry.end > entry.start).sort((a, b) => a.start - b.start);
  if (!periods.length) {
    return {
      state: "closed",
      reason: `Closed \u2014 ${DAY_LABELS[moment.day]} is not an opening day here.`
    };
  }
  const current = periods.find(
    (entry) => moment.minutes >= entry.start && moment.minutes < entry.end
  );
  if (current) {
    return {
      state: "open",
      reason: `Open until ${fromMinutes(current.end)} local time.`,
      period: current.period
    };
  }
  const next = periods.find((entry) => moment.minutes < entry.start);
  if (next) {
    return {
      state: "closed",
      reason: `Closed \u2014 opens at ${fromMinutes(next.start)} local time.`,
      period: next.period
    };
  }
  return {
    state: "closed",
    reason: `Closed for the day \u2014 shut at ${fromMinutes(periods[periods.length - 1].end)} local time.`,
    period: periods[periods.length - 1].period
  };
};
const describeWeeklyHours = (hours) => {
  if (hours.alwaysOpen) return "24 hours";
  const openDays = DAY_KEYS.filter((day) => (hours.days[day] || []).length > 0);
  if (!openDays.length) return "Never open";
  const signature = (day) => (hours.days[day] || []).map((period) => `${period.start}-${period.end}`).join(", ");
  const first = signature(openDays[0]);
  const uniform = openDays.every((day) => signature(day) === first);
  const shortLabel = (day) => DAY_LABELS[day].slice(0, 3);
  const contiguous = openDays.every(
    (day, index) => index === 0 || DAY_KEYS.indexOf(day) === DAY_KEYS.indexOf(openDays[index - 1]) + 1
  );
  if (uniform && contiguous && openDays.length > 1) {
    return `${shortLabel(openDays[0])}\u2013${shortLabel(openDays[openDays.length - 1])} ${first}`;
  }
  if (uniform) {
    return `${openDays.map(shortLabel).join(", ")} ${first}`;
  }
  return `${openDays.length} open days, hours vary`;
};
