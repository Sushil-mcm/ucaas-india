/* Proves which calls abroad are allowed, which are refused, and — the half that
 * matters more — every case that must NEVER be refused.
 *
 * This is the one control in the product where being wrong costs real money in
 * both directions. Too loose and a stolen password bills a customer for premium
 * minutes abroad. Too tight and a company that never configured anything finds
 * its phones have stopped, or an ambulance is not called. So the "allowed"
 * cases below are tested as carefully as the "refused" ones.
 */

const {
  toCountryCode,
  toCountryList,
  readCompanyInternationalRule,
  readPersonInternationalRule,
  buildCompanyInternationalRule,
  buildPersonInternationalRule,
  writePersonInternationalRule,
  countryName,
  listCountryNames,
  classifyDialled,
  checkInternationalCall,
  describeCompanyRule,
  describePersonRule,
  INTERNAL_MAX_DIGITS,
  COMPANY_INTERNATIONAL_PATH,
  PERSON_INTERNATIONAL_KEY,
} = require('./international-calling.build.cjs');

let pass = 0,
  fail = 0;
const t = (n, c) => {
  c ? pass++ : fail++;
  console.log(`    ${c ? 'PASS' : 'FAIL'}  ${n}`);
};

/* Real, valid numbers. A made-up one parses as unreadable and would prove
   nothing about country matching. */
const LONDON = '+442071838750';
const BERLIN = '+4930901820';
const PARIS = '+33142685300';
const NEW_YORK = '+12125551234';
const MUMBAI = '+919820098200';

const UK_ONLY = { restricted: true, countries: ['GB'] };
const UK_AND_FRANCE = { restricted: true, countries: ['GB', 'FR'] };
const UNRESTRICTED = { restricted: false, countries: [] };
const NOWHERE = { restricted: true, countries: [] };

const check = (dialled, extra = {}) =>
  checkInternationalCall({ dialled, homeCountry: 'GB', ...extra });

console.log('  --- where the answers are stored ---');
t(
  'the company path is the one the dial plan will read',
  COMPANY_INTERNATIONAL_PATH === 'company_calling_permissions.international_calling',
);
t('the person key is the one under users.settings', PERSON_INTERNATIONAL_KEY === 'international_calling');

console.log('  --- reading country codes ---');
t('a real code is kept', toCountryCode('gb') === 'GB');
t('a code that is not a country is dropped', toCountryCode('ZZ') === '');
t('a country name is not a code', toCountryCode('United Kingdom') === '');
t('nothing is nothing', toCountryCode(null) === '' && toCountryCode('') === '');
t('a list is cleaned and de-duplicated', JSON.stringify(toCountryList(['gb', 'GB', 'ZZ', 'fr'])) === '["GB","FR"]');
t('a list stored as JSON text still reads', JSON.stringify(toCountryList('["GB","DE"]')) === '["GB","DE"]');
t(
  'the plan\'s own object shape is understood too',
  JSON.stringify(toCountryList([{ country_code_iso2: 'gb' }, { country_code_iso2: 'FR' }])) ===
    '["GB","FR"]',
);
t('rubbish is not a list', JSON.stringify(toCountryList('not json')) === '[]');

console.log('  --- an extension is never a call abroad ---');
/* The exact bug this module exists to avoid: "+1001" parses as a +1 number,
   which is the United States. Checked before parsing, it is an extension. */
t('a bare extension is internal', classifyDialled('1001', { homeCountry: 'GB' }).kind === 'internal');
t('an extension with a plus in front is STILL internal', classifyDialled('+1001').kind === 'internal');
t('and is not given a country', classifyDialled('+1001').country === '');
t('a three-digit internal code is internal', classifyDialled('201', { homeCountry: 'US' }).kind === 'internal');
t('the cut-off is four digits', INTERNAL_MAX_DIGITS === 4);
t(
  'a company using five-digit extensions can say so',
  classifyDialled('10015', { homeCountry: 'GB', internalDigits: 5 }).kind === 'internal',
);
t('a full number is not swallowed by that', classifyDialled(LONDON, { homeCountry: 'GB', internalDigits: 5 }).kind === 'domestic');

console.log('  --- short codes, feature codes and emergencies ---');
t('*67 is a feature code', classifyDialled('*67').kind === 'feature-code');
t('#31# is a feature code', classifyDialled('#31#').kind === 'feature-code');
t('999 is an emergency number', classifyDialled('999', { homeCountry: 'GB' }).kind === 'emergency');
t('911 is an emergency number', classifyDialled('911', { homeCountry: 'US' }).kind === 'emergency');
t('112 is an emergency number', classifyDialled('112', { homeCountry: 'DE' }).kind === 'emergency');

