import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  answersToRows,
  cleanAnswer,
  keyFromLabel,
  makeEmbedNode,
  makeInputNode,
  normaliseInputNode,
  resolveEmbedUrl,
  scriptEmbedsIn,
  scriptInputsIn,
  validateScriptAnswers,
} from './script-inputs';
import { scriptValuesFromCall } from './script-variables';

const p = (text: string) => ({ type: 'paragraph', children: [{ text }] });

test('a key is made from the label and is always an identifier', () => {
  assert.equal(keyFromLabel('Interested in upgrade?'), 'interested_in_upgrade');
  assert.equal(keyFromLabel('  2nd line  '), 'a_2nd_line');
  assert.equal(keyFromLabel(''), 'answer');
  assert.equal(keyFromLabel('É'), 'answer');
  assert.equal(keyFromLabel('x'.repeat(100)).length, 64);
});

test('nodes are built well-formed or not at all', () => {
  const cb = makeInputNode('checkbox', 'Consent given')!;
  assert.deepEqual([cb.type, cb.kind, cb.key, cb.label, cb.required], ['input', 'checkbox', 'consent_given', 'Consent given', false]);
  assert.deepEqual(cb.children, [{ text: '' }]);
  const dd = makeInputNode('dropdown', 'Plan', { options: [' Gold ', 'Gold', '', 'Silver'], required: true })!;
  assert.deepEqual(dd.options, ['Gold', 'Silver']);
  assert.equal(dd.required, true);
  assert.equal(makeInputNode('dropdown', 'Plan', { options: [] }), null, 'a dropdown needs choices');
  assert.equal(normaliseInputNode({ type: 'input', kind: 'date', label: 'x' }), null, 'unknown kind');
  assert.equal(normaliseInputNode({ type: 'input', kind: 'text' }), null, 'no label, no key');
  assert.equal(normaliseInputNode({ type: 'input', kind: 'text', key: 'Bad Key', label: 'Ok' })!.key, 'ok', 'a bad key is remade from the label');
  assert.equal(makeInputNode('text', 'Note', { key: 'my_note' })!.key, 'my_note', 'a typed key is kept');
});

test('embeds keep only http(s) pages and a sane height', () => {
  assert.equal(makeEmbedNode('https://crm.example/lead?n={{Customer.Number}}', 5000)!.height, 1200);
  assert.equal(makeEmbedNode('https://crm.example/', 'abc')!.height, 360);
  assert.equal(makeEmbedNode('javascript:alert(1)', 300), null);
  assert.equal(makeEmbedNode('ftp://x.example/', 300), null);
  assert.equal(makeEmbedNode('https://x.example/a b', 300), null, 'no whitespace');
});

test('inputs and embeds are found wherever the script keeps them, once per key', () => {
  const a = makeInputNode('text', 'Reason')!;
  const b = makeInputNode('number', 'Seats')!;
  const dup = makeInputNode('checkbox', 'Reason')!; // same key as a
  const e = makeEmbedNode('https://crm.example/', 300)!;
  const flat = [p('Hello'), a, { type: 'bulleted-list', children: [{ type: 'list-item', children: [{ text: 'x' }] }] }, b, e];
  assert.deepEqual(scriptInputsIn(flat).map((i) => i.key), ['reason', 'seats']);
  assert.equal(scriptEmbedsIn(flat).length, 1);
  /* A paged script: whatever array the page carries is walked the same way. */
  const paged = { pages: [{ id: 'p1', body: [p('one'), a] }, { id: 'p2', nodes: [b, dup, e] }] };
  assert.deepEqual(scriptInputsIn(paged).map((i) => [i.key, i.kind]), [['reason', 'text'], ['seats', 'number']]);
  assert.equal(scriptEmbedsIn(paged).length, 1);
  assert.deepEqual(scriptInputsIn(null), []);
  assert.deepEqual(scriptInputsIn('junk'), []);
});

