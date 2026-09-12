import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campaignWindow, explainEmptyOffer, retryPeriodMs } from './campaign-window';

/* Fixtures are the live campaigns from the 9 Sep 2026 test, trimmed. */
const adakCampaign = {
  timezone: 'America/Adak',
  startDate: '2026-09-09T09:00:00.000Z',
  endDate: '2026-09-17T09:00:00.000Z',
  settings: {
    operational_hours: {
      value: {
        monday: { open: true, start: '09:00', end: '17:00' },
        tuesday: { open: true, start: '09:00', end: '17:00' },
        wednesday: { open: true, start: '09:00', end: '17:00' },
        thursday: { open: true, start: '09:00', end: '17:00' },
        friday: { open: true, start: '09:00', end: '17:00' },
        saturday: { open: true, start: '10:00', end: '23:00' },
        sunday: { open: false, start: '', end: '' },
      },
      holidays: [],
    },
  },
};

const kolkataCampaign = {
  timezone: 'Asia/Kolkata',
  startDate: '2026-09-08T18:30:00.000Z',
  endDate: '2026-09-16T18:30:00.000Z',
  require_consent: true,
  dialerSetting: { default_retry_period: 3, default_retry_period_type: 'min' },
  settings: {
    operational_hours: {
      value: {
        monday: { open: true, start: '09:00', end: '17:00' },
        tuesday: { open: true, start: '09:00', end: '17:00' },
        wednesday: { open: true, start: '09:00', end: '17:00' },
        thursday: { open: true, start: '09:00', end: '17:00' },
        friday: { open: true, start: '09:00', end: '17:00' },
        saturday: { open: false, start: '', end: '' },
        sunday: { open: false, start: '', end: '' },
      },
      holidays: [],
    },
  },
};

test('a US campaign left on America/Adak is closed at 11:45 in India', () => {
  // 2026-09-09 06:15Z is a Wednesday, 21:15 the previous evening in Adak.
  const w = campaignWindow(adakCampaign, new Date('2026-09-09T06:15:00Z'));
  assert.equal(w.open, false);
  assert.equal(w.timezone, 'America/Adak');
  assert.match(w.reason, /Before the campaign start date|Calling hours are 09:00-17:00/);
});

test('the same campaign is open at 19:00Z once its start date has passed', () => {
  // Wednesday 19:00Z = 10:00 in Adak (UTC-9 in summer), inside 09:00-17:00.
  const w = campaignWindow(adakCampaign, new Date('2026-09-09T19:00:00Z'));
  assert.equal(w.open, true);
  assert.equal(w.reason, 'Open 09:00-17:00.');
});

test('the India campaign is open at 11:45 IST on a Wednesday', () => {
  const w = campaignWindow(kolkataCampaign, new Date('2026-09-09T06:15:00Z'));
  assert.equal(w.open, true);
});

test('the India campaign is closed on Saturday', () => {
  const w = campaignWindow(kolkataCampaign, new Date('2026-09-12T06:15:00Z'));
  assert.equal(w.open, false);
  assert.equal(w.reason, 'Closed on Saturdays.');
});

test('bounds are inclusive, like the server', () => {
  // 17:00 IST exactly = 11:30Z.
  assert.equal(campaignWindow(kolkataCampaign, new Date('2026-09-09T11:30:00Z')).open, true);
  assert.equal(campaignWindow(kolkataCampaign, new Date('2026-09-09T11:31:00Z')).open, false);
});

test('no calling hours means open all day', () => {
  const w = campaignWindow({ timezone: 'UTC' }, new Date('2026-09-09T02:00:00Z'));
  assert.equal(w.open, true);
});

test('a holiday closes the day', () => {
  const c = {
    ...kolkataCampaign,
    settings: { operational_hours: { ...kolkataCampaign.settings.operational_hours, holidays: ['2026-09-09'] } },
  };
  assert.equal(campaignWindow(c, new Date('2026-09-09T06:15:00Z')).reason, 'Today is a campaign holiday.');
});

test('an unknown zone falls back to UTC instead of throwing', () => {
  const w = campaignWindow({ timezone: 'Mars/Olympus' }, new Date('2026-09-09T06:15:00Z'));
  assert.equal(w.timezone, 'UTC');
});

