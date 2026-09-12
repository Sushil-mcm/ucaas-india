/* The four preview-dialer timers, proven without a call and without a browser.
 *
 *   npx tsx --test src/lib/preview-dialer-timers.test.ts
 *
 * The clock is a small deterministic scheduler (node:test's mock timers differ
 * between Node 18 and 20, and this repo runs both), so every "second" here is
 * exact: preview time runs out at preview_time, not a tick before; a required
 * wrap-up closes at wrapup_time and an optional one may be left at once; the
 * next offer waits wait_after_call after a lead and contact_retry when the
 * campaign has nobody to offer. The decisions are the same functions the
 * dialer panel and the ended screen call (campaign-timers.ts, wrapup-rule.ts). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CAMPAIGN_TIMERS,
  nextOfferDelayMs,
  normaliseCampaignTimers,
  previewTimeoutDecision,
  resolveCampaignTimer,
} from './campaign-timers';
import { WRAPUP_MODES, holdsForLabel, wrapupVerdict } from './wrapup-rule';

/* A clock the test drives by hand: setInterval / setTimeout as the panel uses
   them, advanced in whole milliseconds, firing in time order. */
class FakeClock {
  now = 0;
  private timers: { at: number; every: number | null; fn: () => void; id: number }[] = [];
  private nextId = 1;
  setInterval(fn: () => void, every: number): number {
    const id = this.nextId++;
    this.timers.push({ at: this.now + every, every, fn, id });
    return id;
  }
  setTimeout(fn: () => void, after: number): number {
    const id = this.nextId++;
    this.timers.push({ at: this.now + after, every: null, fn, id });
    return id;
  }
  clear(id: number) {
    this.timers = this.timers.filter((t) => t.id !== id);
  }
  advance(ms: number) {
    const until = this.now + ms;
    for (;;) {
      const due = this.timers.filter((t) => t.at <= until).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.now = due.at;
      if (due.every === null) this.clear(due.id);
      else due.at += due.every;
      due.fn();
    }
    this.now = until;
  }
}

/* A preview card as the panel runs it: a countdown of preview_time seconds
   that, at zero, either dials or hands the lead back. */
const runPreviewCountdown = (clock: FakeClock, previewTime: number, action: string, canCall: boolean) => {
  const events: string[] = [];
  let remaining = previewTime;
  const id = clock.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clock.clear(id);
      events.push(previewTimeoutDecision(action, canCall));
    }
  }, 1000);
  return { events, remainingNow: () => remaining };
};

test('B3: the preview countdown runs out at preview_time and returns the lead to the pool', () => {
  const clock = new FakeClock();
  const run = runPreviewCountdown(clock, 20, 'RETURN_TO_POOL', true);
  clock.advance(19_000);
  assert.deepEqual(run.events, [], 'nothing happens a second early');
  assert.equal(run.remainingNow(), 1);
  clock.advance(1_000);
  assert.deepEqual(run.events, ['return_to_pool']);
  clock.advance(60_000);
  assert.deepEqual(run.events, ['return_to_pool'], 'and only once');
});

test('B3: preview_timeout_action DIAL dials at zero, but only when a call could be placed', () => {
  const clock = new FakeClock();
  const dial = runPreviewCountdown(clock, 10, 'DIAL', true);
  const cannot = runPreviewCountdown(clock, 10, 'DIAL', false);
  const lower = runPreviewCountdown(clock, 10, 'dial', true);
  const blank = runPreviewCountdown(clock, 10, '', true);
  clock.advance(10_000);
  assert.deepEqual(dial.events, ['dial']);
  assert.deepEqual(cannot.events, ['return_to_pool'], 'no phone: the lead goes back, never lost');
  assert.deepEqual(lower.events, ['dial']);
  assert.deepEqual(blank.events, ['return_to_pool'], 'an older campaign with nothing stored gets the safe answer');
});

/* The ended screen's wrap-up, as a clock: every second it asks the rule what
   to do. */
const runWrapup = (clock: FakeClock, mode: string, wrapupTime: number, labelAt: number | null) => {
  let elapsed = 0;
  const closedAt: number[] = [];
  let labelled = false;
  const id = clock.setInterval(() => {
    elapsed += 1;
    if (labelAt !== null && elapsed >= labelAt) labelled = true;
    const verdict = wrapupVerdict({
      mode,
      totalSeconds: wrapupTime,
      elapsedSeconds: elapsed,
      hasDisposition: labelled,
    });
    if (verdict.autoClose && closedAt.length === 0) {
      closedAt.push(elapsed);
      clock.clear(id);
    }
  }, 1000);
  return {
    closedAt,
    verdictNow: () =>
      wrapupVerdict({
        mode,
        totalSeconds: wrapupTime,
        elapsedSeconds: elapsed,
        hasDisposition: labelled,
      }),
  };
};

test('B4: OPTIONAL wrap-up may be left at once and still closes itself at wrapup_time', () => {
  const clock = new FakeClock();
  const run = runWrapup(clock, WRAPUP_MODES.OPTIONAL, 15, null);
  assert.equal(run.verdictNow().mayLeave, true, 'Skip is offered from the first second');
  assert.equal(run.verdictNow().blockedReason, '');
  clock.advance(14_000);
  assert.deepEqual(run.closedAt, []);
  clock.advance(1_000);
  assert.deepEqual(run.closedAt, [15]);
  assert.equal(holdsForLabel(WRAPUP_MODES.OPTIONAL), false);
});

