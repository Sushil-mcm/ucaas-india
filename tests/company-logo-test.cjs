/* The company logo: what may be uploaded, and where it is kept.
 *
 * Most of these pin down refusals, because a refusal is what a customer sees
 * when something goes wrong and it has to say what to do next rather than what
 * went wrong internally.
 */

const {
  checkLogoFile,
  readStoredLogo,
  buildStoredLogo,
  logoMediaUrl,
  MAX_LOGO_BYTES,
  LARGE_LOGO_BYTES,
  LOGO_SETTINGS_KEY,
} = require('./company-logo.build.cjs');

let passed = 0;
let failed = 0;
const is = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) passed += 1;
  else { failed += 1; console.log(`FAIL  ${name}\n        expected ${b}\n        got      ${a}`); }
};

const png = (size) => ({ name: 'logo.png', type: 'image/png', size });

/* The ordinary case. */
is('a small png is accepted', checkLogoFile(png(40_000)).ok, true);
is('and says nothing extra', checkLogoFile(png(40_000)).advice, undefined);

/* Right at the boundaries. */
is('one byte under the ceiling is fine', checkLogoFile(png(MAX_LOGO_BYTES - 1)).ok, true);
is('the ceiling itself is fine', checkLogoFile(png(MAX_LOGO_BYTES)).ok, true);
is('one byte over is refused', checkLogoFile(png(MAX_LOGO_BYTES + 1)).ok, false);
is('and the refusal states both sizes',
   /30 MB/.test(checkLogoFile(png(MAX_LOGO_BYTES + 1)).reason), true);

/* Large but allowed - said, not blocked. Everyone in the company downloads
   this file, so the cost is theirs rather than the uploader's. */
const big = checkLogoFile(png(LARGE_LOGO_BYTES + 1));
is('a large file still uploads', big.ok, true);
is('but comes with advice', typeof big.advice, 'string');
is('and the advice explains who pays for it', /everyone in your company/.test(big.advice), true);
is('a file under the advisory size gets no advice', checkLogoFile(png(LARGE_LOGO_BYTES - 1)).advice, undefined);

/* Wrong format. */
is('a jpeg is refused', checkLogoFile({ name: 'l.jpg', type: 'image/jpeg', size: 5000 }).ok, false);
is('and the reason says why png specifically',
   /transparent/.test(checkLogoFile({ name: 'l.jpg', type: 'image/jpeg', size: 5000 }).reason), true);
is('a pdf is refused', checkLogoFile({ name: 'l.pdf', type: 'application/pdf', size: 5000 }).ok, false);
is('an uppercase mime type is still a png',
   checkLogoFile({ name: 'l.png', type: 'IMAGE/PNG', size: 5000 }).ok, true);

/* An empty file is checked before the type, because a zero-byte file with the
   right extension uploads happily and then shows nothing at all. */
is('an empty file is refused', checkLogoFile(png(0)).ok, false);
is('and told it is empty, not the wrong format',
   /empty/.test(checkLogoFile(png(0)).reason), true);
is('an empty file of the wrong type still reads as empty',
   /empty/.test(checkLogoFile({ name: 'x.jpg', type: 'image/jpeg', size: 0 }).reason), true);

/* Nothing chosen. */
is('no file is refused', checkLogoFile(null).ok, false);
is('and undefined too', checkLogoFile(undefined).ok, false);
is('a missing size is refused rather than assumed', checkLogoFile({ name: 'a.png', type: 'image/png' }).ok, false);

/* Reading what is stored. */
is('nothing stored reads as no logo', readStoredLogo({}), '');
is('an absent settings blob too', readStoredLogo(undefined), '');
is('the versioned shape is read',
   readStoredLogo({ [LOGO_SETTINGS_KEY]: { version: 1, file_name: 'a.png', updated_at: 'x' } }), 'a.png');
/* A value written before the shape was versioned must not vanish. */
is('a bare string still works', readStoredLogo({ [LOGO_SETTINGS_KEY]: 'old.png' }), 'old.png');
is('whitespace is trimmed', readStoredLogo({ [LOGO_SETTINGS_KEY]: '  b.png  ' }), 'b.png');
/* Cleared is a real state, and reads the same as never set. */
is('a cleared logo reads as none',
   readStoredLogo({ [LOGO_SETTINGS_KEY]: { version: 1, file_name: '', updated_at: 'x' } }), '');

/* Writing. */
const built = buildStoredLogo('new.png', new Date('2026-08-31T16:00:00.000Z'));
is('the file name is kept', built.file_name, 'new.png');
is('versioned from the start', built.version, 1);
is('and stamped', built.updated_at, '2026-08-31T16:00:00.000Z');

/* The URL the app fetches. */
const url = logoMediaUrl({ apiBaseUrl: 'https://api.example.com', companyUuid: 'c-1', fileName: 'a.png' });
is('the url goes through the authenticated media route', url, 'https://api.example.com/api/media/c-1/logo/a.png');
is('a trailing slash on the base does not double up',
   logoMediaUrl({ apiBaseUrl: 'https://api.example.com/', companyUuid: 'c-1', fileName: 'a.png' }),
   'https://api.example.com/api/media/c-1/logo/a.png');
is('a space in the file name is encoded',
   logoMediaUrl({ apiBaseUrl: 'https://x.com', companyUuid: 'c', fileName: 'my logo.png' }),
   'https://x.com/api/media/c/logo/my%20logo.png');

/* Empty rather than a broken URL, so a caller tests one thing. */
is('no file name gives no url', logoMediaUrl({ apiBaseUrl: 'https://x.com', companyUuid: 'c', fileName: '' }), '');
is('no company gives no url', logoMediaUrl({ apiBaseUrl: 'https://x.com', companyUuid: '', fileName: 'a.png' }), '');
is('no base gives no url', logoMediaUrl({ apiBaseUrl: '', companyUuid: 'c', fileName: 'a.png' }), '');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
