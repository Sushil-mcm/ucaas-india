const {
  toMinutes, fromMinutes, toDayKey,
  readWeeklyHours, readLineHolidays,
  checkWeeklyHours, checkHolidayList, MAX_PERIODS_PER_DAY,
  localMomentAt, findHoliday, resolveOpenState, describeWeeklyHours,
} = require('./location-hours.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };
const msgs = (p) => p.map(x => x.message).join(' | ');

/* A week that is open 09:00-17:00 Monday to Friday, in the shape the app stores. */
const weekday = { open: true, start: '09:00', end: '17:00', is_checked: false };
const weekend = { open: false, start: '', end: '', is_checked: false };
const NINE_TO_FIVE = {
  type: 'weekly',
  value: {
    monday: weekday, tuesday: weekday, wednesday: weekday,
    thursday: weekday, friday: weekday, saturday: weekend, sunday: weekend,
  },
};

console.log('  --- times ---');
t('a proper time becomes minutes', toMinutes('09:30') === 570);
t('midnight is zero, not falsy-by-accident', toMinutes('00:00') === 0);
t('a single-digit hour is refused rather than guessed', toMinutes('9:30') === null);
t('an impossible hour is refused', toMinutes('25:00') === null);
t('an impossible minute is refused', toMinutes('09:75') === null);
t('empty is refused', toMinutes('') === null);
t('minutes come back as HH:MM', fromMinutes(570) === '09:30' && fromMinutes(0) === '00:00');

console.log('  --- calendar days ---');
t('a stored date keeps its day', toDayKey('2026-12-25') === '2026-12-25');
t('a timestamp is cut back to the day', toDayKey('2026-12-25T23:30:00Z') === '2026-12-25');
t('a Date is read locally, so it cannot slip a day',
  toDayKey(new Date(2026, 11, 25, 1, 0, 0)) === '2026-12-25');

console.log('  --- reading stored hours ---');
let hours = readWeeklyHours(NINE_TO_FIVE);
t('weekdays come back open', hours.days.monday.length === 1 && hours.days.monday[0].end === '17:00');
t('a day switched off contributes nothing', hours.days.saturday.length === 0);
t('24 hours reads as always open', readWeeklyHours({ type: '24_hours' }).alwaysOpen === true);
t('nothing stored reads as always open', readWeeklyHours(null).alwaysOpen === true);
t('a day that kept old times while switched off stays shut',
  readWeeklyHours({ type: 'weekly', value: { saturday: { open: false, start: '09:00', end: '17:00' } } })
    .days.saturday.length === 0);
t('split hours are read as two periods',
  readWeeklyHours({
    type: 'weekly',
    value: { monday: { open: true, periods: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] } },
  }).days.monday.length === 2);

console.log('  --- checking a week ---');
t('an ordinary week has nothing wrong', checkWeeklyHours(readWeeklyHours(NINE_TO_FIVE)).length === 0);
t('always open has nothing wrong', checkWeeklyHours(readWeeklyHours({ type: '24_hours' })).length === 0);

let p = checkWeeklyHours(readWeeklyHours({
  type: 'weekly', value: { monday: { open: true, start: '17:00', end: '09:00' } },
}));
t('closing before opening is blocking', p.some(x => x.blocking));
t('and the week is then reported as never open too',
  p.some(x => /never open/.test(x.message)));
t('and says both times', /closes at 09:00, before it opens at 17:00/.test(msgs(p)));

p = checkWeeklyHours(readWeeklyHours({
  type: 'weekly', value: { monday: { open: true, start: '17:00', end: '17:00' } },
}));
t('opening and closing at the same time is never open', /never open/.test(msgs(p)));

p = checkWeeklyHours(readWeeklyHours({
  type: 'weekly', value: { monday: { open: true, start: '9:00', end: '17:00' } },
}));
t('a malformed time is blocking', p.some(x => x.blocking && /HH:MM/.test(x.message)));

p = checkWeeklyHours(readWeeklyHours({
  type: 'weekly',
  value: { monday: { open: true, periods: [{ start: '09:00', end: '13:00' }, { start: '12:00', end: '17:00' }] } },
}));
t('overlapping periods are reported', /overlap/.test(msgs(p)));
t('but are not blocking — the hours still behave', p.every(x => !x.blocking));

p = checkWeeklyHours(readWeeklyHours({
  type: 'weekly',
  value: { monday: { open: true, periods: [{ start: '09:00', end: '12:00' }, { start: '12:00', end: '17:00' }] } },
}));
t('periods that merely touch do not overlap', p.length === 0);

const manyPeriods = Array.from({ length: MAX_PERIODS_PER_DAY + 1 }, (_, i) => ({
  start: fromMinutes(i * 120), end: fromMinutes(i * 120 + 60),
}));
p = checkWeeklyHours(readWeeklyHours({ type: 'weekly', value: { monday: { open: true, periods: manyPeriods } } }));
t('more than four stretches in a day is flagged', /more than 4 opening times/.test(msgs(p)));

