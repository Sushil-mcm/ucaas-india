/* The dictionary that builds itself from the directory.
 *
 * The behaviour worth pinning down is that nothing disappears quietly. A real
 * directory is full of test rows, duplicates and names with digits stuck on,
 * and it is tempting to filter those out silently - but a dictionary that drops
 * a real employee without saying so is worse than one carrying some noise,
 * because nobody can fix what they cannot see.
 */

const {
  buildDictionary,
  includedTerms,
  summarise,
} = require('./speech-dictionary.build.cjs');

let passed = 0;
let failed = 0;
const is = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) passed += 1;
  else {
    failed += 1;
    console.log(`FAIL  ${name}\n        expected ${b}\n        got      ${a}`);
  }
};

const textsOf = (terms) => terms.map((t) => t.text).sort();

/* Real names taken from the live directory - the kind a generic speech engine
   mangles, which is the whole reason this exists. */
const PEOPLE = [
  { first_name: 'Babatunde', last_name: 'Adedeji' },
  { first_name: 'Eduardo', last_name: 'Ponce Molina' },
  { first_name: 'Anu', last_name: 'Nadar' },
];

const built = buildDictionary({ people: PEOPLE });

is('each name part is its own term, plus the whole name',
   textsOf(includedTerms(built)),
   ['Adedeji', 'Anu', 'Anu Nadar', 'Babatunde', 'Babatunde Adedeji',
    'Eduardo', 'Eduardo Ponce Molina', 'Nadar', 'Ponce Molina'].sort());

/* Somebody saying "ask Adedeji" says one word. Both forms have to be known. */
is('the surname alone is present', includedTerms(built).some((t) => t.text === 'Adedeji'), true);
is('and the full name too', includedTerms(built).some((t) => t.text === 'Babatunde Adedeji'), true);

/* The same person listed twice must not produce the same term twice. */
const dupes = buildDictionary({
  people: [
    { first_name: 'Umar', last_name: 'Ansari' },
    { first_name: 'Umar', last_name: 'Ansari' },
    { first_name: 'umar', last_name: 'ANSARI' },
  ],
});
is('duplicates collapse, regardless of case', textsOf(includedTerms(dupes)),
   ['Ansari', 'Umar', 'Umar Ansari'].sort());

/* Names with digits are real rows belonging to real people. They are kept, and
   surfaced, never dropped. */
const scaffolding = buildDictionary({ people: [{ first_name: 'Ramandeep001', last_name: 'Kaur' }] });
is('a name with digits is still included',
   includedTerms(scaffolding).some((t) => t.text === 'Ramandeep001'), true);
is('and it is counted as needing an eye', summarise(scaffolding).needingAttention >= 1, true);

/* Everyday words would make transcripts worse, not better. */
const common = buildDictionary({ people: [{ first_name: 'Test', last_name: 'User' }],
                                 lines: [{ name: 'Sales' }, { name: 'Support' }] });
is('everyday words are excluded', includedTerms(common).length, 0);
is('but they are still listed, with a reason',
   common.every((t) => !t.included && typeof t.excludedBecause === 'string'), true);
is('and the reason says why in plain words',
   common[0].excludedBecause.includes('everyday word'), true);

/* Two letters sound like too many other things. */
const short = buildDictionary({ custom: [{ text: 'AI' }, { text: 'CRM' }] });
is('two letters are refused', short.find((t) => t.text === 'AI').included, false);
is('three are fine', short.find((t) => t.text === 'CRM').included, true);

/* Only a person can say how a name sounds - the point of the screen. */
const withHint = buildDictionary({
  people: [{ first_name: 'Babatunde', last_name: 'Adedeji' }],
  custom: [{ text: 'Adedeji', hint: 'ah-deh-DEH-jee', language: 'en-GB' }],
});
const adedeji = withHint.find((t) => t.text === 'Adedeji');
is('a hand-written entry takes over the derived one', adedeji.source, 'custom');
is('and carries the pronunciation', adedeji.hint, 'ah-deh-DEH-jee');
is('and the language', adedeji.language, 'en-GB');
is('without creating a second copy',
   withHint.filter((t) => t.text.toLowerCase() === 'adedeji').length, 1);

/* Company and line names are things callers say out loud. */
const lines = buildDictionary({
  companyName: 'Capanicus',
  lines: [{ name: 'Billing Enquiries' }, { name: 'Onboarding' }],
});
is('the company name is in', includedTerms(lines).some((t) => t.text === 'Capanicus'), true);
is('so are line names', includedTerms(lines).some((t) => t.text === 'Billing Enquiries'), true);

/* Nothing in, nothing out - and no crash. */
is('empty input gives an empty dictionary', buildDictionary({}), []);
is('missing fields are survivable',
   buildDictionary({ people: [{ first_name: null, last_name: undefined }] }), []);
is('a person with only a first name still counts',
   textsOf(includedTerms(buildDictionary({ people: [{ first_name: 'Saurabh' }] }))), ['Saurabh']);

/* The summary is what the screen leads with: how much came for free. */
const summary = summarise(buildDictionary({
  people: PEOPLE,
  companyName: 'Capanicus',
  custom: [{ text: 'Ansible', hint: 'AN-sib-ul' }],
}));
is('derived terms are counted', summary.derived, 10);
is('hand-written ones separately', summary.handWritten, 1);
is('and the totals agree', summary.included + summary.excluded, summary.total);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
