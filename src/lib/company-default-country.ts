/* One country for the whole company, so nobody has to pick it twice.
 *
 * Buying a number starts with choosing a country, and the choice is asked from
 * scratch every single time: `initialState.location` in
 * src/pages/admin-settings/numbers/all-numbers/constants.ts is `null`, so an
 * account that has only ever bought numbers in one country still scrolls a
 * two-hundred-entry list to find it again. Most business phone systems settle
 * this once at the company level and pre-fill it everywhere afterwards.
 *
 * This file is the reader for that setting. It answers one question — "which
 * country should a form open on?" — and hands back an option object in exactly
 * the shape the asking screen already uses, so wiring it in is one line.
 *
 * Where the answer comes from, in order:
 *
 *   1. settings.company_policies.default_country — an ISO alpha-2 code saved
 *      from Admin > Company > Policies, alongside the other keys that page
 *      writes (see src/pages/admin-settings/company-info/company-policies.tsx).
 *   2. The main location's country. A location already stores one, and the
 *      location marked as main is the company's own address — a far better
 *      guess than an empty box. See src/pages/admin-settings/company-info/index.tsx,
 *      which marks the main location with `is_default === '1'`.
 *   3. Nothing. An account with neither must behave exactly as it does today.
 *
 * Three rules it will not bend:
 *
 *   1. It never overrides a country somebody has already chosen on a form. It
 *      fills an empty field or it returns null; there is no third outcome.
 *   2. It never invents a country the account cannot actually use. The seed is
 *      always an object taken from the list the screen itself was given, so a
 *      country the number supplier does not sell in can never be pre-filled.
 *   3. No company value and no main location means no seed at all — not a
 *      guessed 'US', not the first entry of a list.
 *
 * Deliberately pure: no React, no query client, no network. Hand it the company
 * settings blob, the site rows and the form's current value, get an option back.
 */

import countryList from '@/lib/countries.json';

/** Where the company policies page keeps everything it writes. */
export const COMPANY_POLICIES_KEY = 'company_policies';

/** The new key inside that blob, and the dotted path to it for reference. */
export const DEFAULT_COUNTRY_KEY = 'default_country';
export const DEFAULT_COUNTRY_PATH = `${COMPANY_POLICIES_KEY}.${DEFAULT_COUNTRY_KEY}`;

/**
 * The minimum shape every country select in this product uses: a readable name
 * and an ISO alpha-2 code. The number-buying screen's own options carry extra
 * keys on top of these (whether the country has states to pick, its fax
 * packages) and those are preserved — see `getCompanyDefaultCountryOption`.
 */
export interface CountryOption {
  label: string;
  value: string;
}

/** Which of the two sources the answer came from, for wording on screen. */
export type CompanyDefaultCountrySource = 'company' | 'location';

export interface ResolvedDefaultCountry {
  /** ISO alpha-2, upper case. Never empty — no answer is `null` instead. */
  iso2: string;
  /** The readable country name, for a sentence an admin reads. */
  name: string;
  source: CompanyDefaultCountrySource;
}

/**
 * Every country, in the shape a picker wants. Same construction as
 * src/pages/admin-settings/company-info/company-record.tsx, so the company
 * record and the company policy store the country identically — a code, not a
 * name, because a name cannot be matched against a number supplier's list.
 */
export const COUNTRY_OPTIONS: CountryOption[] = (countryList || [])
  .map((country: any) => ({
    label: String(country?.name || ''),
    value: String(country?.isoCode || '').toUpperCase(),
  }))
  .filter((option) => option.label && option.value);

/** Company settings arrive as an object or as an unparsed JSON string. */
const toObject = (raw: unknown): Record<string, any> | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : null;
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? (raw as Record<string, any>) : null;
};

/**
 * An ISO alpha-2 code from whatever was stored.
 *
 * Both spellings are accepted on purpose. The company policy saves a code, but
 * a location saves the readable country NAME — `country: country?.value` in
 * src/pages/admin-settings/company-info/new-site-steps/index.tsx, where the
 * option's value is the name. Anything that matches neither list is dropped
 * rather than passed through, because a code the country list does not know is
 * a code the number supplier will not know either.
 */
export const toIso2 = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const upper = raw.toUpperCase();
  const byCode = COUNTRY_OPTIONS.find((option) => option.value === upper);
  if (byCode) return byCode.value;

  const lower = raw.toLowerCase();
  const byName = COUNTRY_OPTIONS.find((option) => option.label.toLowerCase() === lower);
  return byName ? byName.value : '';
};

/** The readable name for a code, or '' when the code is not one we know. */
export const getCountryName = (iso2: unknown): string =>
  COUNTRY_OPTIONS.find((option) => option.value === String(iso2 ?? '').trim().toUpperCase())
    ?.label || '';

