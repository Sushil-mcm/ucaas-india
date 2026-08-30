/* Which countries a company may call, and who is allowed to call them.
 *
 * WHY THIS EXISTS
 *
 * Every other control in this product costs a customer nothing when it is
 * wrong. This one costs money the moment it is wrong. A stolen password on an
 * account with no restriction is billed as real international minutes, at
 * premium-rate destinations chosen by whoever stole it, and the bill arrives
 * days later. That is the single biggest gap in the product's fraud controls,
 * and this module is the decision behind closing it.
 *
 * The decision is kept here — plain, pure, tested — rather than inside a screen,
 * because the same rule has to be answered in three places: the screen that
 * warns an admin, the screen that warns a caller, and eventually the call switch
 * itself. Three copies of a rule that gates money is three chances for two of
 * them to disagree.
 *
 * THE FIVE RULES IT WILL NOT BEND
 *
 *   1. An extension or a short internal number is never an international call,
 *      and that is checked BEFORE the number is parsed. Ask a phone-number
 *      library about "+1001" and it answers "the United States", because +1 is
 *      a real country code — so a four-digit extension typed with a plus in
 *      front of it would be judged as a call to America. That mistake has
 *      already been made here once.
 *
 *   2. The company's own country is never "abroad". When the account has no
 *      country on it at all, there is nothing to measure "abroad" against, so
 *      every readable number is weighed against the allowed list instead — which
 *      is why the company screen keeps the company's own country in that list
 *      and says so when it cannot work out what that country is.
 *
 *   3. Nothing configured means everything allowed. Today the platform places
 *      every call, everywhere, for everybody. An account that has never opened
 *      these screens must keep behaving exactly that way. Only a restriction an
 *      admin deliberately turned on — on the company, or on that one person —
 *      may stop a call. Silently cutting off every company that never
 *      configured this would be a far worse fault than the gap being fixed.
 *
 *   4. The company list is the ceiling, and the person can only narrow it
 *      further. A person can be refused a country the company allows, including
 *      inside a company that has restricted nothing at all. A person can never
 *      be granted a country the company forbids — which falls out of the order
 *      the checks run in, not out of a rule someone has to remember.
 *
 *   5. A number we cannot make sense of is never blocked. Emergency numbers,
 *      feature codes like *67, empty boxes and unrecognisable strings all pass.
 *      Refusing to connect a call because we could not read the number would be
 *      a worse failure than allowing a call we should have stopped.
 *
 * WHERE THE ANSWERS ARE STORED
 *
 * Company — on the reserved "Company Default" template (see
 * src/lib/company-defaults.ts), inside the block the calling-permissions screen
 * already owns:
 *
 *     settings.company_calling_permissions.international_calling
 *       { restricted: boolean, countries: string[], updated_at: string }
 *
 * `restricted: false` (and an absent block) means no restriction at all — rule
 * 3. `restricted: true` with an empty list means no international calling.
 *
 * It is NOT stored on the `companies.allow_country` column, and that is
 * deliberate. That column is filled at signup from the plan the company bought
 * (`planInfo.call_countries`) and describes what the PLAN covers. Nothing in the
 * console can write it — the company upsert endpoint only accepts it from
 * platform staff, and this app's own company form omits it on purpose. So it is
 * read here as the menu of countries an admin may choose from, and the admin's
 * own narrower choice is stored where the console can actually save it.
 *
 * Person — on the person's own record, in the `users.settings` JSON column:
 *
 *     settings.international_calling
 *       { allowed: true | false | null, countries: string[], updated_at: string }
 *
 * `allowed: null` (and an absent block) means "whatever the company says".
 *
 * NOT `users.permission`: that column is read at login but nothing anywhere
 * writes it, so a value put there could never be changed again.
 *
 * Deliberately pure. No React, no network, no imports from this codebase — the
 * only dependency is the phone-number library. It is written to be re-read and
 * copied by whoever adds the matching check to the call switch.
 */

import { parsePhoneNumberFromString, isSupportedCountry } from 'libphonenumber-js';

