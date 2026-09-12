import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  callingDayCount,
  dayIn,
  defaultCampaignDates,
  describeWindow,
  followZoneDates,
  reportWindowFor,
  storedDay,
  windowDayCount,
} from './campaign-dates';

/* 9 Sep 2026 18:36 UTC: 14:36 in New York, 00:06 on 10 Sep in Kolkata - the
   moment campaign 215c was created in the live test. */
const AT = new Date('2026-09-09T18:36:00Z');

test('today is read in the campaign zone, not the browser zone', () => {
  assert.equal(dayIn('America/New_York', AT), '2026-09-09');
  assert.equal(dayIn('Asia/Kolkata', AT), '2026-09-10');
});

test('an unknown or missing zone falls back to the local day rather than throwing', () => {
  assert.match(dayIn('', AT), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(dayIn('Mars/Olympus', AT), /^\d{4}-\d{2}-\d{2}$/);
});

test('a new campaign starts today in its zone and ends a month later', () => {
  assert.deepEqual(defaultCampaignDates('America/New_York', AT), {
    startDate: '2026-09-09',
    endDate: '2026-10-09',
  });
  assert.deepEqual(defaultCampaignDates('Asia/Kolkata', AT), {
    startDate: '2026-09-10',
    endDate: '2026-10-10',
  });
});

test('a stored start (midnight in the zone, kept as UTC) reads back as the day it was saved as', () => {
  /* The live predictive test campaign: startDate 2026-09-09T04:00Z, America/New_York. */
  assert.equal(storedDay('2026-09-09T04:00:00.000Z', 'America/New_York'), '2026-09-09');
  assert.equal(storedDay(new Date('2026-10-10T04:00:00.000Z'), 'America/New_York'), '2026-10-10');
  assert.equal(storedDay('', 'America/New_York'), '');
  assert.equal(storedDay('not a date', 'America/New_York'), '');
});

test('the window counts every calendar day, both ends included', () => {
  assert.equal(windowDayCount('2026-09-10', '2026-10-10'), 31);
  assert.equal(windowDayCount('2026-09-10', '2026-09-10'), 1);
  assert.equal(windowDayCount('2026-09-10', '2026-09-09'), 0);
  assert.equal(windowDayCount('', '2026-09-09'), 0);
});

const WEEKDAYS = {
  monday: { open: true },
  tuesday: { open: true },
  wednesday: { open: true },
  thursday: { open: true },
  friday: { open: true },
  saturday: { open: false },
  sunday: { open: false },
};

test('calling days are the open weekdays inside the window', () => {
  /* 10 Sep 2026 is a Thursday and 10 Oct a Saturday: 31 days, 22 weekdays.
     So the "22 Days" the wizard showed was the weekday count, unlabelled. */
  assert.equal(callingDayCount('2026-09-10', '2026-10-10', WEEKDAYS), 22);
  assert.equal(callingDayCount('2026-09-10', '2026-10-10', { ...WEEKDAYS, saturday: { open: true }, sunday: { open: true } }), 31);
  assert.equal(callingDayCount('2026-09-10', '2026-10-10', {}), 0);
  assert.equal(callingDayCount('2026-09-12', '2026-09-13', WEEKDAYS), 0);
});

test('the chip says both numbers, so "22 Days" for a month is no longer a puzzle', () => {
  assert.equal(describeWindow('2026-09-10', '2026-10-10', WEEKDAYS), '31 days · 22 calling');
  assert.equal(describeWindow('2026-09-10', '2026-09-10', WEEKDAYS), '1 day · 1 calling');
  assert.equal(describeWindow('', '', WEEKDAYS), '0 days');
});

/* The live predictive test campaign (6aa1a9e6…): New York, started 9 Sep,
   planned to 10 Oct, completed 18:52:52Z on 9 Sep. */
const PREDICTIVE = {
  startDate: '2026-09-09T04:00:00.000Z',
  endDate: '2026-10-10T04:00:00.000Z',
  timezone: 'America/New_York',
  updatedAt: '2026-09-09T18:52:52.789Z',
};

test('a finished campaign\'s call-log window is its run, in its own zone', () => {
  const later = new Date('2026-09-10T03:00:00Z'); /* 10 Sep 08:30 in India, still 9 Sep in New York */
  assert.deepEqual(reportWindowFor({ ...PREDICTIVE, campaignStatus: 'COMPLETED' }, later), {
    from: '2026-09-09',
    to: '2026-09-09',
    timezone: 'America/New_York',
  });
  /* Viewed a week later it still ends on the day it finished. */
  assert.deepEqual(reportWindowFor({ ...PREDICTIVE, campaignStatus: 'COMPLETED' }, new Date('2026-09-16T12:00:00Z')), {
    from: '2026-09-09',
    to: '2026-09-09',
    timezone: 'America/New_York',
  });
});

test('a running campaign\'s window runs to today in the campaign zone, not the viewer\'s', () => {
  const later = new Date('2026-09-10T03:00:00Z');
  assert.deepEqual(reportWindowFor({ ...PREDICTIVE, campaignStatus: 'PROCESSING' }, later), {
    from: '2026-09-09',
    to: '2026-09-09',
    timezone: 'America/New_York',
  });
});

test('a finished campaign edited afterwards still ends on its end date, and the window never runs backwards', () => {
  assert.deepEqual(
    reportWindowFor(
      { ...PREDICTIVE, endDate: '2026-09-12T04:00:00.000Z', campaignStatus: 'COMPLETED', updatedAt: '2026-09-20T10:00:00Z' },
      new Date('2026-09-25T12:00:00Z'),
    ),
    { from: '2026-09-09', to: '2026-09-12', timezone: 'America/New_York' },
  );
  const w = reportWindowFor({ startDate: '2026-09-20T04:00:00.000Z', timezone: 'America/New_York', campaignStatus: 'COMPLETED', updatedAt: '2026-09-01T00:00:00Z' }, new Date('2026-09-25T12:00:00Z'));
  assert.equal(w.from <= w.to, true);
});

test('the window is capped at the report\'s 93 days', () => {
  const w = reportWindowFor({ startDate: '2026-01-01T05:00:00.000Z', timezone: 'America/New_York', campaignStatus: 'PROCESSING' }, new Date('2026-09-10T12:00:00Z'));
  assert.equal(w.from, '2026-06-10');
  assert.equal(w.to, '2026-09-10');
});

/* ── T1, 10 Sep: the wizard's dates in the campaign's zone ──────────────── */

/* 10 Sep 2026 00:30 in Kolkata is 9 Sep 15:00 in New York (19:00 UTC): the
   Indian tester is already on tomorrow, the campaign is not. */
const INDIAN_MIDNIGHT = new Date('2026-09-09T19:00:00Z');

test('after midnight in India, today in America/New_York is still yesterday\'s date', () => {
  assert.equal(dayIn('Asia/Kolkata', INDIAN_MIDNIGHT), '2026-09-10');
  assert.equal(dayIn('America/New_York', INDIAN_MIDNIGHT), '2026-09-09');
  /* And the wizard's default start is that New York day, not the browser's. */
  assert.equal(defaultCampaignDates('America/New_York', INDIAN_MIDNIGHT).startDate, '2026-09-09');
  /* The line under the dates: "Dates are in America/New_York, where today is 2026-09-09." */
  assert.equal(`Dates are in America/New_York, where today is ${dayIn('America/New_York', INDIAN_MIDNIGHT)}.`,
    'Dates are in America/New_York, where today is 2026-09-09.');
});

test('the dates follow a zone change until somebody types a date', () => {
  /* Form created from the browser (India): 10 Sep. The Hours step then settles New York. */
  const fromBrowser = defaultCampaignDates('Asia/Kolkata', INDIAN_MIDNIGHT);
  assert.deepEqual(fromBrowser, { startDate: '2026-09-10', endDate: '2026-10-10' });
  const toNewYork = followZoneDates(
    { isEditMode: false, timezone: 'America/New_York', datesTouched: false, ...fromBrowser },
    INDIAN_MIDNIGHT,
  );
  assert.deepEqual(toNewYork, { startDate: '2026-09-09', endDate: '2026-10-09' });
  /* Zone changed back to Kolkata: the start moves to today in Kolkata. */
  const backToKolkata = followZoneDates(
    { isEditMode: false, timezone: 'Asia/Kolkata', datesTouched: false, ...toNewYork },
    INDIAN_MIDNIGHT,
  );
  assert.deepEqual(backToKolkata, { startDate: '2026-09-10', endDate: '2026-10-10' });
  /* Same zone, same dates: nothing to write. */
  assert.equal(
    followZoneDates({ isEditMode: false, timezone: 'Asia/Kolkata', datesTouched: false, ...backToKolkata }, INDIAN_MIDNIGHT),
    null,
  );
});

test('a typed date stands: a zone change after that moves nothing', () => {
  const typed = { startDate: '2026-09-15', endDate: '2026-09-30' };
  assert.equal(
    followZoneDates({ isEditMode: false, timezone: 'Asia/Kolkata', datesTouched: true, ...typed }, INDIAN_MIDNIGHT),
    null,
  );
  /* An existing campaign keeps what it saved, whatever the zone. */
  assert.equal(
    followZoneDates({ isEditMode: true, timezone: 'Asia/Kolkata', datesTouched: false, ...typed }, INDIAN_MIDNIGHT),
    null,
  );
  /* No zone chosen yet: the browser's dates stay until the Hours step settles one. */
  assert.equal(
    followZoneDates({ isEditMode: false, timezone: '', datesTouched: false, ...typed }, INDIAN_MIDNIGHT),
    null,
  );
});

test('the day chip for the default window: 10 Sep to 10 Oct is 31 days, 22 calling', () => {
  /* What the wizard shows on 10 Sep in New York: start today, end a month on. */
  const at = new Date('2026-09-10T14:00:00Z');
  const dates = defaultCampaignDates('America/New_York', at);
  assert.deepEqual(dates, { startDate: '2026-09-10', endDate: '2026-10-10' });
  assert.equal(windowDayCount(dates.startDate, dates.endDate), 31);
  assert.equal(callingDayCount(dates.startDate, dates.endDate, WEEKDAYS), 22);
  assert.equal(describeWindow(dates.startDate, dates.endDate, WEEKDAYS), '31 days · 22 calling');
  /* The live campaign 215 (9 Sep to 10 Oct) is one day longer: 32 days, 23 weekdays.
     Its end was a month from the browser's day, not from its own start. */
  assert.equal(describeWindow('2026-09-09', '2026-10-10', WEEKDAYS), '32 days · 23 calling');
  /* Weekends on: every day is a calling day. */
  assert.equal(
    describeWindow(dates.startDate, dates.endDate, { ...WEEKDAYS, saturday: { open: true }, sunday: { open: true } }),
    '31 days · 31 calling',
  );
});
