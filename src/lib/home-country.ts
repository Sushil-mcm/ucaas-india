import { useMemo } from 'react';
import { isSupportedCountry, type CountryCode } from 'libphonenumber-js/max';
import { useUser } from '@/hooks/use-user';

/* The account's own country — the thing "international" is measured against.
 *
 * There is no company country on the Company Default record, so the only
 * account-level country the front end has is `user.countryInfo.alpha2code` on
 * the signed-in user. Five places already depend on that field: the caller-ID
 * list's flag (use-dialpad-caller-id-options.ts), the group caller-ID fallback
 * (use-group-caller-id-options.ts), the outbound rate table's "your country"
 * (calling-rates/outbound-rates.tsx), the transfer gate
 * (use-transfer-permissions.ts) and the IVR external-forwarding gate
 * (use-ivr-external-forwarding.ts).
 *
 * The last two are toll-fraud controls and each carried its own byte-identical
 * copy of this resolution. Two copies of the rule that decides whether a call is
 * abroad is one copy too many: a correction to one silently leaves the other
 * deciding differently, and both of them gate money.
 *
 * What is deliberately NOT here is how a dialled string is parsed. The transfer
 * panel parses with the home country as the default because people type numbers
 * the local way; the IVR forwarding field parses as international first because
 * the widget behind it hands back a full international number without the plus.
 * Those are two correct answers to two different inputs, and each stays with the
 * screen whose input it describes.
 */

/** A two-letter country code, or null when the value is missing or not a real one. */
export const toCountryCode = (value: unknown): CountryCode | null => {
  const candidate = String(value || '')
    .trim()
    .toUpperCase();
  if (candidate.length !== 2) return null;
  return isSupportedCountry(candidate) ? (candidate as CountryCode) : null;
};

export interface HomeCountry {
  /** null when the account has no readable country. Callers treat that as domestic. */
  homeCountry: CountryCode | null;
  /** For sentences shown to an admin. Falls back to "your country". */
  homeCountryName: string;
}

export const useHomeCountry = (): HomeCountry => {
  const { user } = useUser();

  const homeCountry = useMemo(
    () => toCountryCode(user?.countryInfo?.alpha2code),
    [user?.countryInfo?.alpha2code],
  );

  const homeCountryName = useMemo(() => {
    const name = String(user?.countryInfo?.countryname || '').trim();
    return name || 'your country';
  }, [user?.countryInfo?.countryname]);

  return { homeCountry, homeCountryName };
};