/** Where the company answer lives, for anyone wiring up a reader. */
export const COMPANY_PERMISSIONS_KEY = 'company_calling_permissions';
export const COMPANY_INTERNATIONAL_KEY = 'international_calling';
export const COMPANY_INTERNATIONAL_PATH = `${COMPANY_PERMISSIONS_KEY}.${COMPANY_INTERNATIONAL_KEY}`;

/** Where the person's answer lives, directly under `users.settings`. */
export const PERSON_INTERNATIONAL_KEY = 'international_calling';

/**
 * How many digits still counts as an internal number.
 *
 * Four is what the rest of the product treats as an extension — see
 * `isExtensionDialTarget` in src/lib/extension-utility.ts, which caps at four
 * for exactly the same reason. That helper is not reused here on purpose: it
 * answers "is this one of our colleagues?", which needs a directory, while this
 * answers the much narrower "could this possibly be a call abroad?" and must
 * stay free of every other part of the app so the call switch can copy it.
 */
export const INTERNAL_MAX_DIGITS = 4;

/**
 * Short numbers that reach help, listed so the reason a call was allowed reads
 * correctly rather than calling an ambulance "an extension".
 *
 * Everything here is four digits or fewer, so it would already have passed as
 * internal. The list changes nothing about whether the call connects; it exists
 * so nobody later "tidies up" the internal-number rule and takes 999 with it.
 */
export const EMERGENCY_NUMBERS: readonly string[] = [
  '000', '08', '100', '101', '102', '106', '108', '110', '111', '112', '113',
  '114', '115', '117', '118', '119', '122', '911', '912', '991', '992', '993',
  '994', '995', '996', '997', '998', '999', '1122',
];

const EMERGENCY_SET = new Set(EMERGENCY_NUMBERS);

/* ------------------------------------------------------------------ *
 * Reading what was stored
 * ------------------------------------------------------------------ */

/** JSON columns arrive as objects on some endpoints and as strings on others. */
const asObject = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  try {
    const parsed: unknown = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : {};
  } catch {
    return {};
  }
};

/**
 * An ISO alpha-2 country code, upper case, or '' when the value is not one.
 *
 * Anything the phone-number library does not recognise is dropped rather than
 * carried through. A code nothing can match is a country that can never be
 * dialled, and a stored list full of those would quietly block calls the admin
 * believed they had allowed.
 */
export const toCountryCode = (value: unknown): string => {
  const candidate = String(value ?? '').trim().toUpperCase();
  if (candidate.length !== 2) return '';
  return isSupportedCountry(candidate) ? candidate : '';
};

