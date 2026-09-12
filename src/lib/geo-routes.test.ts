/* node:test, after bundling with esbuild:
     npx esbuild src/lib/geo-routes.test.ts --bundle --platform=node --format=cjs \
       --alias:@=./src --outfile=/tmp/geo-routes.test.cjs && node --test /tmp/geo-routes.test.cjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseGeoRoutes, serialiseGeoRoutes, geoRouteProblems, matchGeoRoute } from './geo-routes';

test('normalise tolerates junk and keeps digits only', () => {
  assert.deepEqual(normaliseGeoRoutes(undefined), []);
  assert.deepEqual(normaliseGeoRoutes('nope'), []);
  assert.deepEqual(normaliseGeoRoutes([{ prefix: '+1 (415)', type: 'queue', value: ' q1 ' }, 'x', null]), [
    { prefix: '1415', type: 'QUEUE', value: 'q1', label: undefined },
  ]);
});

test('serialise drops incomplete rows, keeps complete ones', () => {
  const rows = [
    { prefix: '1415', type: 'QUEUE', value: 'q1', label: 'Sales' },
    { prefix: '', type: 'QUEUE', value: 'q1' },
    { prefix: '44', type: '', value: 'q1' },
    { prefix: '91', type: 'PHONE', value: '' },
  ];
  assert.deepEqual(serialiseGeoRoutes(rows), [{ prefix: '1415', type: 'QUEUE', value: 'q1', label: 'Sales' }]);
});

test('problems name the row and the missing piece, and catch repeats', () => {
  const p = geoRouteProblems([
    { prefix: '1415', type: 'QUEUE', value: 'q1' },
    { prefix: '', type: '', value: '' },
    { prefix: '1415', type: 'IVR', value: 'm1' },
  ]);
  assert.equal(p.length, 3);
  assert.match(p[0], /Rule 2: enter the digits/);
  assert.match(p[1], /Rule 2: choose where/);
  assert.match(p[2], /Rule 3 repeats the prefix 1415 of rule 1/);
  assert.deepEqual(geoRouteProblems([]), []);
});

test('match mirrors the switch: longest prefix wins, no match is null', () => {
  const rules = [
    { prefix: '1', type: 'IVR', value: 'us-menu' },
    { prefix: '1415', type: 'QUEUE', value: 'sf' },
    { prefix: '44', type: 'EXTENSION', value: '1000' },
  ];
  assert.equal(matchGeoRoute(rules, '+1 415 555 0100')?.value, 'sf');
  assert.equal(matchGeoRoute(rules, '+1 212 555 0100')?.value, 'us-menu');
  assert.equal(matchGeoRoute(rules, '+44 20 7946 0000')?.value, '1000');
  assert.equal(matchGeoRoute(rules, '+91 98765'), null);
  assert.equal(matchGeoRoute(rules, ''), null);
  assert.equal(matchGeoRoute([], '1415'), null);
});
