/* Reading the company switch that decides whether a phone menu key may send a
 * caller out to a number the company does not own, and answering two questions
 * for the screens that build those menus:
 *
 *   1. may "Forward to External Number" be offered at all right now?
 *   2. is this particular number an acceptable one?
 *
 * The switch lives in the reserved "Company Default" record (see
 * src/lib/company-defaults.ts) under
 *
 *   settings.company_calling_permissions.ivr_external_forwarding
 *     { allowed: boolean, domestic_only: boolean }
 *
 * `allowed` is the parent: false means no menu key may point at an outside
 * number at all. `domestic_only` is its child: when true, an outside number is
 * still permitted but only inside the account's own country. A child can never
 * be more permissive than its parent, exactly as the transfer flags on the same
 * record are read and written
 * (src/pages/admin-settings/company-info/company-calling-permissions.tsx:111-121
 * and :131-138).
 *
 * WHY THIS SWITCH EXISTS. A menu key that dials out is a route for toll fraud.
 * Anyone in the world can ring the main number, press a digit and be connected
 * to wherever that digit points — no login, no employee, no working hours. If
 * the digit points at a premium-rate number abroad, the fraudster is paid per
 * minute and the bill is the company's. That is why established systems ship
 * this off by default and usually restrict it to domestic numbers when it is
 * switched on at all.
 *
 * ---------------------------------------------------------------------------
 * HONESTY: THIS IS NOT FRAUD PROTECTION.
 *
 * This hook runs in the browser. The save endpoint accepts a menu whose key
 * forwards to any number in the world whatever this file thinks — the IVR
 * payload is posted by `upsertIVR`
 * (src/pages/admin-settings/phone-systems/ivr-menus/add-edit-ivr/index.tsx:129-136,
 * :242) and nothing in that path consults these settings. Anyone who can open
 * dev tools, or call the API directly, can still create the route.
 *
 * What it actually buys is real but modest: an administrator who is not meant
 * to build a dial-out menu key stops being offered one, and if they type a
 * foreign number into a domestic-only account they are told why before they
 * save. It stops the accident, not the attacker.
 *
 * The gate that stops toll fraud has to live in the call switch, where the
 * outbound leg is set up, or at minimum in the save endpoint. Until it does, an
 * admin who turns this off is warned, not protected. Do not describe this hook
 * as enforcement anywhere a customer will read it.
 * ---------------------------------------------------------------------------
 *
 * A MISSING COMPANY RECORD ALLOWS EVERYTHING. This is the part that could break
 * live call routing if it is written backwards, so it is spelled out.
 *
 * "No decision stored" is not the same as "the decision was no". A tenant that
 * has never opened Admin > Company info > Calling permissions has saved nothing
 * at all. If this hook read an absent record as "denied", then on the day it
 * shipped every such tenant would find external forwarding gone from their menu
 * editors — and any admin who opened an existing menu that already forwards to
 * an outside number, and saved it, could have that routing quietly rewritten.
 * That is a company-wide call-routing outage caused by a settings page nobody
 * visited.
 *
 * So: only a value explicitly stored as `false` restricts anything. Missing,
 * null, malformed, wrong type, and still-loading all read as permitted. The
 * mirror rule applies to the child flag: only an explicit `true` on
 * `domestic_only` narrows anything.
 */

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
  isSupportedCountry,
} from 'libphonenumber-js/max';
import type { CountryCode } from 'libphonenumber-js/max';

import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';
import { useUser } from '@/hooks/use-user';

/* Same namespace the calling-permissions page already owns
   (company-calling-permissions.tsx:51), so this switch sits beside the transfer
   ones rather than starting a second home for the same idea. */
const PERMISSIONS_KEY = 'company_calling_permissions';
const IVR_FORWARDING_KEY = 'ivr_external_forwarding';

/* The destination type that means "a number outside the company". It is the
   `PHONE` entry the shared pickers offer:
   src/components/custom/forward-action-all.tsx:24 and :37, and
   src/components/custom/forwarding-actions.tsx:21 and :48-52. Declared here as a
   literal rather than imported from a component so a hook never has to pull in a
   React component to know a string. */
export const EXTERNAL_FORWARD_TYPE = 'PHONE' as const;

export type ExternalForwardType = typeof EXTERNAL_FORWARD_TYPE;

export type IvrExternalForwardingBlockReason = 'not_allowed' | 'international';

export interface IvrExternalForwardingCheck {
  allowed: boolean;
  /* One sentence an administrator can act on. Null when the number is fine. */
  reason: string | null;
  blockedBy: IvrExternalForwardingBlockReason | null;
  isInternational: boolean;
  /* True when we could not work out which country the number belongs to. Such a
     number is treated as domestic — see `classifyNumber`. */
  isCountryUnknown: boolean;
}