/** A stored list of countries, cleaned up: real codes only, no duplicates. */
export const toCountryList = (value: unknown): string[] => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.trim()
      ? (() => {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  const codes = raw
    /* Both spellings are accepted because the plan's own country list stores
       objects (`{ country_code_iso2: 'GB', ... }`) while this screen stores
       plain codes. Reading both means a list copied from the plan still works. */
    .map((entry: any) =>
      toCountryCode(typeof entry === 'string' ? entry : entry?.country_code_iso2 ?? entry?.code),
    )
    .filter(Boolean);

  return codes.filter((code, index) => codes.indexOf(code) === index);
};

/** The company's answer: is international calling restricted, and to where. */
export interface CompanyInternationalRule {
  /** False means no restriction of any kind — the platform's behaviour today. */
  restricted: boolean;
  /** The countries that may be called. Only meaningful when restricted. */
  countries: string[];
}

/** The person's answer. `allowed: null` means "follow the company". */
export interface PersonInternationalRule {
  allowed: boolean | null;
  /**
   * A narrower list for this one person. Empty means no personal narrowing —
   * they get whatever the company allows. Never widens: the company list is
   * checked first and separately.
   */
  countries: string[];
}

export const NO_COMPANY_RESTRICTION: CompanyInternationalRule = { restricted: false, countries: [] };
export const FOLLOW_COMPANY: PersonInternationalRule = { allowed: null, countries: [] };

/**
 * Read the company rule out of the Company Default template's settings blob.
 *
 * Anything missing, unreadable or a shape we did not write reads as "no
 * restriction". That is rule 3 in code: the only way to end up restricted is
 * for someone to have deliberately stored `restricted: true`.
 */
export const readCompanyInternationalRule = (companySettings: unknown): CompanyInternationalRule => {
  const block = asObject(asObject(asObject(companySettings)[COMPANY_PERMISSIONS_KEY])[
    COMPANY_INTERNATIONAL_KEY
  ]);

  return {
    restricted: block.restricted === true,
    countries: toCountryList(block.countries),
  };
};

/**
 * Read one person's rule out of their `users.settings`.
 *
 * Only the two literal booleans mean anything. Every other value — missing,
 * null, a leftover string — reads as "follow the company", so a half-written
 * record can never be the thing that stops someone's call.
 */
export const readPersonInternationalRule = (userSettings: unknown): PersonInternationalRule => {
  const block = asObject(asObject(userSettings)[PERSON_INTERNATIONAL_KEY]);
  const allowed = block.allowed;

  return {
    allowed: allowed === true ? true : allowed === false ? false : null,
    countries: toCountryList(block.countries),
  };
};

/**
 * The company block to store, built from what an admin chose.
 *
 * The country list is only kept when the restriction is on. Storing a list
 * under a switch that is off would leave a later reader — or a later version of
 * this screen — able to mistake it for a permission somebody granted.
 */
export const buildCompanyInternationalRule = (
  rule: CompanyInternationalRule,
  now: Date = new Date(),
): Record<string, any> => ({
  restricted: rule.restricted === true,
  countries: rule.restricted ? toCountryList(rule.countries) : [],
  updated_at: now.toISOString(),
});

/**
 * The block to store on one person, or `undefined` when they should simply
 * follow the company.
 *
 * `undefined` rather than `{ allowed: null }` on purpose: a record with nothing
 * on it and a record saying "follow the company" mean the same thing, and one
 * shape means a reader can never treat an empty block as a decision. It is also
 * what the person form needs, because the endpoint behind it drops undefined
 * keys, so returning undefined removes the block from the record.
 */
export const buildPersonInternationalRule = (
  rule: PersonInternationalRule,
  now: Date = new Date(),
): Record<string, any> | undefined => {
  if (rule.allowed === null) return undefined;

  return {
    allowed: rule.allowed === true,
    /* A list kept under "not allowed" would read to a later maintainer as a set
       of countries somebody was granted. It is dropped, not hidden. */
    countries: rule.allowed ? toCountryList(rule.countries) : [],
    updated_at: now.toISOString(),
  };
};

/**
 * A person's whole `settings` object, with only their international-calling
 * answer changed.
 *
 * The endpoint behind the person form REPLACES the whole user record, so every
 * other setting has to survive this untouched — which is why this takes the
 * stored settings and hands back a copy rather than building a fresh object.
 *
 * Choosing "follow the company" removes the block entirely instead of writing
 * `allowed: null`. A record with nothing on it and a record that says "follow
 * the company" mean the same thing, and keeping one shape means a reader can
 * never treat an empty block as a decision.
 */
export const writePersonInternationalRule = (
  userSettings: unknown,
  rule: PersonInternationalRule,
  now: Date = new Date(),
): Record<string, any> => {
  const settings = { ...asObject(userSettings) };
  const block = buildPersonInternationalRule(rule, now);

  if (!block) {
    delete settings[PERSON_INTERNATIONAL_KEY];
    return settings;
  }

  settings[PERSON_INTERNATIONAL_KEY] = block;
  return settings;
};

/* ------------------------------------------------------------------ *
 * Naming countries in a sentence a customer can read
 * ------------------------------------------------------------------ */

let regionNames: Intl.DisplayNames | null | undefined;

/**
 * "GB" becomes "United Kingdom".
 *
 * Falls back to the code itself when the browser or the server cannot name it,
 * because a sentence saying "Calls to GB are not allowed" is still useful and a
 * sentence that throws is not.
 */
export const countryName = (code: unknown): string => {
  const iso = String(code ?? '').trim().toUpperCase();
  if (!iso) return '';

  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      regionNames = null;
    }
  }

  if (!regionNames) return iso;

  try {
    return regionNames.of(iso) || iso;
  } catch {
    return iso;
  }
};

