import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_TIMERS_SECTION,
  DEFAULT_CAMPAIGN_TIMERS,
  TIMER_RANGES,
  campaignTimerSeed,
  clampTimer,
  isWithinRange,
  normaliseCampaignTimers,
  planCampaignTimerSeed,
  resolveCampaignTimer,
} from './campaign-timers';

test('the section name and the decided defaults', () => {
  assert.equal(CAMPAIGN_TIMERS_SECTION, 'campaign_timers');
  assert.deepEqual(DEFAULT_CAMPAIGN_TIMERS, {
    schema_version: 1,
    preview_time: 30,
    wrapup_time: 30,
    wrapup_mode: 'MANDATORY_TIMEOUT',
    wait_after_call: 5,
    contact_retry: 15,
  });
  assert.deepEqual(TIMER_RANGES, {
    preview_time: { min: 10, max: 300 },
    wrapup_time: { min: 10, max: 1200 },
    wait_after_call: { min: 0, max: 60 },
    contact_retry: { min: 5, max: 120 },
  });
});

test('normalise: nothing stored is the defaults', () => {
  assert.deepEqual(normaliseCampaignTimers(undefined), DEFAULT_CAMPAIGN_TIMERS);
  assert.deepEqual(normaliseCampaignTimers(null), DEFAULT_CAMPAIGN_TIMERS);
  assert.deepEqual(normaliseCampaignTimers({}), DEFAULT_CAMPAIGN_TIMERS);
  assert.deepEqual(normaliseCampaignTimers('junk'), DEFAULT_CAMPAIGN_TIMERS);
  assert.deepEqual(normaliseCampaignTimers([1, 2]), DEFAULT_CAMPAIGN_TIMERS);
});

test('normalise: a partial section keeps what it has and fills the rest', () => {
  const out = normaliseCampaignTimers({ preview_time: 45, wrapup_mode: 'OPTIONAL' });
  assert.equal(out.preview_time, 45);
  assert.equal(out.wrapup_mode, 'OPTIONAL');
  assert.equal(out.wrapup_time, 30);
  assert.equal(out.wait_after_call, 5);
  assert.equal(out.contact_retry, 15);
  assert.equal(out.schema_version, 1);
});

test('normalise: out-of-range numbers are clamped, junk becomes the default', () => {
  const out = normaliseCampaignTimers({
    preview_time: 9,
    wrapup_time: 1201,
    wait_after_call: -3,
    contact_retry: 'abc',
    wrapup_mode: 'WHENEVER',
  });
  assert.equal(out.preview_time, 10);
  assert.equal(out.wrapup_time, 1200);
  assert.equal(out.wait_after_call, 0);
  assert.equal(out.contact_retry, 15);
  assert.equal(out.wrapup_mode, 'MANDATORY_TIMEOUT');
});

test('normalise: strings that are numbers count, fractions round', () => {
  const out = normaliseCampaignTimers({ preview_time: '20', wait_after_call: 4.6 });
  assert.equal(out.preview_time, 20);
  assert.equal(out.wait_after_call, 5);
});

test('clampTimer: blank and NaN fall back, the fallback can be given', () => {
  assert.equal(clampTimer('preview_time', ''), 30);
  assert.equal(clampTimer('preview_time', '   '), 30);
  assert.equal(clampTimer('preview_time', NaN), 30);
  assert.equal(clampTimer('preview_time', undefined, 60), 60);
  assert.equal(clampTimer('contact_retry', 0), 5);
  assert.equal(clampTimer('contact_retry', 999), 120);
  assert.equal(clampTimer('wait_after_call', 0), 0);
});

test('isWithinRange: whole numbers inside the range only', () => {
  assert.equal(isWithinRange('preview_time', 10), true);
  assert.equal(isWithinRange('preview_time', 300), true);
  assert.equal(isWithinRange('preview_time', 9), false);
  assert.equal(isWithinRange('preview_time', 301), false);
  assert.equal(isWithinRange('preview_time', 30.5), false);
  assert.equal(isWithinRange('preview_time', 'x'), false);
  assert.equal(isWithinRange('wrapup_time', 1200), true);
  assert.equal(isWithinRange('wrapup_time', 1201), false);
  assert.equal(isWithinRange('wait_after_call', 0), true);
  assert.equal(isWithinRange('wait_after_call', 61), false);
});

