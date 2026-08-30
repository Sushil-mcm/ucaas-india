/* Proves the two rules that keep a label from doing damage.
 *
 * The interesting cases here are the refusals. Saving a label is a write to the
 * same column the switch reads for routing, so the tests that matter most are
 * the ones proving a label write never invents a routing blob, never drops a
 * field out of one, and never moves a number out of its site.
 */

const {
  LABEL_MAX_LENGTH,
  parseActions,
  normaliseLabel,
  checkLabel,
  labelOf,
  numberTypeOf,
  isSmsCapable,
  lineOf,
  isRouted,
  canEditLabel,
  buildLabelPatch,
  groupByLine,
  numbersWithoutLine,
  matchesLineSearch,
} = require('./number-labels.build.cjs');

let passed = 0;
let failed = 0;

const is = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    passed += 1;
  } else {
    failed += 1;
    console.log(`FAIL  ${name}\n        expected ${b}\n        got      ${a}`);
  }
};

/* A number that rings the Support department, with a site and a full routing
   object — the ordinary case, and the one a patch must preserve exactly. */
const supportActions = {
  condition: {
    operational_hours: { type: '24_hours', holidays: [] },
    recording: { automatic: { enabled: true } },
    caller_id: '',
  },
  call_handling: {
    business_hours: {
      type: 'DEPARTMENT',
      value: 'dept-1',
      name: 'Support',
      label: 'Support',
      missed_call_action: { type: 'VOICEMAIL', value: '1001', personal: true },
    },
  },
  media: { welcome: { enabled: true, value: 'g-1', label: 'Welcome' } },
  did_info: { did_name: 'Support main', site: 'site-1' },
};

const support = {
  uuid: 'did-1',
  did_number: '+441134960001',
  did_type: 'L',
  did_name: 'Main DID',
  site_uuid: 'site-1',
  features: ['voice_in', 'sms_in'],
  forward_call_actions: JSON.stringify(supportActions),
};

/* Same line, second number, never renamed — still carries its purchase name. */
const supportTollFree = {
  uuid: 'did-2',
  did_number: '+448000000002',
  did_type: 'T',
  did_name: 'Main DID',
  features: ['voice_in'],
  forward_call_actions: JSON.stringify({
    call_handling: { business_hours: { type: 'DEPARTMENT', value: 'dept-1', name: 'Support' } },
  }),
};

/* Rings a person, so it belongs to nobody's line. */
const personal = {
  uuid: 'did-3',
  did_number: '+441134960003',
  did_type: 'L',
  forward_call_actions: JSON.stringify({
    call_handling: { business_hours: { type: 'EXTENSION', value: '1001' } },
  }),
};

/* Bought and never pointed anywhere. The one that must be refused. */
const spare = { uuid: 'did-4', did_number: '+441134960004', did_type: 'L', did_name: 'Main DID' };

const faxLine = {
  uuid: 'did-5',
  did_number: '+441134960005',
  did_type: 'L',
  is_fax_enabled: true,
  forward_call_actions: JSON.stringify({
    call_handling: { business_hours: { type: 'IVR', value: 'ivr-9', label: 'Front desk' } },
  }),
};

/* ---- reading the stored blob ------------------------------------------ */

is('a JSON string parses', parseActions('{"a":1}'), { a: 1 });
is('an object is passed through', parseActions({ a: 1 }), { a: 1 });
is('nothing is nothing', parseActions(null), null);
is('an empty string is nothing', parseActions(''), null);
/* A single malformed row must not throw during render — it blanks one cell,
   not the table. */
is('broken JSON is nothing, not a throw', parseActions('{oh dear'), null);
is('a JSON array is not a settings object', parseActions('[1,2]'), [1, 2]);

/* ---- what a label looks like ------------------------------------------ */

is('outer space goes', normaliseLabel('  Accounting  '), 'Accounting');
is('inner runs collapse', normaliseLabel('Main   desk'), 'Main desk');
is('a newline is just a space', normaliseLabel('Main\ndesk'), 'Main desk');
is('a tab is just a space', normaliseLabel('Main\tdesk'), 'Main desk');
is('nothing at all reads as empty', normaliseLabel(undefined), '');
is('a number reads as its digits', normaliseLabel(42), '42');

