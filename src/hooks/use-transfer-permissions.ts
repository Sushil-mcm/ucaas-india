/* Reading the company's transfer permissions and answering one question:
 * may this person send this call to this number.
 *
 * The three flags live in the reserved "Company Default" record under
 * `settings.company_calling_permissions.transfers`, written by
 * src/pages/admin-settings/company/company-calling-permissions.tsx:132-139:
 *
 *   allow_external               — hand a live call to a number outside the company
 *   allow_international          — child of the above: let that number be abroad
 *   allow_outbound_call_external — hand a call WE dialled out to an outside number
 *
 * the safe default ships all three off as toll-fraud protection, and so does that page.
 *
 * ---------------------------------------------------------------------------
 * HONESTY: THIS IS NOT FRAUD PROTECTION.
 *
 * This hook runs in the browser. Anyone who can open dev tools can call the
 * transfer API directly, and nothing here is in that path — the REFER goes out
 * over SIP from `handleTransfer` (src/context/dialpad-context.tsx:2460) and the
 * switch accepts it whatever this file thinks. What this buys is real but
 * modest: an agent who is not allowed to transfer a call abroad sees that
 * before they try, with a sentence explaining why, instead of doing it by
 * accident. It stops honest mistakes and it makes the admin setting visible.
 *
 * The gate that actually stops toll fraud has to live in the call switch, where
 * the leg is set up. Until it does, an admin who unticks these boxes is not
 * protected — they are merely warned. Do not describe this hook as enforcement
 * anywhere a customer will read it.
 * ---------------------------------------------------------------------------
 *
 * A MISSING company record allows everything. This matters more than it looks.
 * Absent settings are not the same as settings switched off: a tenant that has
 * never opened Admin > Company > Calling permissions has stored no decision at
 * all, and reading "no record" as "everything denied" would take working
 * transfers away from every such account the moment this shipped — a silent,
 * company-wide outage caused by a page nobody visited. So only a value that was
 * explicitly stored as `false` restricts anything. Missing, null, malformed and
 * still-loading all read as permitted.
 */

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parsePhoneNumberFromString, getCountryCallingCode } from 'libphonenumber-js/max';
import type { CountryCode } from 'libphonenumber-js/max';

import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';
import { isExtensionDialTarget, normalizeDialTargetUserPart } from '@/lib/extension-utility';
import { useHomeCountry } from '@/lib/home-country';

const PERMISSIONS_KEY = 'company_calling_permissions';

/* The same two values the connected screen derives from the live session
   (src/components/dialpad/components/dialpad-connected-screen.tsx:189-190).
   Anything else — unknown, not passed, a call we cannot classify — is treated
   as inbound, because the outbound rule is the stricter one and guessing
   "outbound" on a call we cannot identify would block ordinary transfers. */
export type TransferCallDirection = 'incoming' | 'outgoing' | string | null | undefined;

export interface TransferCheckOptions {
  /* `session.direction` as the dialpad stores it. Omit it and the check answers
     for an inbound call. */
  direction?: TransferCallDirection;
}

export interface TransferCheckResult {
  allowed: boolean;
  /* One sentence an agent can read mid-call. Null when the transfer is allowed. */
  reason: string | null;
  /* Which stored flag refused, for logging and for the admin-facing copy. */
  blockedBy: 'external' | 'international' | 'outbound_external' | null;
  isInternal: boolean;
  isExternal: boolean;
  isInternational: boolean;
  /* True when the destination is external but we could not work out its
     country. Treated as domestic — see `classifyDestination`. */
  isCountryUnknown: boolean;
}

export interface TransferPermissions {
  isLoading: boolean;
  allowExternal: boolean;
  allowInternational: boolean;
  allowOutboundCallExternal: boolean;
  /* True only when a stored company record is actually governing this session.
     False means "nothing stored, everything allowed" — useful for telling an
     admin the difference between a permission granted and a permission never
     configured. */
  isPolicyActive: boolean;
  canTransferTo: (target: string, options?: TransferCheckOptions) => TransferCheckResult;
}

/* Only an explicit `false` restricts. See the header: absent is not off. */
const isExplicitlyDenied = (value: unknown): boolean => value === false;

