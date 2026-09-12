/* The country a campaign's calling rules are held to.
 *
 * The wizard asks for a country twice, and they are different questions:
 *   - Hours & recording: the country the TEAM sits in (a timezone picker
 *     follows it) - settings.operational_hours.regional.country_code.
 *   - Calling rules: the country being CALLED, which picks the abandon rule
 *     and tells the number parser how to read a local-format lead - `country`.
 *
 * Most campaigns call the country the team sits in, so an unanswered second
 * question defaults to the first. An explicit choice on Calling rules always
 * wins; the review says which of the two it is reading.
 */

import { toIso2 } from '@/lib/company-default-country';

export type CampaignCountrySource = 'chosen' | 'hours' | 'none';

export type EffectiveCampaignCountry = {
  /** ISO 3166-1 alpha-2, or '' when neither question was answered. */
  iso2: string;
  source: CampaignCountrySource;
};

/* Both questions may hold a bare code or the picker's {label, value} object. */
const unwrap = (value: unknown): string => {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return String(v.value ?? v.isoCode ?? v.code ?? '').trim();
  }
  return String(value ?? '').trim();
};

export const effectiveCampaignCountry = (
  chosen: unknown,
  hoursCountryCode: unknown,
): EffectiveCampaignCountry => {
  const explicit = toIso2(unwrap(chosen));
  if (explicit) return { iso2: explicit, source: 'chosen' };
  const hours = toIso2(unwrap(hoursCountryCode));
  if (hours) return { iso2: hours, source: 'hours' };
  return { iso2: '', source: 'none' };
};

/** The hours-tab country code as the form holds it: {label, value: 'US'} or a string. */
export const hoursCountryOf = (formValues: any): unknown =>
  formValues?.settings?.operational_hours?.regional?.country_code;