test('retry period reads both the plain and the {label,value} shapes', () => {
  assert.equal(retryPeriodMs({ default_retry_period: 3, default_retry_period_type: 'min' }), 180_000);
  assert.equal(
    retryPeriodMs({ default_retry_period: 2, default_retry_period_type: { label: 'Hours', value: 'hour' } }),
    7_200_000,
  );
  assert.equal(retryPeriodMs({ default_retry_period: 1, default_retry_period_type: 'day' }), 86_400_000);
  assert.equal(retryPeriodMs({}), 0);
});

test('closed window is explained first and stops the countdown', () => {
  const e = explainEmptyOffer({ campaign: adakCampaign, now: new Date('2026-09-09T06:15:00Z') });
  if (!e) throw new Error('expected an explanation');
  assert.equal(e.terminal, true);
  assert.match(e.message, /Outside this campaign's calling hours/);
  assert.match(e.message, /America\/Adak/);
});

test('a consent-only campaign says so, and stops the countdown', () => {
  const e = explainEmptyOffer({ campaign: kolkataCampaign, now: new Date('2026-09-09T06:15:00Z') });
  if (!e) throw new Error('expected an explanation');
  assert.equal(e.terminal, true);
  assert.match(e.message, /consent on file/);
});

test('a fresh skip explains the wait and keeps the countdown going', () => {
  const c = { ...kolkataCampaign, require_consent: false };
  const now = new Date('2026-09-09T06:15:00Z');
  const e = explainEmptyOffer({ campaign: c, now, lastSkipAt: now.getTime() - 60_000 });
  if (!e) throw new Error('expected an explanation');
  assert.equal(e.terminal, false);
  assert.match(e.message, /comes back in about 2 minutes/);
});

test('once the retry period has passed a skip explains nothing', () => {
  const c = { ...kolkataCampaign, require_consent: false };
  const now = new Date('2026-09-09T06:15:00Z');
  assert.equal(explainEmptyOffer({ campaign: c, now, lastSkipAt: now.getTime() - 400_000 }), null);
});

test('nothing to explain returns null so the ordinary text shows', () => {
  const c = { ...kolkataCampaign, require_consent: false };
  assert.equal(explainEmptyOffer({ campaign: c, now: new Date('2026-09-09T06:15:00Z') }), null);
});

import { hoursStopNotice, nextOpening } from './campaign-window';

/* 09:00-17:00 Mon-Fri in Kolkata (UTC+5:30); Saturday 10:00-23:00; Sunday closed. */
const kolkata = {
  name: 'Testing Preview',
  timezone: 'Asia/Kolkata',
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2026-12-01T00:00:00.000Z',
  settings: { operational_hours: { value: adakCampaign.settings.operational_hours.value, holidays: [] } },
};

test('next opening: later today, tomorrow, or the next open day', () => {
  // Tue 9 Sep 2026 02:00 UTC = 07:30 Kolkata, before the 09:00 start
  assert.equal(nextOpening(kolkata, new Date('2026-09-09T02:00:00Z')), 'today at 09:00');
  // Tue 13:00 UTC = 18:30 Kolkata, after the 17:00 end
  assert.equal(nextOpening(kolkata, new Date('2026-09-09T13:00:00Z')), 'tomorrow at 09:00');
  // Sat 12 Sep 19:00 UTC = 00:30 Sunday Kolkata; Sunday closed -> Monday, which is tomorrow
  assert.equal(nextOpening(kolkata, new Date('2026-09-12T19:00:00Z')), 'tomorrow at 09:00');
  // Sat 12 Sep 13:00 UTC = 18:30 Saturday Kolkata (open till 23:00); next start is Monday
  assert.equal(nextOpening(kolkata, new Date('2026-09-12T13:00:00Z')), 'Monday at 09:00');
  assert.equal(nextOpening({ timezone: 'UTC', settings: {} }), 'straight away');
});

test('the stop notice names the campaign, the reason, the zone and the restart', () => {
  const notice = hoursStopNotice(
    { ...kolkata, pausedBy: 'HOURS', pausedReason: 'Calling hours are 09:00-17:00 today.' },
    new Date('2026-09-09T13:00:00Z'),
  );
  assert.equal(notice.title, 'Testing Preview has stopped: calling hours ended');
  assert.match(notice.text, /Calling hours are 09:00-17:00 today \(Asia\/Kolkata\)\. No more calls will be dialled\./);
  assert.match(notice.text, /starts again automatically tomorrow at 09:00 \(Asia\/Kolkata\)/);
  const ended = hoursStopNotice({ ...kolkata, pausedReason: 'After the campaign end date.' });
  assert.match(ended.text, /past its end date, so it will not start again on its own/);
});