test('each kind cleans its own answer', () => {
  const cb = makeInputNode('checkbox', 'Consent', { required: true })!;
  assert.deepEqual(cleanAnswer(cb, 'true'), { value: true });
  assert.equal(cleanAnswer(cb, undefined).error, 'Consent must be ticked.');
  const n = makeInputNode('number', 'Seats')!;
  assert.deepEqual(cleanAnswer(n, ' 12 '), { value: 12 });
  assert.deepEqual(cleanAnswer(n, ''), { value: null });
  assert.equal(cleanAnswer(n, 'twelve').error, 'Seats must be a number.');
  assert.equal(cleanAnswer({ ...n, required: true }, '').error, 'Seats needs a number.');
  const dd = makeInputNode('dropdown', 'Plan', { options: ['Gold', 'Silver'] })!;
  assert.deepEqual(cleanAnswer(dd, 'Gold'), { value: 'Gold' });
  assert.equal(cleanAnswer(dd, 'Bronze').error, 'Plan: "Bronze" is not one of the choices.');
  const t = makeInputNode('text', 'Why')!;
  assert.deepEqual(cleanAnswer(t, '  because  '), { value: 'because' });
  const long = cleanAnswer(t, 'x'.repeat(600));
  assert.equal((long.value as string).length, 500);
  assert.match(long.error || '', /over 500/);
});

test('validation keeps only the keys the script defines and reports what is missing', () => {
  const inputs = [
    makeInputNode('checkbox', 'Consent', { required: true })!,
    makeInputNode('dropdown', 'Plan', { options: ['Gold', 'Silver'], required: true })!,
    makeInputNode('number', 'Seats')!,
    makeInputNode('text', 'Why')!,
  ];
  const { answers, problems } = validateScriptAnswers(inputs, { consent: true, plan: 'Gold', seats: '3', why: '', stray: 'no' });
  assert.deepEqual(answers, { consent: true, plan: 'Gold', seats: 3 });
  assert.deepEqual(problems, []);
  const missing = validateScriptAnswers(inputs, {});
  assert.deepEqual(missing.answers, { consent: false }, 'an unticked box is still an answer');
  assert.deepEqual(missing.problems.map((x) => x.key), ['consent', 'plan']);
  assert.deepEqual(validateScriptAnswers([], { a: 1 }).answers, {}, 'no script, nothing saved');
});

test('saved answers read back as label and text, in script order when the script is at hand', () => {
  const inputs = [makeInputNode('number', 'Seats')!, makeInputNode('checkbox', 'Consent')!];
  assert.deepEqual(answersToRows({ consent: false, seats: 3, extra_note: 'hi', blank: '' }, inputs), [
    { key: 'seats', label: 'Seats', text: '3' },
    { key: 'consent', label: 'Consent', text: 'No' },
    { key: 'extra_note', label: 'Extra note', text: 'hi' },
  ]);
  assert.deepEqual(answersToRows(null), []);
});

test('an embed URL is filled from the call, encoded, and refused when unsafe', () => {
  const values = scriptValuesFromCall({ customerNumber: '+44 20 7946 0123', customerName: 'Priya Sharma', agentName: 'Sam' });
  assert.equal(
    resolveEmbedUrl('https://crm.example/lead?n={{Customer.Number}}&who={{ customer.name }}', values),
    'https://crm.example/lead?n=%2B44%2020%207946%200123&who=Priya%20Sharma',
  );
  assert.equal(resolveEmbedUrl('https://crm.example/{{Campaign.Name}}/x', values), 'https://crm.example//x', 'unknown value is blank, never raw braces');
  assert.equal(resolveEmbedUrl('javascript:alert({{Customer.Name}})', values), '');
  assert.equal(resolveEmbedUrl('https://crm.example/?q={{Customer.Name}}', { 'customer.name': '"><script>' }), 'https://crm.example/?q=%22%3E%3Cscript%3E');
  assert.equal(resolveEmbedUrl('', values), '');
});