is('an ordinary label is fine', checkLabel('Accounting voicemail'), { ok: true });
is('clearing a label is allowed', checkLabel(''), { ok: true });
is('spaces only is clearing it', checkLabel('   '), { ok: true });
is('exactly the cap fits', checkLabel('x'.repeat(LABEL_MAX_LENGTH)), { ok: true });
is('one over the cap does not', checkLabel('x'.repeat(LABEL_MAX_LENGTH + 1)).ok, false);
/* The column is VARCHAR(30) and the server rejects markup, so both are refused
   while typing rather than after saving. */
is('the cap is the column width', LABEL_MAX_LENGTH, 30);
is('markup is refused', checkLabel('<b>Sales</b>').ok, false);
is('a lone bracket is refused too', checkLabel('Sales > Support').ok, false);

/* ---- which label wins -------------------------------------------------- */

is('the editable one wins over the bought one', labelOf(support), 'Support main');
is('an unrenamed number keeps its bought name', labelOf(supportTollFree), 'Main DID');
is('no label anywhere reads as empty', labelOf(personal), '');
is('a missing row does not throw', labelOf(undefined), '');

/* ---- type and texting -------------------------------------------------- */

is('local', numberTypeOf(support), 'Local');
is('toll free', numberTypeOf(supportTollFree), 'Toll free');
/* Fax beats did_type: a fax line stored as L would otherwise read "Local". */
is('fax beats the type letter', numberTypeOf(faxLine), 'Fax');
is('lower case still reads', numberTypeOf({ did_type: 't' }), 'Toll free');
is('an unknown letter is not guessed at', numberTypeOf({ did_type: 'Z' }), '--');
is('no type at all', numberTypeOf({}), '--');

is('inbound texting counts', isSmsCapable(support), true);
is('voice only does not', isSmsCapable(supportTollFree), false);
is('no features at all', isSmsCapable(spare), false);
is('a malformed features field is not an array', isSmsCapable({ features: 'sms_in' }), false);

/* ---- which line a number belongs to ------------------------------------ */

is('a department is a line', lineOf(support), {
  key: 'DEPARTMENT:dept-1',
  type: 'DEPARTMENT',
  value: 'dept-1',
  name: 'Support',
});
is('an IVR is a line, named by its label', lineOf(faxLine)?.name, 'Front desk');
is('a person is not a line', lineOf(personal), null);
is('an unrouted number is not a line', lineOf(spare), null);
/* A line with no id is not a line — grouping on '' would collect unrelated
   numbers under one heading. */
is(
  'a department with no id is not a line',
  lineOf({ forward_call_actions: { call_handling: { business_hours: { type: 'DEPARTMENT' } } } }),
  null,
);
/* Business hours only. A number whose out-of-hours branch points at a queue
   belongs to whatever answers it during the day. */
is(
  'the closed-hours branch does not decide the line',
  lineOf({
    forward_call_actions: {
      call_handling: { business_hours: { type: 'EXTENSION', value: '1001' } },
      condition: { operational_hours: { closed_hour_action: { type: 'QUEUE', value: 'q-1' } } },
    },
  }),
  null,
);

is('a routed number is routed', isRouted(support), true);
is('an extension counts as routed', isRouted(personal), true);
is('a spare number is not', isRouted(spare), false);

/* ---- when a label may be written --------------------------------------- */

is('a routed number can be labelled', canEditLabel(support), { ok: true });
is('a personal number can be labelled', canEditLabel(personal).ok, true);
/* The rule that protects the money: labelling a spare number would give it a
   routing blob, and Release is blocked on exactly that field. */
is('a spare number cannot be labelled', canEditLabel(spare).ok, false);
is('and it says why', canEditLabel(spare).reason.includes('Point this number somewhere first'), true);
is('a row with no uuid cannot be labelled', canEditLabel({ forward_call_actions: '{}' }).ok, false);
is('nothing at all cannot be labelled', canEditLabel(null).ok, false);