/** How many countries to name before a sentence stops being readable. */
const MAX_NAMED_COUNTRIES = 6;

/** "France, Spain and the United Kingdom" — or "France and 11 more countries". */
export const listCountryNames = (codes: readonly string[]): string => {
  const names = codes.map(countryName).filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];

  if (names.length > MAX_NAMED_COUNTRIES) {
    const shown = names.slice(0, MAX_NAMED_COUNTRIES);
    const rest = names.length - MAX_NAMED_COUNTRIES;
    return `${shown.join(', ')} and ${rest} more ${rest === 1 ? 'country' : 'countries'}`;
  }

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/* ------------------------------------------------------------------ *
 * What kind of number was dialled
 * ------------------------------------------------------------------ */

export type DialledKind =
  /** Nothing was typed. */
  | 'empty'
  /** *67, #31# and the like — a instruction to the phone system, not a number. */
  | 'feature-code'
  /** Short enough to be a colleague's extension or an internal code. */
  | 'internal'
  /** A short number that reaches help. */
  | 'emergency'
  /** We could not read it as a phone number at all. */
  | 'unrecognised'
  /** A real number, but its country cannot be worked out (+870, +882 and such). */
  | 'country-unknown'
  /** A real number in the company's own country. */
  | 'domestic'
  /** A real number in another country. */
  | 'international';

export interface DialledNumber {
  kind: DialledKind;
  /** ISO alpha-2, or '' when there is no country to name. */
  country: string;
  /** The readable country name, or '' — for the sentence shown to a customer. */
  country_name: string;
  /** The number in +country format when we could read one, otherwise ''. */
  e164: string;
}

export interface ClassifyOptions {
  /** The company's own country, ISO alpha-2. '' or null when unknown. */
  homeCountry?: string | null;
  /** Override the extension length for a company that uses longer ones. */
  internalDigits?: number;
}

/**
 * Work out what somebody actually dialled.
 *
 * The order of these checks is the whole point of the function, so it is worth
 * saying plainly: everything that could be internal is settled BEFORE the
 * number is handed to the phone-number library. Do it the other way round and
 * "+1001" comes back as a call to the United States.
 */
export const classifyDialled = (
  dialled: unknown,
  { homeCountry, internalDigits = INTERNAL_MAX_DIGITS }: ClassifyOptions = {},
): DialledNumber => {
  const empty: DialledNumber = { kind: 'empty', country: '', country_name: '', e164: '' };
  const raw = String(dialled ?? '').trim();
  if (!raw) return empty;

  /* A leading * or # is a feature code — *67 to withhold a number, *82 to show
     it. Those never leave the switch, so they can never be an expensive call. */
  if (raw.startsWith('*') || raw.startsWith('#')) {
    return { kind: 'feature-code', country: '', country_name: '', e164: '' };
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) return { kind: 'unrecognised', country: '', country_name: '', e164: '' };

  if (EMERGENCY_SET.has(digits)) {
    return { kind: 'emergency', country: '', country_name: '', e164: '' };
  }

  /* Rule 1. Short enough to be an extension, so it is one, whatever a plus in
     front of it might suggest to a parser. */
  if (digits.length <= Math.max(1, internalDigits)) {
    return { kind: 'internal', country: '', country_name: '', e164: '' };
  }

  const home = toCountryCode(homeCountry);

  let parsed: ReturnType<typeof parsePhoneNumberFromString>;
  try {
    parsed = parsePhoneNumberFromString(raw, (home || undefined) as any);
  } catch {
    parsed = undefined;
  }

  /* Not a number we can read. Rule 5: allowed, and said so honestly, rather
     than guessed at. */
  if (!parsed || !parsed.isValid()) {
    return { kind: 'unrecognised', country: '', country_name: '', e164: '' };
  }

  const country = toCountryCode(parsed.country);
  if (!country) {
    /* Real, dialable, and belonging to no country — satellite and global
       networks are the usual case. There is no country to check a list
       against, so it is reported separately rather than being called domestic
       or being blocked on a guess. */
    return { kind: 'country-unknown', country: '', country_name: '', e164: parsed.number || '' };
  }

  /* Rule 2. */
  if (home && country === home) {
    return {
      kind: 'domestic',
      country,
      country_name: countryName(country),
      e164: parsed.number || '',
    };
  }

  return {
    kind: 'international',
    country,
    country_name: countryName(country),
    e164: parsed.number || '',
  };
};