const readTransfers = (template: CompanyDefaultTemplate | null | undefined): any => {
  const settings = template?.settings;
  if (!settings || typeof settings !== 'object') return null;
  const permissions = (settings as Record<string, any>)[PERMISSIONS_KEY];
  if (!permissions || typeof permissions !== 'object') return null;
  const transfers = permissions.transfers;
  return transfers && typeof transfers === 'object' ? transfers : null;
};

interface Destination {
  isEmpty: boolean;
  isInternal: boolean;
  isInternational: boolean;
  isCountryUnknown: boolean;
}

/* Internal vs external is NOT a new rule invented here. The app already decides
   it in one place, `isExtensionDialTarget` (src/lib/extension-utility.ts:17-25):
   a target is internal when its user part is digits only, does not start with
   `*` or `#`, and is four digits or fewer. That is what the dialpad uses to
   decide whether a call is an extension call everywhere else — caller-ID choice
   (src/components/dialpad/index.tsx:342), transcription
   (dialpad-transcript-manager.tsx:167), the side panel
   (dialpad-maxi-side-panel.tsx:113) and the ended screen
   (dialpad-ended-screen.tsx:176). Using the same function keeps one definition
   of "inside the company" rather than a second, quietly different one.

   Feature codes (`*67`, `#…`) are internal too. `isExtensionDialTarget` rejects
   them at extension-utility.ts:20 and the transfer panel keeps them out of its
   formatting path via `isFeatureCode`
   (dialpad-transfer-list.tsx:33). They are switch instructions, not
   destinations, so a transfer permission has no business blocking them.

   KNOWN GAP: a company's own DID typed out in full — "+1 256 808 1010" rather
   than "1010" — counts as external here, because the app has no list of the
   company's own numbers on this screen to compare against. It errs towards
   asking, not towards allowing. */
const classifyDestination = (target: string, homeCountry: CountryCode | null): Destination => {
  const userPart = normalizeDialTargetUserPart(target);

  if (!userPart) {
    return { isEmpty: true, isInternal: true, isInternational: false, isCountryUnknown: false };
  }

  if (userPart.startsWith('*') || userPart.startsWith('#')) {
    return { isEmpty: false, isInternal: true, isInternational: false, isCountryUnknown: false };
  }

  if (isExtensionDialTarget(userPart)) {
    return { isEmpty: false, isInternal: true, isInternational: false, isCountryUnknown: false };
  }

  /* External. Now: is it abroad?

     "Abroad" is relative to the account's own country, which comes from the
     signed-in user record as `user.countryInfo.alpha2code` — the same field the
     caller-ID list uses for its flag (src/hooks/use-dialpad-caller-id-options.ts:87)
     and the outbound rate table uses for "your country"
     (src/pages/admin-settings/calling-rates/outbound-rates.tsx:36-38). It is
     the only account-level country the front end has; there is no company
     country on the Company Default record.

     If that field is missing, or the number cannot be parsed, the answer is
     "unknown" and unknown is treated as DOMESTIC. Blocking a legitimate local
     transfer because we could not read a country would break a working phone to
     enforce a rule we cannot actually enforce anyway (see the header). */
  if (!homeCountry) {
    return { isEmpty: false, isInternal: false, isInternational: false, isCountryUnknown: true };
  }

  /* Parsed with the home country as the default, so a number typed the local
     way ("2568081010") resolves domestically while "+44…" resolves abroad.
     libphonenumber already understands the home country's own international
     prefix — "011…" from a US account, "00…" from a UK one. */
  let parsed = parsePhoneNumberFromString(userPart, homeCountry);

  /* One gap that is worth closing: "00" is the international prefix nearly
     everywhere except the NANP, and people type it out of habit. From a US
     account "00442071838750" parses as a US number, which is why the check is
     not just "does it start with 00" — it is "the local reading is not a valid
     number, and reading the 00 as a plus gives one that is". Only a strictly
     better reading wins, so a valid domestic number is never reinterpreted. */
  if (parsed && !parsed.isValid() && /^00\d/.test(userPart)) {
    const reparsed = parsePhoneNumberFromString(`+${userPart.slice(2)}`);
    if (reparsed?.isValid()) parsed = reparsed;
  }

  if (parsed?.country) {
    return {
      isEmpty: false,
      isInternal: false,
      isInternational: parsed.country !== homeCountry,
      isCountryUnknown: false,
    };
  }

  /* No ISO country came back. Shared calling codes do this: +1 covers the US,
     Canada and much of the Caribbean, and an unrecognised +1 number has a
     calling code but no country. Comparing calling codes is the weaker test —
     it cannot tell a US number from a Canadian one — but it still catches a
     clearly foreign code, and it is the last thing we try before giving up. */
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
        isInternal: false,
        isInternational: String(parsed.countryCallingCode) !== homeCallingCode,
        isCountryUnknown: false,
      };
    }
  }

  return { isEmpty: false, isInternal: false, isInternational: false, isCountryUnknown: true };
};

