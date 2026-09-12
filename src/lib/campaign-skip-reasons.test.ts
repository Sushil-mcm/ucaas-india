import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dispositionNameMap,
  resolveCampaignDispositions,
  resolveSkipReasons,
  skipReasonIds,
} from './campaign-skip-reasons';

/* The 9 Sep 2026 test campaign 6aa18cd63bab9d69ea599488 ("Preview dialer test
   215b"), as read from the main Mongo `campaigns` collection. */
const saved215b = {
  agentDisposition: [
    { _id: '6a8991b3da433e7e71a951d1', disposition: { name: 'Resolved' } },
    { _id: '6a8991b3da433e7e71a951d2', disposition: { name: 'Interested' } },
    { _id: '6a8991b3da433e7e71a951d3', disposition: { name: 'Not Interested' } },
    { _id: '6a8991b3da433e7e71a951dc', disposition: { name: 'Call Back Later' } },
  ],
  declineDispositions: ['6a8991b3da433e7e71a951d3', '6a8991b3da433e7e71a951dc'],
};

/* The same campaign as the dialer received it from /api/campaign/member-based,
   whose $project has no declineDispositions. */
const memberBasedRow215b = { agentDisposition: saved215b.agentDisposition };

/* The company disposition list the wizard reads (getDispositions). */
const companyList = [
  { _id: '6a8991b3da433e7e71a951d1', dispositionType: 'agent', disposition: { name: 'Resolved' } },
  { _id: '6a8991b3da433e7e71a951d3', dispositionType: 'agent', disposition: { name: 'Not Interested' } },
  { _id: '6a8991b3da433e7e71a951dc', dispositionType: 'agent', disposition: { name: 'Call Back Later' } },
];

test('the saved 215b document resolves to its two named reasons, in order', () => {
  assert.deepEqual(
    resolveSkipReasons({
      declineDispositions: saved215b.declineDispositions,
      campaignDispositions: saved215b.agentDisposition,
    }),
    [
      { _id: '6a8991b3da433e7e71a951d3', name: 'Not Interested' },
      { _id: '6a8991b3da433e7e71a951dc', name: 'Call Back Later' },
    ],
  );
});

test('the member-based row alone has no reasons - the projection dropped them', () => {
  assert.deepEqual(
    resolveSkipReasons({
      declineDispositions: (memberBasedRow215b as any).declineDispositions,
      campaignDispositions: memberBasedRow215b.agentDisposition,
    }),
    [],
  );
});

test('ids with no names on the campaign are named from the company list', () => {
  const stripped = saved215b.agentDisposition.map(({ _id }) => ({ _id, disposition: { name: '' } }));
  assert.deepEqual(
    resolveSkipReasons({
      declineDispositions: saved215b.declineDispositions,
      campaignDispositions: stripped,
      companyDispositions: companyList,
    }).map((r) => r.name),
    ['Not Interested', 'Call Back Later'],
  );
});

test('an id nobody can name is left out rather than shown blank', () => {
  assert.deepEqual(
    resolveSkipReasons({
      declineDispositions: ['6a8991b3da433e7e71a951d3', 'ffffffffffffffffffffffff'],
      campaignDispositions: saved215b.agentDisposition,
    }),
    [{ _id: '6a8991b3da433e7e71a951d3', name: 'Not Interested' }],
  );
});

test('ids may arrive as strings, objects with _id, or duplicates', () => {
  assert.deepEqual(
    skipReasonIds(['a', { _id: 'b' }, 'a', { value: 'c' }, '', null]),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(skipReasonIds(undefined), []);
});

test('name map prefers the first list that names an id', () => {
  const map = dispositionNameMap(
    [{ _id: 'x', disposition: { name: 'Campaign name' } }],
    [{ _id: 'x', disposition: { name: 'Company name' } }, { _id: 'y', name: 'Plain' }],
  );
  assert.equal(map.get('x'), 'Campaign name');
  assert.equal(map.get('y'), 'Plain');
});

test('campaign dispositions are named from the company list when their own name is gone', () => {
  assert.deepEqual(
    resolveCampaignDispositions({
      campaignDispositions: [{ _id: '6a8991b3da433e7e71a951d1' }, { _id: '6a8991b3da433e7e71a951d2' }],
      companyDispositions: companyList,
    }),
    [{ _id: '6a8991b3da433e7e71a951d1', name: 'Resolved' }],
  );
});