/* ------------------------------------------------------------------ *
 * The decision
 * ------------------------------------------------------------------ */

export type InternationalCallReason =
  /* Allowed */
  | 'no-number'
  | 'feature-code'
  | 'internal-number'
  | 'emergency'
  | 'unrecognised'
  | 'country-unknown'
  | 'domestic'
  | 'no-restriction'
  | 'company-allows'
  /* Refused */
  | 'company-country-not-allowed'
  | 'company-allows-nowhere'
  | 'person-not-allowed'
  | 'person-country-not-allowed';

export interface InternationalCallDecision {
  allowed: boolean;
  /** A stable code, for a switch or a log. Never shown to a customer. */
  reason: InternationalCallReason;
  /** One sentence a customer can read, explaining the answer. */
  message: string;
  /** What the number turned out to be. */
  dialled: DialledNumber;
  /** Which level decided: nobody, the company, or the person. */
  decidedBy: 'none' | 'company' | 'person';
}

export interface InternationalCallInput extends ClassifyOptions {
  /** Exactly what was typed or clicked, before any tidying up. */
  dialled: unknown;
  /** The company rule. Leave it out and nothing is restricted. */
  company?: CompanyInternationalRule | null;
  /** The person's rule. Leave it out and they follow the company. */
  person?: PersonInternationalRule | null;
  /** Used in the sentence. Falls back to "This person". */
  personName?: string;
}

/**
 * May this call go through, and if not, why not — in words a customer can read.
 *
 * The order below IS the ceiling rule. The company is asked first and, when it
 * says no, the person is never asked at all — so there is no path by which a
 * person's own permission can open a country the company closed.
 */
