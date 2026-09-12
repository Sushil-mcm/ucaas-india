import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastSeenText, matchesLastSeen, pendingInviteMap, personTab } from './people-screen';

const now = new Date('2026-09-10T12:00:00Z');

test('last signed in reads as a person would say it', () => {
  assert.equal(lastSeenText(null, now), 'Never');
  assert.equal(lastSeenText('not a date', now), 'Never');
  assert.match(lastSeenText(new Date('2026-09-10T09:14:00Z'), now), /^Today \d\d:\d\d$/);
  assert.match(lastSeenText(new Date('2026-09-09T17:40:00Z'), now), /^Yesterday /);
  assert.equal(lastSeenText(new Date('2026-09-03T10:00:00Z'), now), '3 Sep');
  assert.equal(lastSeenText(new Date('2025-12-03T10:00:00Z'), now), '3 Dec 2025');
});

test('the last-signed-in filter buckets', () => {
  const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000);
  assert.equal(matchesLastSeen(null, 'never', now), true);
  assert.equal(matchesLastSeen(null, '7d', now), false);
  assert.equal(matchesLastSeen(d(0.1), 'today', now), true);
  assert.equal(matchesLastSeen(d(3), '7d', now), true);
  assert.equal(matchesLastSeen(d(20), '7d', now), false);
  assert.equal(matchesLastSeen(d(20), '30d', now), true);
  assert.equal(matchesLastSeen(d(45), 'over30', now), true);
  assert.equal(matchesLastSeen(d(45), '30d', now), false);
  assert.equal(matchesLastSeen(d(45), 'any', now), true);
});

test('pending invites map by person, from a flag or a timestamp, and never throw', () => {
  const map = pendingInviteMap([
    { user_uuid: 'u1', expired: false, expires_at: '2026-09-12T10:00:00Z' },
    { user_uuid: 'u2', expires_at: '2026-09-01T10:00:00Z' },
    { uuid: 'u3' },
    null,
    { user_uuid: '' },
  ], now);
  assert.equal(map.size, 3);
  assert.equal(map.get('u1')?.expired, false);
  assert.equal(map.get('u2')?.expired, true);
  assert.equal(map.get('u3')?.expired, false);
  assert.equal(map.get('u3')?.expiresText, '');
  assert.equal(pendingInviteMap(undefined).size, 0);
});

test('a person with an invite, or PENDING, sits on the Pending tab; everyone else on Active', () => {
  const invites = pendingInviteMap([{ user_uuid: 'u1', expired: true }], now);
  assert.equal(personTab({ uuid: 'u1', state: 'ACTIVE' }, invites), 'pending');
  assert.equal(personTab({ uuid: 'u9', state: 'PENDING' }, invites), 'pending');
  assert.equal(personTab({ uuid: 'u2', state: 'SUSPENDED' }, invites), 'active');
  assert.equal(personTab({ uuid: 'u3', state: null }, invites), 'active');
});
