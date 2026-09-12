/* The same cases run against campaign-api's helpers/CallScriptPages.ts.
   Run: see scripts-p3-p5/tests/run-web-tests.sh (compiles with tsc, then
   node --test). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPublished,
  movePage,
  newScriptPage,
  nextPageId,
  normalizeScriptPages,
  pageLabel,
  pagesOf,
  removePage,
  scriptPageProblems,
  firstPageBody,
} from './script-pages';

const p = (text: string) => [{ type: 'paragraph', children: [{ text }] }];
const OPEN = { id: 'open', title: 'Opening', body: p('Hello {{Customer.FirstName}}'), choices: ['Interested', 'Not interested'], rules: [{ on: 'choice' as const, value: 'interested', page: 'pitch' }, { on: 'choice' as const, value: 'Not interested', page: 'close' }] };
const PITCH = { id: 'pitch', title: 'The pitch', body: p('Here is why'), choices: [], rules: [{ on: 'disposition' as const, value: 'Callback', page: 'callback' }] };
const CALLBACK = { id: 'callback', title: 'Book a callback', body: p('When suits?'), choices: [], rules: [] };
const CLOSE = { id: 'close', title: 'Close', body: p('Thank you'), choices: [], rules: [] };
const PAGES = normalizeScriptPages([OPEN, PITCH, CALLBACK, CLOSE]);

test('a row with no status is published; only the word draft is a draft', () => {
  assert.equal(isPublished({}), true);
  assert.equal(isPublished({ status: 'published' }), true);
  assert.equal(isPublished({ status: 'Draft ' }), false);
  assert.equal(isPublished(null), true);
});

test('a single-body script is one page; pages win when present', () => {
  const legacy = pagesOf({ script: p('one body') });
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].id, 'p1');
  assert.deepEqual(legacy[0].body, p('one body'));
  const paged = pagesOf({ script: p('stale'), pages: [OPEN, CLOSE] });
  assert.deepEqual(paged.map((x) => x.id), ['open', 'close']);
  assert.deepEqual(firstPageBody(paged, null), OPEN.body);
  assert.equal(firstPageBody([], 'fallback'), 'fallback');
});

test('normalize fills ids, trims, drops blanks and half rules', () => {
  const out = normalizeScriptPages([
    { title: '  Hi  ', body: p('x'), choices: [' Yes ', '', 'No'], rules: [{ on: 'CHOICE', value: 'Yes', page: 'p2' }, { on: 'choice', value: '', page: 'p2' }, { on: 'weird', value: 'No', page: '' }] },
    { id: 'p2', body: p('y') },
    'junk',
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 'p1');
  assert.equal(out[0].title, 'Hi');
  assert.deepEqual(out[0].choices, ['Yes', 'No']);
  assert.deepEqual(out[0].rules, [{ on: 'choice', value: 'Yes', page: 'p2' }]);
  assert.deepEqual(out[1].rules, []);
  assert.deepEqual(normalizeScriptPages('nope'), []);
});

test('problems: empty page, missing target, self loop, rule for a choice not offered, duplicates', () => {
  const problems = scriptPageProblems(normalizeScriptPages([
    { id: 'a', title: 'A', body: p(''), choices: ['Yes', 'yes'], rules: [{ on: 'choice', value: 'Yes', page: 'zzz' }, { on: 'choice', value: 'Maybe', page: 'b' }, { on: 'disposition', value: 'Sale', page: 'a' }] },
    { id: 'b', body: p('fine') },
    { id: 'b', body: p('dup id') },
  ]));
  assert.ok(problems.some((m) => m.includes('"A" has no text')), problems.join('|'));
  assert.ok(problems.some((m) => m.includes('page that does not exist')));
  assert.ok(problems.some((m) => m.includes('back to itself')));
  assert.ok(problems.some((m) => m.includes('choice it does not offer: "Maybe"')));
  assert.ok(problems.some((m) => m.includes('offers "yes" twice')));
  assert.ok(problems.some((m) => m.includes('share the id "b"')));
  assert.deepEqual(scriptPageProblems(PAGES), []);
});

test('next: a choice wins, then the disposition, then the page in order, then the end', () => {
  assert.equal(nextPageId(PAGES, 'open', { choice: 'INTERESTED' }), 'pitch');
  assert.equal(nextPageId(PAGES, 'open', { choice: 'Not interested' }), 'close');
  assert.equal(nextPageId(PAGES, 'open', {}), 'pitch', 'no choice yet: the page after');
  assert.equal(nextPageId(PAGES, 'pitch', { disposition: 'callback' }), 'callback');
  assert.equal(nextPageId(PAGES, 'pitch', { disposition: 'Sale' }), 'callback', 'no rule for Sale: in order');
  assert.equal(nextPageId(PAGES, 'callback', { choice: 'Interested' }), 'close', 'a choice made on another page does not apply here');
  assert.equal(nextPageId(PAGES, 'close'), null);
  assert.equal(nextPageId(PAGES, 'unknown'), 'open');
  assert.equal(nextPageId([], 'x'), null);
});

test('editor helpers: new ids never collide, move stays in bounds, remove drops rules and keeps the last page', () => {
  const fresh = newScriptPage(PAGES);
  assert.ok(!PAGES.some((x) => x.id === fresh.id));
  assert.equal(newScriptPage([{ id: 'p1', title: '', body: [], choices: [], rules: [] }, { id: 'p3', title: '', body: [], choices: [], rules: [] }]).id, 'p4');
  assert.deepEqual(movePage(PAGES, 0, -1).map((x) => x.id), ['open', 'pitch', 'callback', 'close']);
  assert.deepEqual(movePage(PAGES, 0, 1).map((x) => x.id), ['pitch', 'open', 'callback', 'close']);
  const without = removePage(PAGES, 'pitch');
  assert.deepEqual(without.map((x) => x.id), ['open', 'callback', 'close']);
  assert.deepEqual(without[0].rules.map((r) => r.page), ['close'], 'the rule to the removed page is gone');
  assert.equal(removePage([PAGES[0]], 'open').length, 1);
  assert.equal(pageLabel(PAGES, 'pitch'), 'The pitch');
  assert.equal(pageLabel(normalizeScriptPages([{ id: 'q', body: p('x') }]), 'q'), 'Page 1');
});