p = checkWeeklyHours(readWeeklyHours({ type: 'weekly', value: { monday: weekend } }));
t('a week with no open day at all is blocking', p.some(x => x.blocking && /never open/.test(x.message)));

console.log('  --- checking holidays ---');
const XMAS = { title: 'Christmas Day', from: '2026-12-25', to: '2026-12-25' };
t('one good holiday is accepted', checkHolidayList([XMAS]).length === 0);
t('a nameless holiday is refused',
  checkHolidayList([{ from: '2026-12-25', to: '2026-12-25' }]).some(x => x.blocking && /needs a name/.test(x.message)));
t('a dateless holiday is refused',
  checkHolidayList([{ title: 'Some day' }]).some(x => x.blocking && /needs a date/.test(x.message)));
t('a holiday that ends before it starts is refused',
  checkHolidayList([{ title: 'Shutdown', from: '2026-12-27', to: '2026-12-24' }])
    .some(x => x.blocking && /ends before it starts/.test(x.message)));

p = checkHolidayList([XMAS, { title: 'Winter shutdown', from: '2026-12-24', to: '2026-12-31' }]);
t('two holidays covering the same day are reported', /already covers/.test(msgs(p)));
t('and named, so the admin knows which two', /Christmas Day/.test(msgs(p)));
t('but not blocking — one of them simply wins', p.every(x => !x.blocking));

t('the same holiday listed once over a range is not a clash with itself',
  checkHolidayList([{ title: 'Winter shutdown', from: '2026-12-24', to: '2026-12-31' }]).length === 0);

t('two yearly holidays on the same date clash whatever year they were declared',
  /already covers/.test(msgs(checkHolidayList([
    { title: 'Christmas Day', from: '2019-12-25', to: '2019-12-25', repeatsYearly: true },
    { title: 'Christmas', from: '2026-12-25', to: '2026-12-25', repeatsYearly: true },
  ]))));

console.log('  --- the location clock ---');
/* 18:30 UTC on Friday 25 December 2026. */
const instant = new Date('2026-12-25T18:30:00Z');
let m = localMomentAt(instant, 'Europe/London');
t('London reads 18:30 on the 25th', m.dayKey === '2026-12-25' && m.minutes === 18 * 60 + 30);
m = localMomentAt(instant, 'Asia/Kolkata');
t('Mumbai has already turned midnight into the 26th', m.dayKey === '2026-12-26' && m.minutes === 0);
t('and calls it Saturday', m.day === 'saturday');
m = localMomentAt(instant, 'America/Los_Angeles');
t('Los Angeles is still on Friday morning', m.dayKey === '2026-12-25' && m.minutes === 10 * 60 + 30);
t('an unknown timezone does not throw', typeof localMomentAt(instant, 'Not/AZone').minutes === 'number');
t('no timezone does not throw', typeof localMomentAt(instant, '').minutes === 'number');

console.log('  --- finding the holiday for a day ---');
t('a single-day holiday is found', findHoliday('2026-12-25', [XMAS]).title === 'Christmas Day');
t('the day before is not', findHoliday('2026-12-24', [XMAS]) === null);
const SHUTDOWN = { title: 'Winter shutdown', from: '2026-12-24', to: '2027-01-02' };
t('a range covers its middle', findHoliday('2026-12-28', [SHUTDOWN]).title === 'Winter shutdown');
t('a range covers its last day', findHoliday('2027-01-02', [SHUTDOWN]).title === 'Winter shutdown');
t('and stops after it', findHoliday('2027-01-03', [SHUTDOWN]) === null);
t('a yearly holiday matches a later year',
  findHoliday('2031-12-25', [{ ...XMAS, repeatsYearly: true }]).title === 'Christmas Day');
t('a one-off holiday does not match a later year', findHoliday('2031-12-25', [XMAS]) === null);

console.log('  --- precedence: the location wins over the company ---');
const mixed = [
  { title: 'Company shutdown', from: '2026-12-25', to: '2026-12-25', source: 'company' },
  { title: 'Branch trading day', from: '2026-12-25', to: '2026-12-25', source: 'location' },
];
t('the location holiday is the one that decides',
  findHoliday('2026-12-25', mixed).title === 'Branch trading day');
t('order in the list does not change that',
  findHoliday('2026-12-25', [...mixed].reverse()).title === 'Branch trading day');
t('the company holiday still applies on a day the location has nothing for',
  findHoliday('2026-12-26', [
    { title: 'Boxing Day', from: '2026-12-26', to: '2026-12-26', source: 'company' },
    ...mixed,
  ]).title === 'Boxing Day');

console.log('  --- open or closed ---');
const office = readWeeklyHours(NINE_TO_FIVE);
const openState = (iso, zone, holidays = []) =>
  resolveOpenState({ at: new Date(iso), timezone: zone, hours: office, holidays });

t('Friday 11:00 in London is open', openState('2026-12-18T11:00:00Z', 'Europe/London').state === 'open');
t('and says when it shuts', /Open until 17:00/.test(openState('2026-12-18T11:00:00Z', 'Europe/London').reason));
t('Friday 19:00 in London is closed', openState('2026-12-18T19:00:00Z', 'Europe/London').state === 'closed');
t('Sunday is closed with the day named',
  /Sunday is not an opening day/.test(openState('2026-12-20T11:00:00Z', 'Europe/London').reason));