console.log('  --- reading an ordinary number ---');
t('home is not abroad', classifyDialled(LONDON, { homeCountry: 'GB' }).kind === 'domestic');
t('a local-format number is home too', classifyDialled('020 7183 8750', { homeCountry: 'GB' }).kind === 'domestic');
t('dialled with 00 in front, still home', classifyDialled('00442071838750', { homeCountry: 'GB' }).kind === 'domestic');
t('abroad is abroad', classifyDialled(BERLIN, { homeCountry: 'GB' }).kind === 'international');
t('and is named', classifyDialled(BERLIN, { homeCountry: 'GB' }).country === 'DE');
t('the same number from Germany is domestic', classifyDialled(BERLIN, { homeCountry: 'DE' }).kind === 'domestic');
t(
  'Canada and the United States share a dialling code but are two countries',
  classifyDialled('+16135550199', { homeCountry: 'US' }).country === 'CA',
);
t('nothing typed is nothing', classifyDialled('', { homeCountry: 'GB' }).kind === 'empty');
t('a word is not a number', classifyDialled('banana', { homeCountry: 'GB' }).kind === 'unrecognised');
t('an impossible number is not a number', classifyDialled('+999999999999').kind === 'unrecognised');
t('a number belonging to no country is reported as such', classifyDialled('+87012345678').kind !== 'international');
t('no home country still reads the destination', classifyDialled(BERLIN, { homeCountry: null }).country === 'DE');

console.log('  --- nothing configured means nothing is blocked ---');
t('no rules at all: allowed', check(BERLIN).allowed === true);
t('and says why', check(BERLIN).reason === 'no-restriction');
t('an empty settings blob reads as no restriction', readCompanyInternationalRule({}).restricted === false);
t('so does null', readCompanyInternationalRule(null).restricted === false);
t('so does a blob with other settings in it', readCompanyInternationalRule({ company_calling_permissions: { transfers: {} } }).restricted === false);
t(
  'a stored restriction is the only way to be restricted',
  readCompanyInternationalRule({
    company_calling_permissions: { international_calling: { restricted: true, countries: ['GB'] } },
  }).restricted === true,
);
t(
  'and a settings blob handed over as text still reads',
  readCompanyInternationalRule(
    JSON.stringify({ company_calling_permissions: { international_calling: { restricted: true, countries: ['gb'] } } }),
  ).countries[0] === 'GB',
);
t(
  'a truthy-but-not-true value does not restrict anybody',
  readCompanyInternationalRule({ company_calling_permissions: { international_calling: { restricted: 'yes' } } })
    .restricted === false,
);

console.log('  --- a company list decides ---');
t('an allowed country goes through', check(LONDON, { company: UK_AND_FRANCE }).allowed === true);
t('a country not on the list is refused', check(BERLIN, { company: UK_AND_FRANCE }).allowed === false);
t('and the reason is the company', check(BERLIN, { company: UK_AND_FRANCE }).decidedBy === 'company');
t('and the code is stable for the switch', check(BERLIN, { company: UK_AND_FRANCE }).reason === 'company-country-not-allowed');
t('the sentence names the country dialled', /Germany/.test(check(BERLIN, { company: UK_AND_FRANCE }).message));
t('and names what IS allowed', /France and United Kingdom/.test(check(BERLIN, { company: UK_AND_FRANCE }).message));
t('an empty list means nowhere abroad', check(BERLIN, { company: NOWHERE }).allowed === false);
t('and says exactly that', /does not allow calls to other countries/.test(check(BERLIN, { company: NOWHERE }).message));

console.log('  --- but a restriction never reaches the safe cases ---');
t('home is still allowed under the tightest rule', check(LONDON, { company: NOWHERE }).allowed === true);
t('an extension is still allowed', check('1001', { company: NOWHERE }).allowed === true);
t('an extension typed with a plus is still allowed', check('+1001', { company: NOWHERE }).allowed === true);
t('999 is still allowed', check('999', { company: NOWHERE }).allowed === true);
t('*67 is still allowed', check('*67', { company: NOWHERE }).allowed === true);
t('an empty box is still allowed', check('', { company: NOWHERE }).allowed === true);
t('a number we cannot read is still allowed', check('banana', { company: NOWHERE }).allowed === true);
t('a country-less number is still allowed', check('+87012345678', { company: NOWHERE }).allowed === true);

console.log('  --- one person, refused ---');
const BLOCKED = { allowed: false, countries: [] };
const ALLOWED = { allowed: true, countries: [] };
const FRANCE_ONLY_PERSON = { allowed: true, countries: ['FR'] };

