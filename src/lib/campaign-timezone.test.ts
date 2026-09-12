import { test } from 'node:test';
import assert from 'node:assert/strict';
import countries from '../assets/json/countries.json';
import { COMMON_ZONE_BY_COUNTRY, chooseCampaignTimezone, isZoneKept } from './campaign-timezone';

const zonesOf = (iso: string): string[] =>
  ((countries as any[]).find((c) => c.isoCode === iso)?.timezones || []).map((t: any) => t.zoneName);

const US = zonesOf('US');

test('US with a browser outside the country gets New York, never Adak', () => {
  /* The 9 Sep test campaigns: browser in Asia/Kolkata, country United States. */
  assert.equal(
    chooseCampaignTimezone({ saved: '', browserZone: 'Asia/Kolkata', countryIso: 'US', zones: US }),
    'America/New_York',
  );
  assert.equal(US[0], 'America/Adak', 'the list really does start with Adak');
});

test('the browser zone wins when it belongs to the country', () => {
  assert.equal(
    chooseCampaignTimezone({ saved: '', browserZone: 'America/Los_Angeles', countryIso: 'US', zones: US }),
    'America/Los_Angeles',
  );
});

test('an existing campaign keeps its saved zone when it belongs to the country', () => {
  assert.equal(
    chooseCampaignTimezone({ saved: 'America/Chicago', browserZone: 'America/New_York', countryIso: 'US', zones: US }),
    'America/Chicago',
  );
  assert.equal(isZoneKept('America/Chicago', US), true);
});

test('a saved zone from another country is replaced, not kept', () => {
  assert.equal(
    chooseCampaignTimezone({ saved: 'Asia/Kolkata', browserZone: 'Asia/Kolkata', countryIso: 'US', zones: US }),
    'America/New_York',
  );
  assert.equal(isZoneKept('Asia/Kolkata', US), false);
});

test('India has one zone and gets it whatever the browser says', () => {
  assert.equal(
    chooseCampaignTimezone({ saved: '', browserZone: 'America/New_York', countryIso: 'IN', zones: zonesOf('IN') }),
    'Asia/Kolkata',
  );
});

test('every multi-zone country in the list has a common zone that is in its list', () => {
  const multi = (countries as any[]).filter((c) => (c.timezones || []).length > 1);
  assert.equal(multi.length, 31);
  for (const c of multi) {
    const common = COMMON_ZONE_BY_COUNTRY[c.isoCode];
    assert.ok(common, `${c.isoCode} has no common zone`);
    assert.ok(zonesOf(c.isoCode).includes(common), `${c.isoCode}: ${common} is not in its list`);
    assert.notEqual(
      chooseCampaignTimezone({ browserZone: 'Etc/UTC', countryIso: c.isoCode, zones: zonesOf(c.isoCode) }),
      zonesOf(c.isoCode)[0] === common ? '' : zonesOf(c.isoCode)[0],
      `${c.isoCode} fell back to first-in-list`,
    );
  }
});

test('no country: the browser zone, or nothing', () => {
  assert.equal(chooseCampaignTimezone({ browserZone: 'Europe/London', zones: [] }), 'Europe/London');
  assert.equal(chooseCampaignTimezone({ zones: [] }), '');
});

test('a country with several zones and no table row falls back to the browser zone', () => {
  assert.equal(
    chooseCampaignTimezone({ browserZone: 'Asia/Kolkata', countryIso: 'ZZ', zones: ['Mars/Olympus', 'Mars/Hellas'] }),
    'Asia/Kolkata',
  );
});