export const useTransferPermissions = (): TransferPermissions => {

  const { data: companyDefaultTemplate, isLoading } = useQuery<CompanyDefaultTemplate | null>({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    /* Company rules change rarely and this is read every time a transfer panel
       opens, so it is kept for a few minutes rather than refetched per call.
       Same figure as useCompanyPolicy (src/lib/company-policy.ts:62). */
    staleTime: 5 * 60 * 1000,
  });

  const { homeCountry, homeCountryName } = useHomeCountry();

  const transfers = useMemo(
    () => readTransfers(companyDefaultTemplate),
    [companyDefaultTemplate],
  );

  /* While the record is still in flight nothing is denied. A transfer panel
     opened mid-call must not refuse the first press because a settings request
     has not landed; callers that would rather wait have `isLoading`. */
  const isPolicyActive = !isLoading && Boolean(transfers);

  const allowExternal = !isPolicyActive || !isExplicitlyDenied(transfers?.allow_external);

  /* International is a child of external, exactly as the settings page reads and
     writes it (company-calling-permissions.tsx:115-117 and :137): it can never
     be more permissive than its parent. */
  const allowInternational =
    allowExternal && (!isPolicyActive || !isExplicitlyDenied(transfers?.allow_international));

  const allowOutboundCallExternal =
    !isPolicyActive || !isExplicitlyDenied(transfers?.allow_outbound_call_external);

  const canTransferTo = useCallback(
    (target: string, options?: TransferCheckOptions): TransferCheckResult => {
      const destination = classifyDestination(String(target ?? ''), homeCountry);

      const base = {
        isInternal: destination.isInternal,
        isExternal: !destination.isInternal && !destination.isEmpty,
        isInternational: destination.isInternational,
        isCountryUnknown: destination.isCountryUnknown,
      };

      /* An empty or internal destination is never a permission question. Whether
         an empty box is a valid transfer at all stays with the caller — the
         transfer panel already answers that with its own length check
         (dialpad-transfer-list.tsx:202). This hook answers permission only, so
         it never becomes a second, competing validity rule. */
      if (destination.isEmpty || destination.isInternal) {
        return { ...base, allowed: true, reason: null, blockedBy: null };
      }

      if (!allowExternal) {
        return {
          ...base,
          allowed: false,
          blockedBy: 'external',
          reason:
            'Transferring a call to a number outside the company is switched off for this account. You can still transfer to a colleague, or ask an administrator to allow external transfers.',
        };
      }

      /* The outbound rule is checked before the international one because it is
         the one established systems names as fraud prevention, and because an agent needs to
         hear the real reason: it is not where the number is, it is that this
         call went out from here. */
      const isOutboundCall = String(options?.direction || '').toLowerCase() === 'outgoing';

      if (isOutboundCall && !allowOutboundCallExternal) {
        return {
          ...base,
          allowed: false,
          blockedBy: 'outbound_external',
          reason:
            'This call was dialled out from here, and passing an outgoing call on to another outside number is switched off for this account. Ask an administrator if you need it for this call.',
        };
      }

      if (destination.isInternational && !allowInternational) {
        return {
          ...base,
          allowed: false,
          blockedBy: 'international',
          reason: `Transferring a call to a number outside ${homeCountryName} is switched off for this account. Ask an administrator if this call needs to go abroad.`,
        };
      }

      return { ...base, allowed: true, reason: null, blockedBy: null };
    },
    [allowExternal, allowInternational, allowOutboundCallExternal, homeCountry, homeCountryName],
  );

  return {
    isLoading,
    allowExternal,
    allowInternational,
    allowOutboundCallExternal,
    isPolicyActive,
    canTransferTo,
  };
};

export default useTransferPermissions;
