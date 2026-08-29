/* Making the company messaging switches mean something at the moment of sending.
 *
 * Admin > Company info > Company messaging writes two decisions into the reserved
 * "Company Default" record (src/pages/admin-settings/company/company-messaging.tsx):
 *
 *   settings.company_messaging.sms_mms.enabled                        default true
 *   settings.company_messaging.unregistered_us_numbers.outbound_allowed  default false
 *
 * Nothing reads them. Both places that send a text call the send endpoint after
 * checking only 10DLC brand status and SMS credit, so an admin who switches
 * texting off watches their people carry on texting. This hook is what the two
 * send paths ask before they send.
 *
 * BE HONEST ABOUT WHAT THIS IS. This runs in the browser. It stops nothing
 * server-side: POST /api/v1/sms/send accepts the request exactly as it did
 * before, and anyone with the endpoint and a token can still send. Someone who
 * wants to get around this can. What it buys is smaller and still worth having:
 *
 *   - the admin's switch stops being decorative — turning texting off now
 *     actually stops the people using this product from texting;
 *   - an agent is told before they press send, not after, and told in words they
 *     can act on.
 *
 * It is a guard rail, not a lock. If texting genuinely has to stop — a legal
 * hold, a carrier complaint — the numbers still have to be released or
 * unassigned. Do not cite this hook as proof that SMS is off.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not repeat, replace or weaken the
 * 10DLC brand check the send paths already run. That check is real: when the
 * destination is US and the brand is unverified, both paths already refuse and
 * show the DLC verification prompt. This hook is meant to run AFTER that check,
 * and when the brand is known-unverified it stands down completely so the agent
 * never gets two different explanations for one refusal. An admin switching
 * "allow unregistered US texting" ON does not switch the 10DLC gate off either —
 * a recorded preference cannot override a live carrier requirement.
 */

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';
import { checkPhoneNumberCountry } from '@/lib/utils';

/* Same key and same shape the company messaging page writes. Kept as constants so
   a rename there is a one-line fix here, and so nothing is spelled twice. */
const MESSAGING_KEY = 'company_messaging';

/* Mirrors DEFAULT_FORM on the settings page, on purpose: the hook must agree with
   the switches the admin is looking at, or the two will drift. */
const DEFAULT_SMS_MMS_ENABLED = true;
const DEFAULT_UNREGISTERED_US_OUTBOUND_ALLOWED = false;

export type MessagingBlockReason = 'sms_disabled';
export type MessagingWarningReason = 'unregistered_us';

export interface MessagingCheck {
  /* False only when an admin has explicitly switched company texting off. */
  allowed: boolean;
  reason?: MessagingBlockReason;
  /* Plain English, written for the agent about to send, not for a developer.
     Present whenever `allowed` is false. */
  message?: string;
  /* Advisory only — `allowed` stays true. Show it, do not block on it. */
  warning?: string;
  warningReason?: MessagingWarningReason;
  /* True when the existing 10DLC gate owns this case and this hook has stood
     down. Callers that run the DLC check first will never see it, and that is
     the point: it exists so a caller cannot accidentally double-report. */
  deferredToDlcCheck?: boolean;
}

export interface UseMessagingPermissionsResult {
  /* Whether company-wide texting is on. Use it to disable a composer or show a
     banner, so the refusal is visible before anything is typed. */
  smsEnabled: boolean;
  /* The recorded decision about US numbers with no approved campaign behind
     them. Exposed for wording, not for gating — see canSendTo. */
  unregisteredUsOutboundAllowed: boolean;
  /* True once the company record has been read and it exists. */
  hasCompanyRecord: boolean;
  isLoading: boolean;
  /* Given the destination number, may this message be sent, and if not, why.
     `dlcVerified` is the value the caller already holds from getDLCStatus:
     true verified, false unverified, null/undefined not known. Pass it — it is
     how this hook knows to stay quiet when the existing DLC gate has the case. */
  canSendTo: (
    destination: string,
    options?: { dlcVerified?: boolean | null },
  ) => MessagingCheck;
}

