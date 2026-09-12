import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveRows,
  failingRows,
  holdsRows,
  legacyFromRows,
  normaliseRows,
  rowBar,
  rowsScore,
  rowsStage,
  widenLadder,
} from './queue-requirements';

const SPA = 's1', FRA = 'f1', BIL = 'b1';
const LANG = { category_id: 'c1', category_name: 'Language', skill_ids: [SPA, FRA], min_stars: 3, match: 'ANY', weight: 2, relax: { after_seconds: 0, to: 'never' } };
const KNOW = { category_id: 'c2', category_name: 'Customer service', skill_ids: [BIL], min_stars: 3, match: 'ANY', weight: 1, relax: { after_seconds: 60, to: 'one_star_then_drop' } };
const rows = normaliseRows([LANG, KNOW]);
const rate = (o: Record<string, number>) => Object.entries(o).map(([skill_id, stars]) => ({ skill_id, stars }));

test('rows are clamped and junk is dropped', () => {
  const got = normaliseRows([{ skill_ids: [SPA, SPA, ''], min_stars: 9, match: 'any', weight: 0, relax: { to: 'bogus', after_seconds: -4 } }, { skill_ids: [] }, 'junk']);
  assert.equal(got.length, 1);
  assert.deepEqual(got[0].skill_ids, [SPA]);
  assert.deepEqual([got[0].min_stars, got[0].match, got[0].weight, got[0].relax], [5, 'ANY', 1, { after_seconds: 0, to: 'never' }]);
});

test('the flat list is one ladder row, and rows win over it', () => {
  const legacy = effectiveRows({ required_skills: [SPA, BIL], min_stars: 3, evaluation: 'ALL' });
  assert.equal(legacy.length, 1);
  assert.deepEqual(legacy[0].skill_ids, [SPA, BIL]);
  assert.equal(legacy[0].relax.to, 'ladder');
  assert.equal(effectiveRows({ required_skills: [SPA], min_stars: 1, evaluation: 'ALL', requirements: [KNOW] as any })[0].skill_ids[0], BIL);
  assert.deepEqual(legacyFromRows(rows), { required_skills: [SPA, FRA, BIL], min_stars: 3, evaluation: 'ALL' });
});

test('all rows must be met, any one skill inside a row', () => {
  assert.equal(holdsRows(rate({ [FRA]: 4, [BIL]: 4 }), rows), true);
  assert.equal(holdsRows(rate({ [SPA]: 2, [BIL]: 5 }), rows), false);   // Spanish below the bar
  assert.equal(holdsRows(rate({ [SPA]: 5 }), rows), false);              // no billing
  assert.deepEqual(failingRows(rate({ [SPA]: 5 }), rows).map((r) => r.category_name), ['Customer service']);
});

test('score is best star per row times weight', () => {
  assert.equal(rowsScore(rate({ [SPA]: 4, [FRA]: 2, [BIL]: 3 }), rows), 4 * 2 + 3);
  assert.equal(rowsScore(rate({ [FRA]: 4, [BIL]: 4 }), rows), 4 * 2 + 4);
});

test('each row relaxes on its own clock', () => {
  const [lang, know] = rows;
  assert.equal(rowBar(know, { round: 0, waited: 0, widen: false }), 3);
  assert.equal(rowBar(know, { round: 0, waited: 61, widen: false }), 1);
  assert.equal(rowBar(know, { round: 0, waited: 121, widen: false }), 0);
  assert.equal(rowBar(lang, { round: 5, waited: 9999, widen: true }), 3);
  assert.equal(holdsRows(rate({ [SPA]: 4, [BIL]: 1 }), rows, { round: 0, waited: 61, widen: false }), true);
  assert.equal(holdsRows(rate({ [SPA]: 4 }), rows, { round: 0, waited: 121, widen: false }), true);
  assert.equal(holdsRows(rate({ [FRA]: 2 }), rows, { round: 0, waited: 121, widen: false }), false);
});

test('a ladder row follows the ring, one notch per round', () => {
  const ladder = effectiveRows({ required_skills: [BIL], min_stars: 3, evaluation: 'ALL' });
  const rounds = widenLadder({ tiers: [1, 2], rows: ladder, widenAfterSeconds: 30 });
  assert.deepEqual(rounds.map((r) => [r.round, r.fromSeconds, r.tiersUpTo, r.bars[0]]), [[1, 0, 1, 3], [2, 30, 2, 1], [3, 60, 2, 0]]);
  assert.equal(rowsStage(rate({ [BIL]: 1 }), ladder), 1);
  assert.equal(rowsStage(rate({ [BIL]: 3 }), ladder), 2);
  assert.equal(rowsStage(rate({}), ladder), 0);
});
