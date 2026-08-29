const {
  normaliseCode, checkCentre, checkAllocation, isAllocationUsable,
  resolveAllocation, splitAmount, MAX_PARTS,
} = require('./cost-centres.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };
const msgs = (p) => p.map(x => x.message).join(' | ');

console.log('  --- codes ---');
t('lower case is raised', normaliseCode('sales') === 'SALES');
t('spaces and symbols are dropped', normaliseCode('R & D!') === 'RD');
t('hyphen and underscore survive', normaliseCode('r-and_d') === 'R-AND_D');
t('trimmed to 20 characters', normaliseCode('A'.repeat(30)).length === 20);

console.log('  --- the directory ---');
t('a centre needs a code', checkCentre({ name: 'Sales' }).some(p => p.field === 'code'));
t('a centre needs a name', checkCentre({ code: 'SALES' }).some(p => p.field === 'name'));
t('a good centre is accepted', checkCentre({ code: 'SALES', name: 'Sales' }).length === 0);
t('a duplicate code is refused',
  checkCentre({ code: 'SALES', name: 'Other' }, [{ code: 'SALES', name: 'Sales' }]).length === 1);

console.log('  --- allocations ---');
t('no split at all is fine', checkAllocation([]).length === 0);
t('exactly 100 is accepted',
  checkAllocation([{ code: 'A', percent: 70 }, { code: 'B', percent: 30 }]).length === 0);
let p = checkAllocation([{ code: 'A', percent: 90 }]);
t('under 100 is blocking', p.length === 1 && p[0].blocking);
t('and says how much is missing', /10% would not be accounted/.test(msgs(p)));
p = checkAllocation([{ code: 'A', percent: 60 }, { code: 'B', percent: 60 }]);
t('over 100 says how much to remove', /20% more than the spend/.test(msgs(p)));
p = checkAllocation([{ code: 'A', percent: 50 }, { code: 'A', percent: 50 }]);
t('the same centre twice is refused', /appears twice/.test(msgs(p)));
p = checkAllocation([{ code: 'A', percent: 100 }, { code: 'B', percent: 0 }]);
t('a zero share is refused rather than ignored', /Remove the line/.test(msgs(p)));
const many = Array.from({ length: MAX_PARTS + 1 }, (_, i) => ({ code: 'C' + i, percent: 1 }));
t('more than ten parts is refused', /at most 10/.test(msgs(checkAllocation(many))));

console.log('  --- archived centres ---');
p = checkAllocation([{ code: 'OLD', percent: 100 }], [{ code: 'OLD', name: 'Old', archived: true }]);
t('archived is a warning, not a block', p.length === 1 && p[0].blocking === false);
t('so the allocation is still usable', isAllocationUsable(p));

console.log('  --- which split applies ---');
const A = [{ code: 'A', percent: 100 }], B = [{ code: 'B', percent: 100 }], C = [{ code: 'C', percent: 100 }];
t('a person beats their licence', resolveAllocation({ person: A, licence: B, location: C }).from === 'person');
t('a licence beats the location', resolveAllocation({ licence: B, location: C }).from === 'licence');
t('the location applies when nothing else does', resolveAllocation({ location: C }).from === 'location');
t('nothing set is a real answer, not an error', resolveAllocation({}).from === 'none');

console.log('  --- splitting money ---');
let s = splitAmount(100, [{ code: 'A', percent: 70 }, { code: 'B', percent: 30 }]);
t('a clean split is exact', s[0].amount === 70 && s[1].amount === 30);
s = splitAmount(10, [{ code: 'A', percent: 33 }, { code: 'B', percent: 33 }, { code: 'C', percent: 34 }]);
const total = s.reduce((a, b) => a + b.amount, 0);
t('an awkward split still adds back to the total', Math.abs(total - 10) < 0.0001);
t('the rounding remainder goes to the largest share', s.find(x => x.code === 'C').amount >= s[0].amount);
t('no parts means no split, not a crash', splitAmount(10, []).length === 0);

console.log(`\n    ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