t('a blocked person cannot call abroad', check(BERLIN, { person: BLOCKED }).allowed === false);
t('even where the company allows everything', check(BERLIN, { company: UNRESTRICTED, person: BLOCKED }).allowed === false);
t('the person is who decided', check(BERLIN, { person: BLOCKED }).decidedBy === 'person');
t('their name is used when we have it', /Priya/.test(check(BERLIN, { person: BLOCKED, personName: 'Priya' }).message));
t('and a plain phrase when we do not', /This person/.test(check(BERLIN, { person: BLOCKED }).message));
t('a blocked person can still ring an extension', check('1001', { person: BLOCKED }).allowed === true);
t('a blocked person can still ring home', check(LONDON, { person: BLOCKED }).allowed === true);
t('a blocked person can still ring 999', check('999', { person: BLOCKED }).allowed === true);

console.log('  --- the company list is the ceiling ---');
/* The rule that matters most: a person can be narrowed, never widened. */
t(
  'a person allowed everything still cannot call a country the company forbids',
  check(BERLIN, { company: UK_ONLY, person: ALLOWED }).allowed === false,
);
t('and it is the company that refused, not them', check(BERLIN, { company: UK_ONLY, person: ALLOWED }).decidedBy === 'company');
t(
  'a person allowed France cannot call France when the company forbids it',
  check(PARIS, { company: UK_ONLY, person: FRANCE_ONLY_PERSON }).allowed === false,
);
t(
  'but can when the company allows it',
  check(PARIS, { company: UK_AND_FRANCE, person: FRANCE_ONLY_PERSON }).allowed === true,
);
t(
  'and still cannot call somewhere neither allows',
  check(BERLIN, { company: UK_AND_FRANCE, person: FRANCE_ONLY_PERSON }).allowed === false,
);
t(
  'a personal list refusing a company-allowed country blames the person',
  check(LONDON, { homeCountry: 'US', company: { restricted: true, countries: ['GB', 'FR'] }, person: FRANCE_ONLY_PERSON })
    .decidedBy === 'person',
);
t(
  'and the sentence only names countries that would actually work',
  /can only call France/.test(
    check(LONDON, {
      homeCountry: 'US',
      company: { restricted: true, countries: ['GB', 'FR'] },
      person: FRANCE_ONLY_PERSON,
    }).message,
  ),
);
/* Their personal list is Germany; the company allows only the UK. Naming
   Germany would be advertising a country that could never be dialled, so the
   sentence says the plain truth instead. */
t(
  'a personal list the company forbids entirely reads as no international calling',
  /is not allowed to make calls to other countries/.test(
    check(LONDON, { homeCountry: 'US', company: UK_ONLY, person: { allowed: true, countries: ['DE'] } }).message,
  ),
);
t(
  'and the countries named are never ones the company forbids',
  /Germany/.test(
    check(LONDON, { homeCountry: 'US', company: UK_ONLY, person: { allowed: true, countries: ['DE'] } }).message,
  ) === false,
);

console.log('  --- reading a person record ---');
t('an empty record follows the company', readPersonInternationalRule({}).allowed === null);
t('so does null', readPersonInternationalRule(null).allowed === null);
t('a half-written value follows the company too', readPersonInternationalRule({ international_calling: { allowed: 'yes' } }).allowed === null);
t('a real false is a real refusal', readPersonInternationalRule({ international_calling: { allowed: false } }).allowed === false);
t('a real true is a real permission', readPersonInternationalRule({ international_calling: { allowed: true } }).allowed === true);
t(
  'their own country list is cleaned on the way in',
  JSON.stringify(readPersonInternationalRule({ international_calling: { allowed: true, countries: ['fr', 'ZZ'] } }).countries) ===
    '["FR"]',
);

console.log('  --- writing a person record never loses anything else ---');
const stored = {
  recording: { automatic: { enabled: true, value: 'all' } },
  voicemail_pin: { value: '1234', voicemail_to_text: 'YES' },
  transcription: true,
};

let written = writePersonInternationalRule(stored, { allowed: false, countries: [] });
t('the recording setting survives', written.recording.automatic.value === 'all');
t('the voicemail PIN survives', written.voicemail_pin.value === '1234');
t('transcription survives', written.transcription === true);
t('and the new answer is there', written.international_calling.allowed === false);
t('a refusal stores no country list', JSON.stringify(written.international_calling.countries) === '[]');
t('the original record is not mutated', stored.international_calling === undefined);

written = writePersonInternationalRule(stored, { allowed: true, countries: ['fr', 'gb'] });
t('a permission keeps the chosen countries', JSON.stringify(written.international_calling.countries) === '["FR","GB"]');
t('and stamps when it was set', typeof written.international_calling.updated_at === 'string');

