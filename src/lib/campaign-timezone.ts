/* Which timezone a campaign gets when a country is chosen on the Hours tab.
 *
 * The rule used to be "the first zone in the country's list". The lists are
 * alphabetical, so for the United States that was America/Adak - the Aleutian
 * Islands - and three live campaigns carried it with calling hours in the
 * middle of the night for everybody they called. The order is now:
 *
 *   1. A zone the campaign already has, if it belongs to the country. An
 *      existing campaign keeps what it saved.
 *   2. The browser's own zone, if it belongs to the country. The person
 *      setting the campaign up usually sits where the team does.
 *   3. The country's most common zone, from the small table below. Every
 *      country whose list holds more than one zone has a row; a country with
 *      exactly one zone needs none.
 *   4. The browser's zone, whatever it is. Never "first in the list".
 *
 * Pure: hand it the names, get a name back. No React, no Intl lookups of its
 * own - the caller passes the browser zone in, so a test can be exact.
 */

/** The zone most of a country's population keeps, for countries with several. */
export const COMMON_ZONE_BY_COUNTRY: Record<string, string> = {
  AQ: 'Antarctica/McMurdo',
  AR: 'America/Argentina/Buenos_Aires',
  AU: 'Australia/Sydney',
  BR: 'America/Sao_Paulo',
  CA: 'America/Toronto',
  CD: 'Africa/Kinshasa',
  CL: 'America/Santiago',
  CN: 'Asia/Shanghai',
  CY: 'Asia/Nicosia',
  DE: 'Europe/Berlin',
  EC: 'America/Guayaquil',
  ES: 'Europe/Madrid',
  FM: 'Pacific/Pohnpei',
  GL: 'America/Nuuk',
  ID: 'Asia/Jakarta',
  KI: 'Pacific/Tarawa',
  KZ: 'Asia/Almaty',
  MH: 'Pacific/Majuro',
  MN: 'Asia/Ulaanbaatar',
  MX: 'America/Mexico_City',
  MY: 'Asia/Kuala_Lumpur',
  NZ: 'Pacific/Auckland',
  PF: 'Pacific/Tahiti',
  PG: 'Pacific/Port_Moresby',
  PS: 'Asia/Hebron',
  PT: 'Europe/Lisbon',
  RU: 'Europe/Moscow',
  UA: 'Europe/Kiev',
  UM: 'Pacific/Wake',
  US: 'America/New_York',
  UZ: 'Asia/Tashkent',
  /* Single-zone countries people ask about most; harmless when the list
     already settles it, and a safety net should the list ever grow. */
  GB: 'Europe/London',
  IN: 'Asia/Kolkata',
};

export type ChooseCampaignTimezoneInput = {
  /** The zone already on the form or the saved campaign; '' when none. */
  saved?: string | null;
  /** The browser's zone (Intl.DateTimeFormat().resolvedOptions().timeZone). */
  browserZone?: string | null;
  /** ISO 3166-1 alpha-2 of the chosen country. */
  countryIso?: string | null;
  /** The zone names the country offers, in the order the picker shows them. */
  zones: ReadonlyArray<string>;
};

const clean = (value: unknown): string => String(value || '').trim();

/** The browser's zone, or '' where Intl cannot say (old engines, odd locales). */
export const readBrowserZone = (): string => {
  try {
    return clean(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return '';
  }
};

export const chooseCampaignTimezone = ({
  saved,
  browserZone,
  countryIso,
  zones,
}: ChooseCampaignTimezoneInput): string => {
  const names = (Array.isArray(zones) ? zones : []).map(clean).filter(Boolean);
  const kept = clean(saved);
  const local = clean(browserZone);
  const iso = clean(countryIso).toUpperCase();

  if (kept && names.includes(kept)) return kept;
  if (local && names.includes(local)) return local;
  const common = COMMON_ZONE_BY_COUNTRY[iso];
  if (common && names.includes(common)) return common;
  if (names.length === 1) return names[0];
  return local;
};

/** True when the zone on the form is already a valid answer for the country. */
export const isZoneKept = (saved: string | null | undefined, zones: ReadonlyArray<string>): boolean => {
  const kept = clean(saved);
  return Boolean(kept) && (Array.isArray(zones) ? zones : []).map(clean).includes(kept);
};
