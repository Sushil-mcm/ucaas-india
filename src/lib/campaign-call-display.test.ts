import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callDisplayName } from './campaign-call-display';

test('the 9 Sep call: lead name first, saved contact name second', () => {
  assert.deepEqual(
    callDisplayName({ isCampaignCall: true, leadName: 'Loopback Test IVR', savedContactName: 'Plumber Test' }),
    { primary: 'Loopback Test IVR', secondary: 'Plumber Test' },
  );
});

test('same person under both names: one line only', () => {
  assert.deepEqual(
    callDisplayName({ isCampaignCall: true, leadName: 'Plumber  Test', savedContactName: 'plumber test' }),
    { primary: 'Plumber  Test', secondary: '' },
  );
});

test('campaign call with no lead name falls back to the saved contact', () => {
  assert.deepEqual(callDisplayName({ isCampaignCall: true, leadName: '', savedContactName: 'Plumber Test' }), {
    primary: 'Plumber Test',
    secondary: '',
  });
});

test('off a campaign the saved contact name is the only name, as before', () => {
  assert.deepEqual(
    callDisplayName({ isCampaignCall: false, leadName: 'Loopback Test IVR', savedContactName: 'Plumber Test' }),
    { primary: 'Plumber Test', secondary: '' },
  );
});

test('nothing known: the fallback', () => {
  assert.deepEqual(callDisplayName({ isCampaignCall: false }), { primary: 'Unknown Contact', secondary: '' });
  assert.deepEqual(callDisplayName({ isCampaignCall: true, fallback: '-' }), { primary: '-', secondary: '' });
});