/** The company-wide country as stored, or '' when the admin has not set one. */
export const readStoredDefaultCountry = (companySettings: unknown): string => {
  const settings = toObject(companySettings);
  if (!settings) return '';

  const policies = toObject(settings[COMPANY_POLICIES_KEY]);
  if (!policies) return '';

  return toIso2(policies[DEFAULT_COUNTRY_KEY]);
};

/**
 * The main location's country.
 *
 * The main location is the one flagged `is_default`, which the API hands back
 * as the string '1'. Numbers and booleans are accepted too so a backend that
 * tightens up its JSON does not silently turn this off.
 *
 * One deliberate widening: when nothing is flagged but the account has exactly
 * ONE location, that location is treated as the main one. It is the company's
 * only address, so calling it anything else would be pedantry — and the flag is
 * known not to be set on every account (the main-location control notes the API
 * may refuse to move it). With two or more unflagged locations there is no
 * honest way to choose, so nothing is returned.
 */
export const readMainLocationCountry = (sites: unknown): string => {
  const rows = Array.isArray(sites) ? sites : [];
  if (!rows.length) return '';

  const isMain = (site: any) => {
    const flag = site?.is_default;
    return flag === '1' || flag === 1 || flag === true;
  };

  const flagged = rows.filter(isMain);
  const main = flagged.length ? flagged[0] : rows.length === 1 ? rows[0] : null;

  return main ? toIso2((main as any)?.country) : '';
};

export interface CompanyDefaultCountryInput {
  /**
   * The `settings` blob from the reserved company record — see
   * src/lib/company-defaults.ts. `null`/`undefined` when no company record
   * exists. A JSON string is accepted, because some endpoints hand this column
   * back unparsed.
   */
  companySettings?: unknown;
  /**
   * The site rows, exactly as `useGetSite` / the `siteList` query return them.
   * Optional: leave it out and only the company value is considered.
   */
  sites?: unknown;
}

/**
 * Which country a form should open on, and why — or `null` when the account has
 * neither a company default nor a main location, in which case the caller must
 * do nothing at all.
 */
export const resolveCompanyDefaultCountry = ({
  companySettings,
  sites,
}: CompanyDefaultCountryInput): ResolvedDefaultCountry | null => {
  const stored = readStoredDefaultCountry(companySettings);
  if (stored) return { iso2: stored, name: getCountryName(stored), source: 'company' };

  const fromLocation = readMainLocationCountry(sites);
  if (fromLocation)
    return { iso2: fromLocation, name: getCountryName(fromLocation), source: 'location' };

  return null;
};

/**
 * Whether a country field is still free to fill.
 *
 * `null` is what the number-buying form starts as; `{}` and an option with an
 * empty value are the shapes a cleared select leaves behind. A plain string is
 * accepted for screens that store the code directly. Anything else counts as a
 * real choice somebody made, and is never touched.
 */
export const isCountryUnset = (current: unknown): boolean => {
  if (current === null || current === undefined) return true;
  if (typeof current === 'string') return current.trim() === '';
  if (typeof current === 'object') {
    const value = (current as any)?.value;
    return value === null || value === undefined || String(value).trim() === '';
  }
  return false;
};

export interface CompanyDefaultCountryOptionInput<T> extends CompanyDefaultCountryInput {
  /**
   * The options the screen is showing right now — the country list it built
   * from its own API call. The seed is one of THESE objects, returned by
   * reference, so every extra key the screen put on it (state support, fax
   * packages) comes along and `setValue` receives exactly what a click would
   * have produced. When the default country is not in this list, nothing is
   * seeded: the account cannot buy there, and pre-filling it would only produce
   * an empty results table with no explanation.
   */
  options?: readonly T[] | null;
  /** What the form holds now. An already-chosen country is never replaced. */
  current?: unknown;
}

/**
 * The drop-in for a country select: returns the option to seed, or `null` when
 * nothing should be seeded.
 *
 * `null` is returned whenever the admin has already chosen a country, the
 * account has no company default and no usable main location, or the default
 * country is not among the options this screen can offer.
 *
 * With no `options` list, the answer falls back to a plain `{ label, value }`
 * built from the shared country list — enough for screens whose select is
 * driven by `COUNTRY_OPTIONS` rather than by an API call of their own.
 */
export const getCompanyDefaultCountryOption = <T extends { value?: unknown }>({
  companySettings,
  sites,
  options,
  current,
}: CompanyDefaultCountryOptionInput<T>): T | CountryOption | null => {
  // Rule 1: an answer already on the form is the admin's, and is left alone.
  if (!isCountryUnset(current)) return null;

  const resolved = resolveCompanyDefaultCountry({ companySettings, sites });
  if (!resolved) return null;

  if (options && options.length) {
    return (
      options.find((option) => String(option?.value ?? '').toUpperCase() === resolved.iso2) || null
    );
  }

  if (options) return null;

  return { label: resolved.name, value: resolved.iso2 };
};
