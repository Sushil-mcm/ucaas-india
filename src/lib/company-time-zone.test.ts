/* Which zone a report is in, and how the screen says so.
   Bundled by tests/run-stage-d.sh; run with node --test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidTimeZone, mainSite, midnightSentence, resolveCompanyTimeZone, timeZoneLabel, todayIn } from './company-time-zone';

const BROWSER = 'America/Los_Angeles';
const withPersonal = { settings: { operational_hours: { regional: { timezone: { value: 'Europe/London' } } } } };

test('the main location decides: flagged, or the only one', () => {
  const sites = [
    { uuid: 'a', timezone: 'America/Denver', is_default: '0' },
    { uuid: 'b', timezone: 'Asia/Kolkata', is_default: '1' },
  ];
  assert.equal(mainSite(sites)?.uuid, 'b');
  assert.deepEqual(resolveCompanyTimeZone({ sites, user: withPersonal, browser: BROWSER }), { timeZone: 'Asia/Kolkata', source: 'company' });
  assert.equal(resolveCompanyTimeZone({ sites: [{ timezone: 'Asia/Tokyo' }], browser: BROWSER }).timeZone, 'Asia/Tokyo');
  /* two unflagged locations: nobody is main */
  assert.equal(mainSite([{ timezone: 'Asia/Tokyo' }, { timezone: 'Asia/Dubai' }]), null);
  assert.equal(mainSite([]), null);
  assert.equal(mainSite(undefined), null);
});

test('then the person\'s regional setting, then the browser', () => {
  assert.deepEqual(resolveCompanyTimeZone({ sites: [], user: withPersonal, browser: BROWSER }), { timeZone: 'Europe/London', source: 'personal' });
  assert.deepEqual(resolveCompanyTimeZone({ sites: undefined, user: {}, browser: BROWSER }), { timeZone: BROWSER, source: 'browser' });
  /* a location with an invalid zone is skipped, not trusted */
  assert.equal(resolveCompanyTimeZone({ sites: [{ timezone: 'Mars/Olympus', is_default: '1' }], browser: BROWSER }).source, 'browser');
  /* an invalid browser zone still yields something usable */
  assert.equal(resolveCompanyTimeZone({ browser: '' }).timeZone, 'UTC');
});

test('the label names the zone and where it came from', () => {
  assert.equal(timeZoneLabel({ timeZone: 'Asia/Kolkata', source: 'company' }), 'times in Asia/Kolkata (company)');
  assert.equal(timeZoneLabel({ timeZone: 'Europe/London', source: 'personal' }), 'times in Europe/London (your regional setting)');
  assert.equal(timeZoneLabel({ timeZone: BROWSER, source: 'browser' }), `times in ${BROWSER} (this browser)`);
  assert.equal(midnightSentence({ timeZone: 'Asia/Kolkata', source: 'company' }), 'Days are cut at midnight in Asia/Kolkata (company).');
});

test('todayIn and isValidTimeZone', () => {
  assert.equal(isValidTimeZone('Asia/Kolkata'), true);
  assert.equal(isValidTimeZone('Nowhere/Land'), false);
  assert.equal(isValidTimeZone(''), false);
  const at = new Date('2026-09-10T20:00:00Z');
  assert.equal(todayIn('Asia/Kolkata', at), '2026-09-11');
  assert.equal(todayIn('America/Los_Angeles', at), '2026-09-10');
  assert.equal(todayIn('bad zone', at), '2026-09-10');
});