export interface IvrExternalForwardingPermissions {
  isLoading: boolean;
  /* May a menu key be pointed at an outside number at all? */
  allowExternalForwarding: boolean;
  /* Outside numbers permitted, but only inside the account's own country. False
     whenever `allowExternalForwarding` is false — the child never outlives its
     parent. */
  domesticOnly: boolean;
  /* True only when a stored company record is actually governing this session.
     False means "nothing stored, everything allowed", which is a different thing
     from a permission that was granted on purpose. */
  isPolicyActive: boolean;
  /* The account's own country, or null when it cannot be determined. */
  homeCountry: CountryCode | null;
  /* Readable name for the same, for use in a sentence. Falls back to
     "your country". */
  homeCountryName: string;
  /* Ready to spread into the shared picker's `notInclude` prop. Empty when
     external forwarding is permitted, `['PHONE']` when it is not. */
  hiddenForwardTypes: ExternalForwardType[];
  /* Answers for one typed number. Safe to call on every keystroke. */
  canForwardTo: (target: string) => IvrExternalForwardingCheck;
}

/* Only an explicit `false` restricts. See the header: absent is not off. */
const isExplicitlyDenied = (value: unknown): boolean => value === false;

/* And only an explicit `true` narrows. Absent is not "domestic only" either. */
const isExplicitlyEnabled = (value: unknown): boolean => value === true;

const readForwardingSettings = (
  template: CompanyDefaultTemplate | null | undefined,
): Record<string, unknown> | null => {
  const settings = template?.settings;
  if (!settings || typeof settings !== 'object') return null;

  const permissions = (settings as Record<string, unknown>)[PERMISSIONS_KEY];
  if (!permissions || typeof permissions !== 'object') return null;

  const forwarding = (permissions as Record<string, unknown>)[IVR_FORWARDING_KEY];
  return forwarding && typeof forwarding === 'object'
    ? (forwarding as Record<string, unknown>)
    : null;
};

const toCountryCode = (value: unknown): CountryCode | null => {
  const candidate = String(value || '')
    .trim()
    .toUpperCase();
  if (candidate.length !== 2) return null;
  return isSupportedCountry(candidate) ? (candidate as CountryCode) : null;
};

interface NumberClassification {
  isEmpty: boolean;
  isInternational: boolean;
  isCountryUnknown: boolean;
}

/* Deciding whether a typed number is abroad.
 *
 * "Abroad" is relative to the account's own country, which comes from the
 * signed-in user record as `user.countryInfo.alpha2code`. That is the same field
 * the caller-ID list uses for its flag
 * (src/hooks/use-dialpad-caller-id-options.ts:88), the group caller-ID list uses
 * as its fallback (src/hooks/use-group-caller-id-options.ts:406), the outbound
 * rate table uses for "your country"
 * (src/pages/admin-settings/calling-rates/outbound-rates.tsx:36-38), and the
 * transfer gate uses for exactly this comparison
 * (src/hooks/use-transfer-permissions.ts:240). It is the only account-level
 * country the front end has — the Company Default record carries no country of
 * its own.
 *
 * If that field is missing, or the number cannot be read, the answer is
 * "unknown", and unknown is treated as DOMESTIC. Refusing a legitimate local
 * number because we could not read a country would break a working route to
 * enforce a rule this file cannot actually enforce anyway (see the header).
 */
