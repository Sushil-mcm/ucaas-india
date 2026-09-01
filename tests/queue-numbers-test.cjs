/* The numbers that ring a queue: reading a pool backwards out of the number
   list, and the two writes that add a number to a pool or take it off — where
   the thing that matters is everything the write must NOT touch. */

const assert = require('assert');
const {
  queueIdOf,
  numbersOnQueue,
  currentRouteOf,
  canAttach,
  buildQueueAttachPatch,
  buildQueueDetachPatch,
  poolSummary,
  planBulkAttach,
} = require('./queue-numbers.build.cjs');

let passed = 0;
const check = (what, fn) => {
  fn();
  passed += 1;
  console.log('  ok  ' + what);
};

const QUEUE = { id: 'q-sales', name: 'Sales Inbound', extension: '7928' };

/* A number as the numbers API actually returns it: forward_call_actions is a
   JSON *string*, and carries far more than routing. */
const didOnQueue = (number, queueId = 'q-sales') => ({
  uuid: 'u-' + number,
  did_number: number,
  forward_call_actions: JSON.stringify({
    condition: { recording: true, operational_hours: { type: '24_hours' } },
    call_handling: {
      business_hours: { type: 'QUEUE', value: queueId, name: 'Sales Inbound', extension: '7928' },
    },
    media: { hold: { enabled: true, value: 'hold.mp3' } },
    did_info: { did_name: 'Leeds line', site: 'site-1' },
  }),
});

const didOnExtension = (number) => ({
  uuid: 'u-' + number,
  did_number: number,
  forward_call_actions: JSON.stringify({
    condition: { recording: false },
    call_handling: {
      business_hours: {
        type: 'EXTENSION',
        value: 'ext-200',
        name: 'Priya',
        extension: '200',
        missed_call_action: { type: 'VOICEMAIL', value: '200', personal: true },
      },
    },
    media: { welcome: { enabled: true, value: 'hi.mp3' } },
  }),
});

const didUnrouted = (number) => ({ uuid: 'u-' + number, did_number: number });

// ---------------------------------------------------------------- reading

check('a number forwarding to a queue reports that queue', () => {
  assert.strictEqual(queueIdOf(didOnQueue('+15550001')), 'q-sales');
});

check('CONTROL a number on an extension reports no queue', () => {
  assert.strictEqual(queueIdOf(didOnExtension('+15550002')), '');
});

check('CONTROL an unrouted number reports no queue', () => {
  assert.strictEqual(queueIdOf(didUnrouted('+15550003')), '');
});

check('malformed routing json is treated as no queue, not a crash', () => {
  assert.strictEqual(queueIdOf({ uuid: 'u', forward_call_actions: '{not json' }), '');
});

check('a queue reached only after hours is NOT one of the queue pool', () => {
  const did = {
    uuid: 'u-x',
    did_number: '+15550009',
    forward_call_actions: JSON.stringify({
      call_handling: { business_hours: { type: 'EXTENSION', value: 'ext-200' } },
      condition: { operational_hours: { closed_hour_action: { type: 'QUEUE', value: 'q-sales' } } },
    }),
  };
  assert.strictEqual(queueIdOf(did), '');
  assert.strictEqual(numbersOnQueue([did], 'q-sales').length, 0);
});

check('a pool gathers many numbers under one queue', () => {
  const list = [
    didOnQueue('+15550001'),
    didOnExtension('+15550002'),
    didOnQueue('+15550004'),
    didOnQueue('+15550005', 'q-support'),
  ];
  const pool = numbersOnQueue(list, 'q-sales');
  assert.strictEqual(pool.length, 2);
  assert.deepStrictEqual(
    pool.map((d) => d.did_number),
    ['+15550001', '+15550004'],
  );
});

check('CONTROL asking for a queue nobody points at returns an empty pool', () => {
  assert.strictEqual(numbersOnQueue([didOnQueue('+15550001')], 'q-nobody').length, 0);
});

check('CONTROL an empty queue id never matches everything', () => {
  assert.strictEqual(numbersOnQueue([didOnQueue('+15550001')], '').length, 0);
  assert.strictEqual(numbersOnQueue([didOnQueue('+15550001')], null).length, 0);
});