test('resolve: campaign value, then company default, then built-in', () => {
  const company = { wait_after_call: 12, contact_retry: 40 };
  assert.equal(resolveCampaignTimer('wait_after_call', { wait_after_call: 3 }, company), 3);
  assert.equal(resolveCampaignTimer('wait_after_call', {}, company), 12);
  assert.equal(resolveCampaignTimer('wait_after_call', undefined, company), 12);
  assert.equal(resolveCampaignTimer('wait_after_call', { wait_after_call: null }, company), 12);
  assert.equal(resolveCampaignTimer('wait_after_call', { wait_after_call: '' }, company), 12);
  assert.equal(resolveCampaignTimer('wait_after_call', {}, null), 5);
  assert.equal(resolveCampaignTimer('contact_retry', {}, company), 40);
  assert.equal(resolveCampaignTimer('contact_retry', {}, undefined), 15);
  /* An old campaign's out-of-range value is clamped, not trusted. */
  assert.equal(resolveCampaignTimer('wait_after_call', { wait_after_call: 500 }, company), 60);
  assert.equal(resolveCampaignTimer('preview_time', { preview_time: 0 }, company), 10);
});

test('seed: a new campaign starts from the company, never carries contact_retry', () => {
  const seed = campaignTimerSeed({ preview_time: 20, wrapup_time: 45, wrapup_mode: 'OPTIONAL', wait_after_call: 3, contact_retry: 10 });
  assert.deepEqual(seed, { preview_time: 20, wrapup_time: 45, wrapup_mode: 'OPTIONAL', wait_after_call: 3 });
  assert.equal('contact_retry' in seed, false);
  assert.deepEqual(campaignTimerSeed(null), {
    preview_time: 30,
    wrapup_time: 30,
    wrapup_mode: 'MANDATORY_TIMEOUT',
    wait_after_call: 5,
  });
});

/* B2 - the campaign form's Calling rules, seeded by planCampaignTimerSeed. */
test('B2 new campaign, section never saved: the built-in defaults', () => {
  const writes = planCampaignTimerSeed({
    isEditMode: false,
    isFormInitialized: false,
    companyTimers: null,
    current: null,
  });
  assert.deepEqual(writes, {
    preview_time: 30,
    wrapup_time: 30,
    wrapup_mode: 'MANDATORY_TIMEOUT',
    wait_after_call: 5,
  });
  assert.equal('contact_retry' in writes, false);
});

test('B2 new campaign, company saved 45: Calling rules shows 45 before anybody types', () => {
  const writes = planCampaignTimerSeed({
    isEditMode: false,
    isFormInitialized: false,
    companyTimers: { preview_time: 45, wrapup_time: 60, wrapup_mode: 'OPTIONAL', wait_after_call: 7, contact_retry: 20 },
    current: null,
  });
  assert.deepEqual(writes, { preview_time: 45, wrapup_time: 60, wrapup_mode: 'OPTIONAL', wait_after_call: 7 });
});

test('B2 new campaign, a section holding out-of-range or junk values: clamped, never refused', () => {
  const writes = planCampaignTimerSeed({
    isEditMode: false,
    isFormInitialized: false,
    companyTimers: { preview_time: 9999, wrapup_time: 4, wrapup_mode: 'abc' as any, wait_after_call: 'abc' as any },
    current: null,
  });
  assert.deepEqual(writes, { preview_time: 300, wrapup_time: 10, wrapup_mode: 'MANDATORY_TIMEOUT', wait_after_call: 5 });
});

test('B2 existing campaign: its own numbers are never touched', () => {
  const current = { preview_time: 20, wrapup_time: 90, wrapup_mode: 'MANDATORY', wait_after_call: 2 };
  const writes = planCampaignTimerSeed({
    isEditMode: true,
    isFormInitialized: true,
    companyTimers: { preview_time: 45, wrapup_time: 60, wrapup_mode: 'OPTIONAL', wait_after_call: 7 },
    current,
  });
  assert.deepEqual(writes, {});
  assert.deepEqual(current, { preview_time: 20, wrapup_time: 90, wrapup_mode: 'MANDATORY', wait_after_call: 2 });
});

test('B2 existing campaign saved before wait_after_call existed: only that blank is filled', () => {
  const writes = planCampaignTimerSeed({
    isEditMode: true,
    isFormInitialized: true,
    companyTimers: { preview_time: 45, wait_after_call: 7 },
    current: { preview_time: 20, wrapup_time: 90, wrapup_mode: 'MANDATORY' },
  });
  assert.deepEqual(writes, { wait_after_call: 7 });
  /* A stored 0 is a value, not a blank. */
  assert.deepEqual(
    planCampaignTimerSeed({
      isEditMode: true,
      isFormInitialized: true,
      companyTimers: { wait_after_call: 7 },
      current: { preview_time: 20, wrapup_time: 90, wait_after_call: 0 },
    }),
    {},
  );
});

test('B2 existing campaign, form not yet holding its values: nothing is written (no race with the reset)', () => {
  const writes = planCampaignTimerSeed({
    isEditMode: true,
    isFormInitialized: false,
    companyTimers: { preview_time: 45 },
    current: {},
  });
  assert.deepEqual(writes, {});
});
