import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveCampaignCountry, hoursCountryOf } from './campaign-country';

/* The 9 Sep 2026 test campaigns: Calling rules left blank, Hours set to the
   United States. Stored: country null, regional.country_code.value 'US'. */
const form215 = {
  country: '',
  settings: { operational_hours: { regional: { country_code: { label: 'United States (+1)', value: 'US' } } } },
};

test('no compliance country chosen: the hours country stands in', () => {
  assert.deepEqual(effectiveCampaignCountry(form215.country, hoursCountryOf(form215)), {
    iso2: 'US',
    source: 'hours',
  });
});

test('an explicit compliance country wins over the hours country', () => {
  assert.deepEqual(effectiveCampaignCountry('IN', hoursCountryOf(form215)), { iso2: 'IN', source: 'chosen' });
  assert.deepEqual(effectiveCampaignCountry({ value: 'gb' }, hoursCountryOf(form215)), {
    iso2: 'GB',
    source: 'chosen',
  });
});

test('neither answered: nothing, and the review says so', () => {
  assert.deepEqual(effectiveCampaignCountry(null, undefined), { iso2: '', source: 'none' });
  assert.deepEqual(effectiveCampaignCountry('', { label: 'Select', value: '' }), { iso2: '', source: 'none' });
});

test('the hours country may be a bare string', () => {
  assert.deepEqual(effectiveCampaignCountry('', 'ca'), { iso2: 'CA', source: 'hours' });
});