check('the pool summary names the first number as primary', () => {
  const s = poolSummary([didOnQueue('+15550001'), didOnQueue('+15550004')], 'q-sales');
  assert.strictEqual(s.count, 2);
  assert.strictEqual(s.primary, '+15550001');
  assert.deepStrictEqual(s.numbers, ['+15550001', '+15550004']);
});

check('a queue with no numbers summarises as none rather than undefined', () => {
  const s = poolSummary([], 'q-sales');
  assert.strictEqual(s.count, 0);
  assert.strictEqual(s.primary, '');
});

check('what a number does now is reported for the picker', () => {
  assert.deepStrictEqual(currentRouteOf(didOnExtension('+15550002')), {
    type: 'EXTENSION',
    name: 'Priya',
    busy: true,
  });
  assert.strictEqual(currentRouteOf(didUnrouted('+15550003')).busy, false);
});

// ---------------------------------------------------------------- attaching

check('attaching points the number at the queue', () => {
  const patch = buildQueueAttachPatch(didUnrouted('+15550003'), QUEUE);
  const hours = patch.forward_call_actions.call_handling.business_hours;
  assert.strictEqual(patch.uuid, 'u-+15550003');
  assert.strictEqual(hours.type, 'QUEUE');
  assert.strictEqual(hours.value, 'q-sales');
  assert.strictEqual(hours.name, 'Sales Inbound');
  assert.strictEqual(hours.extension, '7928');
});

check('an unrouted number MAY be attached — this is the number becoming used', () => {
  assert.strictEqual(canAttach(didUnrouted('+15550003')).ok, true);
  assert.ok(buildQueueAttachPatch(didUnrouted('+15550003'), QUEUE));
});

check('a number with no record is refused rather than written blind', () => {
  assert.strictEqual(canAttach({ did_number: '+15550007' }).ok, false);
  assert.strictEqual(buildQueueAttachPatch({ did_number: '+15550007' }, QUEUE), null);
});

check('a queue with no id is refused', () => {
  assert.strictEqual(buildQueueAttachPatch(didUnrouted('+1'), { id: '', name: 'x' }), null);
  assert.strictEqual(buildQueueAttachPatch(didUnrouted('+1'), {}), null);
});

check('THE ONE THAT MATTERS: attaching keeps every setting it does not own', () => {
  const patch = buildQueueAttachPatch(didOnExtension('+15550002'), QUEUE);
  const fa = patch.forward_call_actions;
  // recording, hours, hold music and the label all survive being re-pointed
  assert.strictEqual(fa.condition.recording, false);
  assert.deepStrictEqual(fa.media, { welcome: { enabled: true, value: 'hi.mp3' } });
  // and a key inside business_hours that the queue does not own survives too
  assert.deepStrictEqual(fa.call_handling.business_hours.missed_call_action, {
    type: 'VOICEMAIL',
    value: '200',
    personal: true,
  });
});

check('CONTROL that survival check can fail — a rebuilt blob loses those keys', () => {
  const rebuilt = { call_handling: { business_hours: { type: 'QUEUE', value: 'q-sales' } } };
  assert.strictEqual(rebuilt.condition, undefined);
  assert.strictEqual(rebuilt.media, undefined);
  assert.strictEqual(rebuilt.call_handling.business_hours.missed_call_action, undefined);
});

check('the stale extension of the previous target is replaced, not carried', () => {
  const patch = buildQueueAttachPatch(didOnExtension('+15550002'), QUEUE);
  assert.strictEqual(patch.forward_call_actions.call_handling.business_hours.extension, '7928');
});

check('a queue with no extension leaves the key off rather than writing empty', () => {
  const patch = buildQueueAttachPatch(didUnrouted('+1'), { id: 'q-x', name: 'X' });
  assert.ok(!('extension' in patch.forward_call_actions.call_handling.business_hours));
});

check('a number already on this queue produces no write at all', () => {
  assert.strictEqual(buildQueueAttachPatch(didOnQueue('+15550001'), QUEUE), null);
});