/* ---- the patch --------------------------------------------------------- */

const patch = buildLabelPatch(support, '  Accounting  voicemail ');

is('the patch names the row', patch.uuid, 'did-1');
is('the label is stored normalised', patch.forward_call_actions.did_info.did_name, 'Accounting voicemail');
/* The site is lifted out of did_info into the site_uuid column by the handler,
   so omitting it would move the number out of its site while renaming it. */
is('the site is carried across', patch.forward_call_actions.did_info.site, 'site-1');
/* Every other field comes back byte-for-byte. Rebuilding this object through
   the forwarding form is what erases fields the form does not read. */
is('routing is untouched', patch.forward_call_actions.call_handling, supportActions.call_handling);
is('conditions are untouched', patch.forward_call_actions.condition, supportActions.condition);
is('media is untouched', patch.forward_call_actions.media, supportActions.media);
is(
  'the missed-call action survives',
  patch.forward_call_actions.call_handling.business_hours.missed_call_action.type,
  'VOICEMAIL',
);

is('clearing a label is a real patch', buildLabelPatch(support, '').forward_call_actions.did_info.did_name, '');

/* No stored site: the key is left out rather than sent empty, because an empty
   string would be written into site_uuid. */
const noSitePatch = buildLabelPatch(supportTollFree, 'Freephone');
is('no site means no site key', 'site' in noSitePatch.forward_call_actions.did_info, false);

/* Falls back to the column when the blob has no did_info yet. */
is(
  'the row site is used when the blob has none',
  buildLabelPatch({ ...supportTollFree, site_uuid: 'site-2' }, 'Freephone').forward_call_actions
    .did_info.site,
  'site-2',
);

/* The refusals hold even if a caller skips canEditLabel. */
is('a spare number gets no patch', buildLabelPatch(spare, 'Anything'), null);
is('an over-long label gets no patch', buildLabelPatch(support, 'x'.repeat(LABEL_MAX_LENGTH + 1)), null);
is('markup gets no patch', buildLabelPatch(support, '<script>'), null);
is('nothing at all gets no patch', buildLabelPatch(null, 'x'), null);

/* Patching twice must not nest or duplicate did_info. */
const rePatched = buildLabelPatch(
  { ...support, forward_call_actions: JSON.stringify(patch.forward_call_actions) },
  'Second thoughts',
);
is('re-labelling replaces, not nests', rePatched.forward_call_actions.did_info, {
  did_name: 'Second thoughts',
  site: 'site-1',
});

/* ---- lines and their numbers -------------------------------------------- */

const all = [support, personal, supportTollFree, spare, faxLine];
const groups = groupByLine(all);

is('two lines are found', groups.length, 2);
/* Busiest first, so the line an admin is most likely looking for is at the top. */
is('the busiest line leads', groups[0].line.name, 'Support');
is('both of its numbers are under it', groups[0].numbers.map((d) => d.uuid), ['did-1', 'did-2']);
/* Position, not a stored flag: the first number is the line's primary. */
is('the first number is the primary', groups[0].numbers[0].did_number, '+441134960001');
is('the other line has one', groups[1].numbers.length, 1);
is('nothing at all groups to nothing', groupByLine(null), []);
is('an empty list groups to nothing', groupByLine([]), []);

is(
  'numbers without a line are the rest',
  numbersWithoutLine(all).map((d) => d.uuid),
  ['did-3', 'did-4'],
);

is('an empty search matches every line', matchesLineSearch(groups[0], ''), true);
is('the line name matches', matchesLineSearch(groups[0], 'supp'), true);
is('case does not matter', matchesLineSearch(groups[0], 'SUPPORT'), true);
is('one of its numbers matches', matchesLineSearch(groups[0], '960001'), true);
is('a label nobody set does not match', matchesLineSearch(groups[0], 'accounting'), false);
is('a label on a number matches', matchesLineSearch(groups[0], 'Support main'), true);
is('an unrelated search does not', matchesLineSearch(groups[0], 'warehouse'), false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