const toSettingsObject = (rawSettings: unknown): Record<string, any> => {
  /* fetchCompanyDefaults already parses a JSON string into an object, but the
     column is free-form and a tenant could hold anything in it. */
  if (!rawSettings || typeof rawSettings !== 'object') return {};
  return rawSettings as Record<string, any>;
};

/* Only an explicitly stored boolean counts. Everything else — key absent, null,
   a string, a record that was never created — falls through to the default.

   This is the whole safety argument for switching the hook on. A tenant that has
   never opened the company messaging page has no `company_messaging` block at
   all, and absent keys must not read as `false`, or every such tenant loses
   texting the moment this ships — a silent, total outage caused by a setting
   nobody ever touched. Missing is permissive; only a deliberate `false` blocks. */
const readStoredBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const useMessagingPermissions = (): UseMessagingPermissionsResult => {
  const { data, isLoading } = useQuery<CompanyDefaultTemplate | null>({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    /* The company rule changes rarely and this is read on every inbox load, so it
       is kept for a few minutes rather than refetched on each mount. Same
       staleTime the company policy reader uses. */
    staleTime: 5 * 60 * 1000,
  });

  const { smsEnabled, unregisteredUsOutboundAllowed, hasCompanyRecord } = useMemo(() => {
    const settings = toSettingsObject(data?.settings);
    const messaging = toSettingsObject(settings?.[MESSAGING_KEY]);

    return {
      smsEnabled: readStoredBoolean(
        toSettingsObject(messaging?.sms_mms)?.enabled,
        DEFAULT_SMS_MMS_ENABLED,
      ),
      unregisteredUsOutboundAllowed: readStoredBoolean(
        toSettingsObject(messaging?.unregistered_us_numbers)?.outbound_allowed,
        DEFAULT_UNREGISTERED_US_OUTBOUND_ALLOWED,
      ),
      hasCompanyRecord: !!data?.uuid,
    };
  }, [data]);

  const canSendTo = useCallback(
    (destination: string, options?: { dlcVerified?: boolean | null }): MessagingCheck => {
      /* Never refuse on data that has not arrived. A slow or failed read of the
         company record must not look like an admin decision. */
      if (isLoading) return { allowed: true };

      if (!smsEnabled) {
        return {
          allowed: false,
          reason: 'sms_disabled',
          message:
            'Texting is switched off for this company. An admin turned off SMS and MMS in ' +
            'Company info > Company messaging. Ask an admin to turn it back on if you need to text.',
        };
      }

      const { isUSA } = checkPhoneNumberCountry(destination);
      if (!isUSA) return { allowed: true };

      const dlcVerified = options?.dlcVerified;

      /* The brand is known-unverified: the existing 10DLC gate has already
         refused this send and shown its own prompt. Say nothing. Two messages
         for one refusal, worded differently, is worse than one. */
      if (dlcVerified === false) return { allowed: true, deferredToDlcCheck: true };

      /* The brand is verified. Whether this particular number sits under an
         approved campaign is not something the browser can see — getDLCStatus
         answers at brand level only — so there is nothing honest to say here. */
      if (dlcVerified === true) return { allowed: true };

      /* Brand status unknown: the check has not run, or it failed. The admin has
         recorded that unregistered US traffic is not allowed, so warn — but do
         not block. Blocking on a status we could not read would refuse sends for
         a fully registered account whose status call happened to fail, which is
         a worse failure than sending a text that may be filtered. */
      if (!unregisteredUsOutboundAllowed) {
        return {
          allowed: true,
          warningReason: 'unregistered_us',
          warning:
            'We could not confirm this account is registered for US business texting (10DLC), ' +
            'and your admin has not allowed texting from unregistered US numbers. Unregistered ' +
            'US texts are likely to be blocked by the carriers and are billed at a higher rate. ' +
            'Check your registration under 10DLC Compliance before sending in volume.',
        };
      }

      return { allowed: true };
    },
    [isLoading, smsEnabled, unregisteredUsOutboundAllowed],
  );

  return {
    smsEnabled,
    unregisteredUsOutboundAllowed,
    hasCompanyRecord,
    isLoading,
    canSendTo,
  };
};

export default useMessagingPermissions;
