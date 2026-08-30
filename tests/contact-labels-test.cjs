const {
  normaliseLabel, labelKey, checkLabel, addLabel, removeLabel, labelIndex,
  matchesLabelSearch, rankLabels, entryFor, parseEntries, writeEntries, pruneEntries,
  MAX_LABELS_PER_CONTACT, LABEL_MAX_LENGTH,
} = require('./contact-labels.build.cjs');

let pass = 0, fail = 0;
const t = (n, c) => { c ? pass++ : fail++; console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`); };
const msgs = (p) => p.map(x => x.message).join(' | ');

console.log('  --- what a label is ---');
t('surrounding space is dropped', normaliseLabel('  renewal  ') === 'renewal');
t('double spaces collapse', normaliseLabel('on   hold') === 'on hold');
t('capitals are kept as typed', normaliseLabel('Q3 Pilot') === 'Q3 Pilot');
t('hyphens survive', normaliseLabel('follow-up') === 'follow-up');
t('the storage separator is removed', normaliseLabel('a|b') === 'a b');
t('nothing in, nothing out', normaliseLabel(null) === '');
t('a long label is trimmed, not refused',
  normaliseLabel('x'.repeat(60)).length === LABEL_MAX_LENGTH);
t('case never decides sameness', labelKey('Renewal') === labelKey('renewal'));

console.log('  --- adding one ---');
t('an empty label is refused', /Type a label first/.test(msgs(checkLabel([], '  '))));
t('the same word twice is refused',
  /already has the label/.test(msgs(checkLabel(['Renewal'], 'renewal'))));
t('a good label is accepted', checkLabel(['Renewal'], 'Q3 pilot').length === 0);
const full = Array.from({ length: MAX_LABELS_PER_CONTACT }, (_, i) => `label ${i}`);
t(`more than ${MAX_LABELS_PER_CONTACT} is refused`,
  /Remove one first/.test(msgs(checkLabel(full, 'one more'))));
t('a shortened label is a warning, not a refusal', (() => {
  const p = checkLabel([], 'y'.repeat(60));
  return p.length === 1 && p[0].blocking === false;
})());

t('adding appends it', addLabel(['a'], 'b').join(',') === 'a,b');
t('adding a duplicate changes nothing', addLabel(['Renewal'], 'RENEWAL').length === 1);
t('adding past the limit changes nothing', addLabel(full, 'one more').length === full.length);

console.log('  --- removing one ---');
t('removing takes it off the contact', removeLabel(['a', 'b'], 'a').join(',') === 'b');
t('removing ignores case', removeLabel(['Renewal'], 'renewal').length === 0);
t('removing one nobody has leaves the rest alone', removeLabel(['a'], 'z').join(',') === 'a');

console.log('  --- every label in use ---');
const book = {
  c1: ['Renewal', 'Q3 pilot'],
  c2: ['renewal'],
  c3: ['Renewal', 'chased'],
};
let index = labelIndex(book);
t('the same label in any case is one entry', index.length === 3);
t('the most used comes first', index[0].label === 'Renewal' && index[0].count === 3);
t('the rest are alphabetical, and a capital does not jump the queue',
  index[1].label === 'chased' && index[2].label === 'Q3 pilot');
t('an empty book gives an empty index', labelIndex({}).length === 0);
t('the same label twice on one contact still counts once',
  labelIndex({ c1: ['dup', 'DUP'] })[0].count === 1);

console.log('  --- searching ---');
t('an empty search matches everything', matchesLabelSearch(['a'], ''));
t('part of a label is enough', matchesLabelSearch(['Renewal'], 'new'));
t('case is ignored', matchesLabelSearch(['Renewal'], 'RENEW'));
t('a label nobody has matches nothing', matchesLabelSearch(['Renewal'], 'chased') === false);
t('a contact with no labels matches nothing', matchesLabelSearch([], 'x') === false);

console.log('  --- the matching label first ---');
let ranked = rankLabels(['chased', 'Q3 pilot', 'Renewal'], 'renewal');
t('the one you searched for leads', ranked[0] === 'Renewal');
t('and the others keep their order', ranked[1] === 'chased' && ranked[2] === 'Q3 pilot');
ranked = rankLabels(['renewal date', 'Renewal'], 'renewal');
t('an exact match beats a partial one', ranked[0] === 'Renewal');
t('no search leaves the order alone', rankLabels(['b', 'a'], '').join(',') === 'b,a');

console.log('  --- storage ---');
t('an entry joins the contact and the label', entryFor('c1', ' Renewal ') === 'c1|Renewal');
let parsed = parseEntries(['c1|Renewal', 'c1|Q3 pilot', 'c2|chased']);
t('entries read back per contact', parsed.c1.length === 2 && parsed.c2.length === 1);
t('a stored duplicate is collapsed on read',
  parseEntries(['c1|Renewal', 'c1|renewal']).c1.length === 1);
t('a malformed entry is ignored, not crashed on',
  Object.keys(parseEntries(['broken', '|orphan', ''])).length === 0);

let written = writeEntries(['c1|old', 'c2|keep'], 'c1', ['new one', 'another']);
t('writing replaces only that contact', written.filter(e => e.startsWith('c1|')).length === 2);
t('and leaves everyone else untouched', written.includes('c2|keep'));
t('writing an empty list clears that contact',
  writeEntries(['c1|old', 'c2|keep'], 'c1', []).join(',') === 'c2|keep');

t('labels for a deleted contact are pruned',
  pruneEntries(['c1|a', 'gone|b'], ['c1']).join(',') === 'c1|a');
t('pruning with nothing live clears everything',
  pruneEntries(['c1|a'], []).length === 0);

console.log(`\n    ${pass} passed, ${fail} failed`);