const classifyNumber = (target: string, homeCountry: CountryCode | null): NumberClassification => {
  const raw = String(target ?? '').trim();

  if (!raw) {
    return { isEmpty: true, isInternational: false, isCountryUnknown: false };
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return { isEmpty: true, isInternational: false, isCountryUnknown: false };
  }

  if (!homeCountry) {
    return { isEmpty: false, isInternational: false, isCountryUnknown: true };
  }

  /* The widget behind this field is react-phone-input-2 with a country picker
     (forward-action-all.tsx:207-208, forwarding-actions.tsx:255-263). It hands
     back the full international number with the country calling code already on
     the front but WITHOUT the leading plus — "12125551212", "442071838750". So
     the international reading is tried first, because for this particular input
     it is the correct one, and a national reading is only the fallback for values
     that arrived from somewhere else (a saved menu, a pasted local number). */
  let parsed = parsePhoneNumberFromString(`+${digits}`);

  if (!parsed?.isValid()) {
    const national = parsePhoneNumberFromString(digits, homeCountry);
    if (national?.isValid()) parsed = national;
    else parsed = parsed || national;
  }

  /* "00" is the international prefix nearly everywhere outside the NANP and
     people type it from habit. Only a strictly better reading is allowed to win,
     so a number that already parses is never reinterpreted. */
  if (parsed && !parsed.isValid() && /^00\d/.test(digits)) {
    const reparsed = parsePhoneNumberFromString(`+${digits.slice(2)}`);
    if (reparsed?.isValid()) parsed = reparsed;
  }

  if (parsed?.country) {
    return {
      isEmpty: false,
      isInternational: parsed.country !== homeCountry,
      isCountryUnknown: false,
    };
  }

  /* No ISO country came back. Shared calling codes do this: +1 covers the US,
     Canada and much of the Caribbean, and an unrecognised +1 number has a
     calling code but no country. Comparing calling codes is the weaker test — it
     cannot tell a US number from a Canadian one — but it still catches a clearly
     foreign code, and it is the last thing tried before giving up. */
  if (parsed?.countryCallingCode) {
    let homeCallingCode = '';
    try {
      homeCallingCode = getCountryCallingCode(homeCountry);
    } catch {
      homeCallingCode = '';
    }

    if (homeCallingCode) {
      return {
        isEmpty: false,
        isInternational: String(parsed.countryCallingCode) !== homeCallingCode,
        isCountryUnknown: false,
      };
    }
  }

  return { isEmpty: false, isInternational: false, isCountryUnknown: true };
};

export const useIvrExternalForwarding = (): IvrExternalForwardingPermissions => {
  const { user } = useUser();

  const { data: companyDefaultTemplate, isLoading } = useQuery<CompanyDefaultTemplate | null>({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    /* Company rules change rarely and a menu editor reads this on every render of
       every key row, so it is kept for a few minutes rather than refetched.
       Same figure as useTransferPermissions (use-transfer-permissions.ts:233). */
    staleTime: 5 * 60 * 1000,
  });

  const homeCountry = useMemo(
    () => toCountryCode(user?.countryInfo?.alpha2code),
    [user?.countryInfo?.alpha2code],
  );

  const homeCountryName = useMemo(() => {
    const name = String(user?.countryInfo?.countryname || '').trim();
    return name || 'your country';
  }, [user?.countryInfo?.countryname]);

  const forwardingSettings = useMemo(
    () => readForwardingSettings(companyDefaultTemplate),
    [companyDefaultTemplate],
  );

  /* While the record is still in flight nothing is restricted. A menu editor
     opened before the settings request lands must not hide a destination the
     company is allowed to use — a caller who would rather wait has `isLoading`. */
  const isPolicyActive = !isLoading && Boolean(forwardingSettings);

  const allowExternalForwarding =
    !isPolicyActive || !isExplicitlyDenied(forwardingSettings?.allowed);

  const domesticOnly =
    allowExternalForwarding &&
    isPolicyActive &&
    isExplicitlyEnabled(forwardingSettings?.domestic_only);

  const hiddenForwardTypes = useMemo<ExternalForwardType[]>(
    () => (allowExternalForwarding ? [] : [EXTERNAL_FORWARD_TYPE]),
    [allowExternalForwarding],
  );

  const canForwardTo = useCallback(
    (target: string): IvrExternalForwardingCheck => {
      const destination = classifyNumber(target, homeCountry);

      const base = {
        isInternational: destination.isInternational,
        isCountryUnknown: destination.isCountryUnknown,
      };

      if (!allowExternalForwarding) {
        return {
          ...base,
          allowed: false,
          blockedBy: 'not_allowed',
          reason:
            'Sending a caller from a phone menu out to a number outside the company is switched off for this account. Point this key at a person, group, queue or another menu instead, or ask an administrator to allow outside forwarding.',
        };
      }

      /* An empty box is not a permission question. Whether a half-typed number is
         a valid one stays with the form's own rules — the IVR schema already
         answers that (ivr-menus/schema.ts) — so this hook never becomes a second,
         competing validity check. */
      if (destination.isEmpty) {
        return { ...base, allowed: true, reason: null, blockedBy: null };
      }

      if (domesticOnly && destination.isInternational) {
        return {
          ...base,
          allowed: false,
          blockedBy: 'international',
          reason: `This account may only forward menu callers to numbers in ${homeCountryName}. Numbers abroad are where toll fraud lands, so ask an administrator if this menu genuinely needs to reach another country.`,
        };
      }

      return { ...base, allowed: true, reason: null, blockedBy: null };
    },
    [allowExternalForwarding, domesticOnly, homeCountry, homeCountryName],
  );

  return {
    isLoading,
    allowExternalForwarding,
    domesticOnly,
    isPolicyActive,
    homeCountry,
    homeCountryName,
    hiddenForwardTypes,
    canForwardTo,
  };
};

export default useIvrExternalForwarding;