written = writePersonInternationalRule({ ...stored, international_calling: { allowed: false } }, {
  allowed: null,
  countries: [],
});
t('going back to "follow the company" removes the block entirely', written.international_calling === undefined);
t('and still leaves everything else alone', written.transcription === true);
t(
  'so the record then reads as following the company',
  readPersonInternationalRule(written).allowed === null,
);

console.log('  --- the block the person form stores ---');
/* The form sets one key on the record rather than replacing the whole settings
   object, so it needs the block on its own — and undefined is what removes it,
   because the save endpoint drops undefined keys. */
t('"follow the company" is stored as nothing at all',
  buildPersonInternationalRule({ allowed: null, countries: [] }) === undefined);
t('a refusal is a real block', buildPersonInternationalRule(BLOCKED).allowed === false);
t('a permission is a real block', buildPersonInternationalRule(ALLOWED).allowed === true);
t('a refusal carries no country list',
  JSON.stringify(buildPersonInternationalRule({ allowed: false, countries: ['FR'] }).countries) === '[]');
t('a permission keeps and cleans its country list',
  JSON.stringify(buildPersonInternationalRule({ allowed: true, countries: ['fr', 'ZZ'] }).countries) === '["FR"]');
t('and the block reads back the way it was written',
  readPersonInternationalRule({ international_calling: buildPersonInternationalRule(BLOCKED) }).allowed === false);

console.log('  --- writing the company record ---');
let companyBlock = buildCompanyInternationalRule({ restricted: true, countries: ['gb', 'ZZ', 'fr'] });
t('only real countries are stored', JSON.stringify(companyBlock.countries) === '["GB","FR"]');
t('the switch is stored', companyBlock.restricted === true);
t('and when it was set', typeof companyBlock.updated_at === 'string');
companyBlock = buildCompanyInternationalRule({ restricted: false, countries: ['GB'] });
t('a list is never stored under a switch that is off', JSON.stringify(companyBlock.countries) === '[]');
t(
  'and reading it back gives no restriction',
  readCompanyInternationalRule({ company_calling_permissions: { international_calling: companyBlock } }).restricted ===
    false,
);

console.log('  --- naming countries in a sentence ---');
t('a code becomes a name', countryName('DE') === 'Germany');
t('an unknown code is still printable', countryName('ZZ').length > 0);
t('one country is just its name', listCountryNames(['FR']) === 'France');
t('two are joined with and', listCountryNames(['FR', 'GB']) === 'France and United Kingdom');
t('three read as a list', listCountryNames(['FR', 'GB', 'DE']) === 'France, Germany and United Kingdom');
t('a long list is cut short rather than unreadable', /more countries/.test(listCountryNames(['FR', 'GB', 'DE', 'US', 'IN', 'AU', 'CN', 'BR'])));
t('an empty list says nothing', listCountryNames([]) === '');

console.log('  --- the sentences the settings screens show ---');
t('no restriction reads as no restriction', /any country/.test(describeCompanyRule(UNRESTRICTED)));
t('an empty list warns that nothing would be allowed', /No countries are chosen/.test(describeCompanyRule(NOWHERE)));
t('a list is named', /France and United Kingdom/.test(describeCompanyRule(UK_AND_FRANCE)));
t('following the company says what the company says', /any country/.test(describePersonRule({ allowed: null, countries: [] }, UNRESTRICTED)));
t('a refusal is stated plainly', /cannot call other countries/.test(describePersonRule(BLOCKED)));
t('a permission is bounded by the company', /any country the company allows/.test(describePersonRule(ALLOWED)));

console.log('  --- the allowed answers still explain themselves ---');
t('an allowed call names the country', /Germany/.test(check(BERLIN, { company: { restricted: true, countries: ['DE'] } }).message));
t('a domestic call says so', /inside your own country/.test(check(LONDON).message));
t('an extension says so', /internal extension/.test(check('1001').message));
t('an emergency number says so', /Emergency numbers are always allowed/.test(check('999').message));
t('an unreadable number says so', /could not read this as a phone number/.test(check('banana').message));

console.log('  --- a company with no country of its own ---');
/* Nothing to measure "abroad" against, so every readable number is weighed
   against the list. The company screen keeps the home country in that list. */
t(
  'a number in the allowed list still goes through',
  checkInternationalCall({ dialled: MUMBAI, homeCountry: null, company: { restricted: true, countries: ['IN'] } })
    .allowed === true,
);
t(
  'and one outside it is refused',
  checkInternationalCall({ dialled: NEW_YORK, homeCountry: null, company: { restricted: true, countries: ['IN'] } })
    .allowed === false,
);
t(
  'with no restriction, nothing changes for them',
  checkInternationalCall({ dialled: NEW_YORK, homeCountry: null }).allowed === true,
);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
