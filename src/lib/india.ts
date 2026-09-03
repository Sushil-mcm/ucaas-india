/* India is the only country this platform serves.
 *
 * Every number on the system is a +91 number the operator already holds from a
 * licensed Indian carrier and terminates over its own SIP trunk. There is no
 * number marketplace and no second country: the wholesale DID integration that
 * used to sit here could not sell Indian numbers at all, because under the
 * DoT/TRAI licensing regime a +91 range is only issued to a licensed Indian
 * operator and cannot be resold by a foreign aggregator.
 *
 * That is why this file exists rather than a country picker. The country is not
 * a preference an admin sets, it is a fact about the deployment, and scattering
 * `|| 'US'` fallbacks through a dozen screens is how a system ends up parsing an
 * Indian number as North American and silently dialling the wrong place. One
 * constant, imported everywhere, so there is one thing to change if that ever
 * stops being true — and one thing to grep for.
 */

import type { CountryCode } from 'libphonenumber-js/max';

/** ISO 3166-1 alpha-2 for the only country served. */
export const HOME_COUNTRY: CountryCode = 'IN';

/** ISO 3166-1 alpha-3, for the APIs that ask for it in that shape. */
export const HOME_COUNTRY_ISO3 = 'IND';

/** Shown wherever a screen names the country in a sentence. */
export const HOME_COUNTRY_NAME = 'India';

/** E.164 calling code, with the plus, as it is displayed. */
export const HOME_DIAL_CODE = '+91';

/** The same code without the plus, for the places that concatenate digits. */
export const HOME_DIAL_DIGITS = '91';

/** IANA zone. India has a single zone and does not observe daylight saving. */
export const HOME_TIME_ZONE = 'Asia/Kolkata';

/** BCP 47 tag driving date, time and number formatting. */
export const HOME_LOCALE = 'en-IN';

/* A national subscriber number in India is exactly ten digits and never starts
   with 0-5 — mobile ranges begin 6-9, and landline STD codes begin 1-8 with the
   trunk 0 stripped. Ten digits is the part that matters for validation here;
   libphonenumber does the rest of the work for real classification. */
export const NATIONAL_NUMBER_LENGTH = 10;

/** Currency the platform charges in. */
export const HOME_CURRENCY = 'INR';
export const HOME_CURRENCY_SYMBOL = '₹';

/* Strip a number down to its national ten digits, whatever shape it arrives in:
   `+91 98765 43210`, `09876543210`, `919876543210` and `9876543210` all reduce
   to the same thing. Returns an empty string when there is nothing usable, so
   callers can treat that as "not an Indian number" rather than guessing. */
export const toNationalDigits = (value: unknown): string => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';

  /* Country code first, then the trunk prefix — in that order, because a
     leading 0 on a 91-prefixed string belongs to neither. */
  const withoutCountry = digits.startsWith(HOME_DIAL_DIGITS) && digits.length > NATIONAL_NUMBER_LENGTH
    ? digits.slice(HOME_DIAL_DIGITS.length)
    : digits;
  const national = withoutCountry.startsWith('0') ? withoutCountry.slice(1) : withoutCountry;

  return national.length === NATIONAL_NUMBER_LENGTH ? national : '';
};

/* True when the value is a well-formed Indian subscriber number: ten digits
   opening 1-9. Mobiles take 6-9 and landline STD codes take 1-8, so the only
   digit ruled out here is a leading 0, which `toNationalDigits` has already
   stripped as a trunk prefix. */
export const isIndianNumber = (value: unknown): boolean =>
  /^[1-9]\d{9}$/.test(toNationalDigits(value));

/** True for the 6-9 mobile ranges specifically. */
export const isIndianMobile = (value: unknown): boolean => /^[6-9]/.test(toNationalDigits(value));

/** `+919876543210` — the shape the switch and the APIs want. */
export const toE164 = (value: unknown): string => {
  const national = toNationalDigits(value);
  return national ? `${HOME_DIAL_CODE}${national}` : '';
};

/* `+91 98765 43210` — how an Indian number is written for a person. Mobile
   numbers group 5-5; landlines vary by STD code length, so they are left as one
   run of digits rather than grouped wrongly. */
export const formatIndianNumber = (value: unknown): string => {
  const national = toNationalDigits(value);
  if (!national) return String(value ?? '');
  if (!isIndianMobile(national)) return `${HOME_DIAL_CODE} ${national}`;
  return `${HOME_DIAL_CODE} ${national.slice(0, 5)} ${national.slice(5)}`;
};

/** Money, formatted the Indian way — ₹1,23,456.78, with lakh/crore grouping. */
export const formatRupees = (value: number, options?: Intl.NumberFormatOptions): string =>
  new Intl.NumberFormat(HOME_LOCALE, {
    style: 'currency',
    currency: HOME_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
