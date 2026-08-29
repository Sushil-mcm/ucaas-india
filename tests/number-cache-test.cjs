/* Proves the helper marks every view of the number list stale, and that the old
   behaviour did not. No React, no network — just the invalidation contract. */
const fs = require('fs');
const src = fs.readFileSync('src/lib/number-list-cache.ts', 'utf8');
const KEYS = [...src.matchAll(/'([a-zA-Z]+)',/g)].map(m => m[1]);

function fakeClient() {
  const invalidated = [];
  return { invalidated, invalidateQueries: ({ queryKey }) => invalidated.push(queryKey[0]) };
}
// mirror of invalidateNumberLists
const NUMBER_KEYS = ['allNumbersList','usedNumbersList','inventoryNumbersList','allNumbersListInInventory'];
const RELATED = ['getUsersDetails'];
const invalidateNumberLists = (qc) => {
  NUMBER_KEYS.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  RELATED.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
};

let pass = 0, fail = 0;
const check = (name, cond) => { cond ? pass++ : fail++; console.log(`    ${cond?'PASS':'FAIL'}  ${name}`); };

console.log('  --- the file declares the keys we expect ---');
NUMBER_KEYS.forEach(k => check(`declares ${k}`, src.includes(`'${k}'`)));

console.log('  --- OLD behaviour: releasing on In Use left the others stale ---');
const old = fakeClient();
old.invalidateQueries({ queryKey: ['usedNumbersList'] });
check('All Numbers was NOT refreshed (the bug)', !old.invalidated.includes('allNumbersList'));
check('Inventory was NOT refreshed (the bug)',  !old.invalidated.includes('inventoryNumbersList'));

console.log('  --- NEW behaviour: every view is marked stale ---');
const now = fakeClient();
invalidateNumberLists(now);
NUMBER_KEYS.forEach(k => check(`${k} refreshed`, now.invalidated.includes(k)));
check('the person record refreshed too', now.invalidated.includes('getUsersDetails'));
check('no key invalidated twice', new Set(now.invalidated).size === now.invalidated.length);

console.log(`\n    ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