test('B4: MANDATORY holds the agent until the call is labelled, and no clock moves them on', () => {
  const clock = new FakeClock();
  const run = runWrapup(clock, WRAPUP_MODES.MANDATORY, 15, 40);
  clock.advance(30_000);
  assert.deepEqual(run.closedAt, [], 'twice the wrap-up time and still open');
  assert.equal(run.verdictNow().mayLeave, false);
  assert.equal(run.verdictNow().showCountdown, false);
  assert.equal(run.verdictNow().blockedReason, 'Choose how the call went before you finish.');
  clock.advance(10_000);
  assert.equal(run.verdictNow().mayLeave, true, 'labelled at 40 s: free to go');
  assert.deepEqual(run.closedAt, [], 'but never closed for them');
  assert.equal(holdsForLabel(WRAPUP_MODES.MANDATORY), true);
});

test('B4: MANDATORY_TIMEOUT (required, then moves on) blocks until labelled or until wrapup_time', () => {
  const clock = new FakeClock();
  const unlabelled = runWrapup(clock, WRAPUP_MODES.MANDATORY_TIMEOUT, 15, null);
  const labelledEarly = runWrapup(clock, WRAPUP_MODES.MANDATORY_TIMEOUT, 15, 5);
  clock.advance(4_000);
  assert.equal(unlabelled.verdictNow().mayLeave, false);
  assert.equal(labelledEarly.verdictNow().mayLeave, false);
  clock.advance(1_000);
  assert.equal(labelledEarly.verdictNow().mayLeave, true, 'labelled at 5 s: may leave');
  assert.equal(labelledEarly.verdictNow().autoClose, false, 'but the clock still runs to 15');
  clock.advance(9_000);
  assert.deepEqual(unlabelled.closedAt, [], '14 s: still held');
  clock.advance(1_000);
  assert.deepEqual(unlabelled.closedAt, [15], 'closes at exactly wrapup_time');
  assert.deepEqual(labelledEarly.closedAt, [15]);
  /* And the default rule for an unreadable mode is this one. */
  assert.equal(normaliseCampaignTimers({}).wrapup_mode, 'MANDATORY_TIMEOUT');
});

test('B4: the next lead is offered wait_after_call after the wrap-up, and not before', () => {
  const clock = new FakeClock();
  const company = { wait_after_call: 7, contact_retry: 15 };
  const waitMs = resolveCampaignTimer('wait_after_call', {}, company) * 1000;
  assert.equal(waitMs, 7_000, 'an older campaign with nothing stored reads the company default');
  const delay = nextOfferDelayMs({
    callableCount: 1,
    nextRetryAt: null,
    nowMs: clock.now,
    waitAfterCallMs: waitMs,
    contactRetryMs: 15_000,
  });
  const offered: number[] = [];
  clock.setTimeout(() => offered.push(clock.now), delay);
  clock.advance(6_999);
  assert.deepEqual(offered, []);
  clock.advance(1);
  assert.deepEqual(offered, [7_000]);
  /* The campaign's own number wins over the company; 0 offers at once. */
  assert.equal(
    nextOfferDelayMs({ callableCount: 2, nextRetryAt: null, nowMs: 0, waitAfterCallMs: 0, contactRetryMs: 15_000 }),
    0,
  );
  assert.equal(resolveCampaignTimer('wait_after_call', { wait_after_call: 3 }, company), 3);
});

test('check for leads: the poll interval is the company section, clamped to 5-120 s', () => {
  const nowMs = 1_700_000_000_000;
  const poll = (contact_retry: unknown, nextRetryAt: number | null = null) =>
    nextOfferDelayMs({
      callableCount: 0,
      nextRetryAt,
      nowMs,
      waitAfterCallMs: 5_000,
      contactRetryMs: resolveCampaignTimer('contact_retry', null, { contact_retry: contact_retry as any }) * 1000,
    });
  assert.equal(poll(15), 15_000, 'saved 15 -> every 15 s');
  assert.equal(poll(45), 45_000);
  assert.equal(poll(4), 5_000, 'below the range: 5 s floor');
  assert.equal(poll(9999), 120_000, 'above the range: 120 s ceiling');
  assert.equal(poll('abc'), DEFAULT_CAMPAIGN_TIMERS.contact_retry * 1000, 'junk: the built-in 15 s');
  assert.equal(poll(undefined), 15_000, 'section never saved: 15 s');
  /* A retry scheduled sooner than the interval shortens the wait to it, never under 1 s. */
  assert.equal(poll(60, nowMs + 20_000), 20_000);
  assert.equal(poll(60, nowMs + 200), 1_000);
  assert.equal(poll(60, nowMs - 5_000), 60_000, 'a retry already due is not a shorter wait');
});

test('check for leads: an empty campaign is asked again every contact_retry, on the clock', () => {
  const clock = new FakeClock();
  const contactRetryMs = resolveCampaignTimer('contact_retry', null, { contact_retry: 5 }) * 1000;
  const polls: number[] = [];
  const schedule = () =>
    clock.setTimeout(() => {
      polls.push(clock.now);
      if (polls.length < 4) schedule();
    }, nextOfferDelayMs({ callableCount: 0, nextRetryAt: null, nowMs: clock.now, waitAfterCallMs: 5_000, contactRetryMs }));
  schedule();
  clock.advance(20_000);
  assert.deepEqual(polls, [5_000, 10_000, 15_000, 20_000]);
});

test('a campaign never carries contact_retry: the panel asks with null so the company wins', () => {
  assert.equal(resolveCampaignTimer('contact_retry', null, { contact_retry: 30 }), 30);
  assert.equal(resolveCampaignTimer('contact_retry', null, { contact_retry: 200 }), 120);
});