t('exactly the opening minute is open', openState('2026-12-18T09:00:00Z', 'Europe/London').state === 'open');
t('exactly the closing minute is closed', openState('2026-12-18T17:00:00Z', 'Europe/London').state === 'closed');
t('one minute before closing is still open', openState('2026-12-18T16:59:00Z', 'Europe/London').state === 'open');

t('before opening, the closed reason says when it opens',
  /opens at 09:00/.test(openState('2026-12-18T07:00:00Z', 'Europe/London').reason));
t('after closing, the closed reason says it has shut for the day',
  /shut at 17:00/.test(openState('2026-12-18T19:00:00Z', 'Europe/London').reason));

console.log('  --- the same instant, two locations ---');
/* 11:00 UTC on a Friday: inside London hours, past Mumbai hours (16:30 local). */
t('London is open', openState('2026-12-18T11:00:00Z', 'Europe/London').state === 'open');
t('Mumbai is open at 16:30 local', openState('2026-12-18T11:00:00Z', 'Asia/Kolkata').state === 'open');
t('but shut by 18:00 local while London is still working',
  openState('2026-12-18T12:31:00Z', 'Asia/Kolkata').state === 'closed' &&
  openState('2026-12-18T12:31:00Z', 'Europe/London').state === 'open');

console.log('  --- a holiday beats the hours ---');
t('a holiday closes an ordinary open day',
  openState('2026-12-25T11:00:00Z', 'Europe/London', [XMAS]).state === 'holiday');
t('and the reason names it',
  /Closed for Christmas Day/.test(openState('2026-12-25T11:00:00Z', 'Europe/London', [XMAS]).reason));

const always = { alwaysOpen: true, days: readWeeklyHours(null).days };
t('a 24-hour location is open at 3am',
  resolveOpenState({ at: new Date('2026-12-18T03:00:00Z'), timezone: 'Europe/London', hours: always, holidays: [] })
    .state === 'open');
t('but a holiday still shuts it — the rule people get wrong',
  resolveOpenState({ at: new Date('2026-12-25T03:00:00Z'), timezone: 'Europe/London', hours: always, holidays: [XMAS] })
    .state === 'holiday');

t('a holiday is judged on the location clock, not the reader clock',
  /* 20:00 UTC on the 24th is already the 25th in Mumbai, so Mumbai is on holiday
     while London is not. */
  resolveOpenState({ at: new Date('2026-12-24T20:00:00Z'), timezone: 'Asia/Kolkata', hours: always, holidays: [XMAS] })
    .state === 'holiday' &&
  resolveOpenState({ at: new Date('2026-12-24T20:00:00Z'), timezone: 'Europe/London', hours: always, holidays: [XMAS] })
    .state === 'open');

t('a company holiday closes a location that has none of its own',
  resolveOpenState({
    at: new Date('2026-12-25T11:00:00Z'), timezone: 'Europe/London', hours: office,
    holidays: [{ ...XMAS, source: 'company' }],
  }).holiday.source === 'company');
t('and the location’s own holiday is the one named when both exist',
  resolveOpenState({
    at: new Date('2026-12-25T11:00:00Z'), timezone: 'Europe/London', hours: office,
    holidays: [{ ...XMAS, source: 'company' }, { title: 'Branch closure', from: '2026-12-25', to: '2026-12-25', source: 'location' }],
  }).holiday.title === 'Branch closure');

console.log('  --- reading a line’s own holidays ---');
const lineHolidays = readLineHolidays({
  holidays: [
    { title: 'Christmas Day', from: '2026-12-25', to: '2026-12-25', repeats_yearly: true },
    { title: '', from: '2026-01-01' },
    { from: '2026-01-01' },
  ],
});
t('nameless rows are dropped', lineHolidays.length === 1);
t('the snake-case repeat flag is understood', lineHolidays[0].repeatsYearly === true);
t('and they are marked as belonging to the location', lineHolidays[0].source === 'location');

console.log('  --- describing a week in one line ---');
t('a plain week reads as a range', describeWeeklyHours(office) === 'Mon–Fri 09:00-17:00');
t('always open says so', describeWeeklyHours({ alwaysOpen: true, days: office.days }) === '24 hours');
t('a week with nothing open says so',
  describeWeeklyHours(readWeeklyHours({ type: 'weekly', value: {} })) === 'Never open');
t('days that are not next to each other are listed',
  describeWeeklyHours(readWeeklyHours({
    type: 'weekly', value: { monday: weekday, wednesday: weekday },
  })) === 'Mon, Wed 09:00-17:00');
t('a week whose days differ says the hours vary',
  /hours vary/.test(describeWeeklyHours(readWeeklyHours({
    type: 'weekly',
    value: { monday: weekday, tuesday: { open: true, start: '10:00', end: '16:00' } },
  }))));

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