export const checkInternationalCall = ({
  dialled,
  homeCountry,
  internalDigits,
  company,
  person,
  personName,
}: InternationalCallInput): InternationalCallDecision => {
  const number = classifyDialled(dialled, { homeCountry, internalDigits });
  const who = String(personName || '').trim() || 'This person';

  const allow = (
    reason: InternationalCallReason,
    message: string,
    decidedBy: InternationalCallDecision['decidedBy'] = 'none',
  ): InternationalCallDecision => ({ allowed: true, reason, message, dialled: number, decidedBy });

  const refuse = (
    reason: InternationalCallReason,
    message: string,
    decidedBy: InternationalCallDecision['decidedBy'],
  ): InternationalCallDecision => ({ allowed: false, reason, message, dialled: number, decidedBy });

  /* Rule 5, first and without conditions. None of these can be an expensive
     call abroad, so none of them is ever weighed against a country list. */
  switch (number.kind) {
    case 'empty':
      return allow('no-number', 'No number was dialled, so there is nothing to check.');
    case 'feature-code':
      return allow(
        'feature-code',
        'This is a phone system code, not a phone number, so it is always allowed.',
      );
    case 'internal':
      return allow(
        'internal-number',
        'This is an internal extension, not a call to another country.',
      );
    case 'emergency':
      return allow('emergency', 'Emergency numbers are always allowed and are never restricted.');
    case 'unrecognised':
      return allow(
        'unrecognised',
        'We could not read this as a phone number, so it is not treated as an international call.',
      );
    case 'country-unknown':
      return allow(
        'country-unknown',
        'This number does not belong to any one country, so it cannot be matched against your allowed countries.',
      );
    case 'domestic':
      return allow('domestic', 'This is a call inside your own country.');
    default:
      break;
  }

  const companyRule: CompanyInternationalRule = company || NO_COMPANY_RESTRICTION;
  const personRule: PersonInternationalRule = person || FOLLOW_COMPANY;
  const destination = number.country_name || number.country;

  /* The company is asked first, and only ever narrows. Rule 3 lives in the
     outer `if`: a company that has not restricted anything skips this block
     entirely and nothing here can refuse the call. */
  if (companyRule.restricted) {
    if (companyRule.countries.length === 0) {
      return refuse(
        'company-allows-nowhere',
        `Your company does not allow calls to other countries, so this call to ${destination} cannot go through.`,
        'company',
      );
    }

    if (!companyRule.countries.includes(number.country)) {
      return refuse(
        'company-country-not-allowed',
        `Your company does not allow calls to ${destination}. The countries you can call are ${listCountryNames(
          companyRule.countries,
        )}.`,
        'company',
      );
    }
  }

  /* Rule 4. The person is asked second, and only ever narrows further. Because
     the company has already had its say and returned on a refusal, nothing
     below can open a country the company closed. But a person CAN still be
     refused inside a company that allows everywhere, which is the whole point
     of having a per-person control. */
  if (personRule.allowed === false) {
    return refuse(
      'person-not-allowed',
      `${who} is not allowed to make calls to other countries, so this call to ${destination} cannot go through.`,
      'person',
    );
  }

  if (personRule.countries.length > 0 && !personRule.countries.includes(number.country)) {
    /* Only the countries the company also allows are named, so the sentence can
       never advertise a country that would be refused anyway. A person whose
       whole personal list is outside the company list has, in practice, no
       international calling at all, and is told that rather than being given a
       list of countries that would not work. */
    const own = companyRule.restricted
      ? personRule.countries.filter((code) => companyRule.countries.includes(code))
      : personRule.countries;

    return refuse(
      'person-country-not-allowed',
      own.length
        ? `${who} can only call ${listCountryNames(own)}, so this call to ${destination} cannot go through.`
        : `${who} is not allowed to make calls to other countries, so this call to ${destination} cannot go through.`,
      'person',
    );
  }

  return companyRule.restricted
    ? allow(
        'company-allows',
        `${destination} is one of the countries your company allows.`,
        personRule.allowed === true ? 'person' : 'company',
      )
    : allow(
        'no-restriction',
        `Your company has not limited which countries can be called, so calls to ${destination} are allowed.`,
        personRule.allowed === true ? 'person' : 'none',
      );
};

/* ------------------------------------------------------------------ *
 * Sentences for the settings screens
 * ------------------------------------------------------------------ */

/** What the company rule currently amounts to, for the line under the switch. */
export const describeCompanyRule = (rule: CompanyInternationalRule): string => {
  if (!rule.restricted) {
    return 'Calls can be made to any country. Nothing is restricted.';
  }
  if (rule.countries.length === 0) {
    return 'No countries are chosen, so no calls to other countries would be allowed at all.';
  }
  return `Calls to other countries are limited to ${listCountryNames(rule.countries)}.`;
};

/** The same, for one person, for the line under their control. */
export const describePersonRule = (
  rule: PersonInternationalRule,
  company: CompanyInternationalRule = NO_COMPANY_RESTRICTION,
): string => {
  if (rule.allowed === null) {
    return `Follows the company setting. ${describeCompanyRule(company)}`;
  }
  if (rule.allowed === false) {
    return 'This person cannot call other countries, even ones the company allows.';
  }
  if (rule.countries.length > 0) {
    return `This person can call ${listCountryNames(rule.countries)}, as long as the company allows those countries too.`;
  }
  return 'This person can call any country the company allows.';
};