check('a number on a DIFFERENT queue is moved, not skipped', () => {
  const patch = buildQueueAttachPatch(didOnQueue('+15550005', 'q-support'), QUEUE);
  assert.strictEqual(patch.forward_call_actions.call_handling.business_hours.value, 'q-sales');
});

check('the queue name is cleaned before it is stored', () => {
  const patch = buildQueueAttachPatch(didUnrouted('+1'), {
    id: 'q-x',
    name: '  Sales   Inbound \n',
  });
  assert.strictEqual(patch.forward_call_actions.call_handling.business_hours.name, 'Sales Inbound');
});

check('attaching does not mutate the number it was given', () => {
  const did = didOnExtension('+15550002');
  const before = did.forward_call_actions;
  buildQueueAttachPatch(did, QUEUE);
  assert.strictEqual(did.forward_call_actions, before);
});

// ---------------------------------------------------------------- detaching

check('detaching empties the route', () => {
  const patch = buildQueueDetachPatch(didOnQueue('+15550001'));
  const hours = patch.forward_call_actions.call_handling.business_hours;
  assert.strictEqual(hours.type, '');
  assert.strictEqual(hours.value, '');
  assert.ok(!('extension' in hours));
});

check('detaching keeps the hours, recording, hold music and label', () => {
  const fa = buildQueueDetachPatch(didOnQueue('+15550001')).forward_call_actions;
  assert.strictEqual(fa.condition.recording, true);
  assert.strictEqual(fa.condition.operational_hours.type, '24_hours');
  assert.deepStrictEqual(fa.media, { hold: { enabled: true, value: 'hold.mp3' } });
  assert.deepStrictEqual(fa.did_info, { did_name: 'Leeds line', site: 'site-1' });
});

check('CONTROL detaching a number that is not on a queue writes nothing', () => {
  assert.strictEqual(buildQueueDetachPatch(didOnExtension('+15550002')), null);
  assert.strictEqual(buildQueueDetachPatch(didUnrouted('+15550003')), null);
});

check('a second detach of the same number is refused, so a double click is safe', () => {
  const first = buildQueueDetachPatch(didOnQueue('+15550001'));
  const after = { uuid: first.uuid, forward_call_actions: first.forward_call_actions };
  assert.strictEqual(buildQueueDetachPatch(after), null);
});

// ---------------------------------------------------------------- bulk

check('a bulk attach separates numbers that move from numbers merely added', () => {
  const plan = planBulkAttach(
    [
      didUnrouted('+15550003'),
      didOnExtension('+15550002'),
      didOnQueue('+15550001'),
      didOnQueue('+15550005', 'q-support'),
    ],
    QUEUE,
  );
  assert.deepStrictEqual(
    plan.adding.map((d) => d.did_number),
    ['+15550003'],
  );
  assert.deepStrictEqual(
    plan.moving.map((d) => d.did_number),
    ['+15550002', '+15550005'],
  );
  assert.deepStrictEqual(
    plan.unchanged.map((d) => d.did_number),
    ['+15550001'],
  );
});

check('CONTROL a bulk attach to no queue changes nothing', () => {
  const plan = planBulkAttach([didUnrouted('+1'), didOnExtension('+2')], { id: '', name: 'x' });
  assert.strictEqual(plan.moving.length + plan.adding.length, 0);
  assert.strictEqual(plan.unchanged.length, 2);
});

check('bulk handles an empty and a rubbish list without throwing', () => {
  assert.strictEqual(planBulkAttach([], QUEUE).adding.length, 0);
  assert.strictEqual(planBulkAttach(null, QUEUE).adding.length, 0);
  assert.strictEqual(numbersOnQueue(null, 'q-sales').length, 0);
});

check('a pool of forty numbers on one queue is just a pool of forty', () => {
  const many = Array.from({ length: 40 }, (_, i) => didOnQueue('+1555' + String(i).padStart(4, '0')));
  const s = poolSummary([...many, didOnExtension('+19999999')], 'q-sales');
  assert.strictEqual(s.count, 40);
  assert.strictEqual(s.primary, '+15550000');
});

console.log('\n  ' + passed + ' checks passed');
