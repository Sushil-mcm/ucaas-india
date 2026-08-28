/* Who may listen back to a recorded call.
 *
 * This is the privacy question customers ask early, and today the product has no
 * answer to it. Every place that lists a recording gates the play button on one
 * RBAC flag, `plan_features.reports.action.call_recording_listen`, and that flag
 * is all-or-nothing: it does not know whose call the recording is. So a role that
 * may listen may listen to everyone, and a role that may not cannot even hear
 * itself back. The two questions people actually ask —
 *
 *   1. may people listen to their OWN calls?
 *   2. may admins listen to ANYONE'S calls?
 *
 * — have nowhere to be recorded and nothing to read them. This hook is the reader.
 * It expects an admin to write the answers from Admin > Company info > Policies
 * into the reserved "Company Default" record, under
 *
 *   settings.company_policies.recording_access = { own: boolean, admins_all: boolean }
 *
 * BE HONEST ABOUT WHAT THIS IS. This runs in the browser and it hides a button.
 * It does not stop anybody fetching the file. Recordings are served from a plain
 * URL that every list builds by hand —
 * `${MEDIA_URL}/${company_uuid}/recording/${recording_file}` — and the file name
 * is in the API response that painted the table. Anyone who opens dev tools, or
 * who kept an old link, can still play the audio. What this buys is real but
 * modest:
 *
 *   - the admin's decision stops being decorative: switching "admins may listen
 *     to anyone" off actually removes the play button for admins;
 *   - casual listening-in stops, which is most of what the question is about;
 *   - the refusal is explained in words the person can act on, rather than a
 *     button that silently does nothing.
 *
 * It is a guard rail, not a lock. The real control is server-side: the media host
 * has to check who is asking before it serves the file. Until it does, do not
 * cite this hook to a customer as proof their recordings are private.
 *
 * HOW A CALL IS MATCHED TO A PERSON. The call log rows carry no user id, so the
 * only link back to the signed-in person is their extension. See
 * `isOwnCall` below for exactly which row fields are compared and why an
 * undecidable row is deliberately treated as permissive.
 */

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  COMPANY_DEFAULTS_QUERY_KEY,
  fetchCompanyDefaults,
  type CompanyDefaultTemplate,
} from '@/lib/company-defaults';
import { isExtensionDialTarget, normalizeExtension } from '@/lib/extension-utility';
import { useCompanyFeatures } from '@/hooks/rbac';

/* Same namespace the policies page already writes under, so a rename there is a
   one-line fix here. */
const POLICIES_KEY = 'company_policies';
const RECORDING_ACCESS_KEY = 'recording_access';

/* Both default to allowed, and that is the point: it is exactly how the product
   behaves today. Shipping this hook must change nothing anywhere until an admin
   deliberately turns something off. */
const DEFAULT_OWN_ALLOWED = true;
const DEFAULT_ADMINS_ALL_ALLOWED = true;

/* Existing call-log columns treat anything longer than five characters as an
   outside number and anything shorter as an internal extension. Matched here so
   this hook and the tables it sits in agree on what an extension looks like. */
const MAX_EXTENSION_LENGTH = 5;

export type RecordingOwnership = 'own' | 'other' | 'unknown';

export type RecordingBlockReason = 'own_recordings_blocked' | 'admin_all_recordings_blocked';

export interface RecordingAccessCheck {
  /* False only when an admin has explicitly switched something off. */
  allowed: boolean;
  reason?: RecordingBlockReason;
  /* Plain English, written for the person looking at the list, not a developer.
     Present whenever `allowed` is false. */
  message?: string;
  /* Exposed so a caller can word a tooltip differently for a colleague's call. */
  ownership: RecordingOwnership;
}

/* The subset of a call-log row this hook reads. Every field is optional because
   the rows are untyped `any` at every call site and the shape differs between
   the inbound, outbound, history, recording, voicemail and callback endpoints. */
export interface RecordingCallRow {
  direction?: string | null;
  /* The internal extension on the "from" side, populated when the caller is one
     of ours. This is the field the From column prints for outbound calls. */
  extension?: string | number | null;
  caller_id_number?: string | number | null;
  destination_number?: string | number | null;
  forward_type?: string | null;
  forward_value?: string | number | null;
  [key: string]: any;
}

export interface UseRecordingAccessResult {
  /* The recorded decisions, for wording a banner or an empty state. */
  ownRecordingsAllowed: boolean;
  adminsMayPlayAllRecordings: boolean;
  /* True once the company record has been read and it actually exists. A tenant
     that never opened the policies page has no record at all — see below. */
  hasCompanyRecord: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  /* Whether this row is the signed-in person's own call, someone else's, or not
     decidable from the fields the row carries. */
  getOwnership: (call: RecordingCallRow | null | undefined) => RecordingOwnership;
  /* The question a play button should ask. */
  canPlayRecording: (call: RecordingCallRow | null | undefined) => RecordingAccessCheck;
}

const toObject = (value: unknown): Record<string, any> => {
  /* fetchCompanyDefaults already parses a JSON string into an object, but the
     column is free-form and a tenant could be holding anything in it. */
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
};

/* MISSING MUST MEAN ALLOWED.
 *
 * Only an explicitly stored boolean counts. A key that is absent, null, a string,
 * or a company record that was never created at all falls through to the default.
 *
 * This is the entire safety argument for switching this hook on. Most tenants
 * have never opened Admin > Company info > Policies, so they have no
 * `company_policies` block, no `recording_access` object, and no `own` key. If
 * absent read as `false`, every one of those tenants would lose the ability to
 * hear their own calls back the moment this shipped — a silent, total loss of a
 * feature they are paying for, caused by a setting nobody ever touched. That is
 * far worse than the thing this hook is guarding against.
 *
 * So: missing is permissive. Only a deliberate `false` restricts.
 */
const readStoredBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

/* Collect the internal parties named on a row. Only values that look like an
   extension are kept — an outside number in `destination_number` tells us
   nothing about which of our people was on the call. */
const internalPartiesOf = (call: RecordingCallRow): string[] => {
  const candidates: unknown[] = [
    /* The from side. Populated for outbound calls placed by one of our people. */
    call?.extension,
    call?.caller_id_number,
    /* The to side. For a direct inbound call the destination is the extension
       that was dialled. */
    call?.destination_number,
  ];

  /* An inbound call that was forwarded records the real destination separately.
     Only EXTENSION and VOICEMAIL name a person — DEPARTMENT, IVR and QUEUE hold
     a uuid for a shared object that belongs to nobody in particular. */
  const forwardType = String(call?.forward_type || '').toUpperCase();
  if (forwardType === 'EXTENSION' || forwardType === 'VOICEMAIL') {
    candidates.push(call?.forward_value);
  }

  return candidates
    .map((value) => normalizeExtension(value))
    .filter((value) => !!value && isExtensionDialTarget(value, MAX_EXTENSION_LENGTH));
};

export const useRecordingAccess = (): UseRecordingAccessResult => {
  const { user, IS_ADMIN } = useCompanyFeatures();
  const viewerExtension = normalizeExtension(user?.user_info?.extension);

  const { data, isLoading } = useQuery<CompanyDefaultTemplate | null>({
    queryKey: COMPANY_DEFAULTS_QUERY_KEY,
    queryFn: fetchCompanyDefaults,
    /* The company rule changes rarely and this is read on every call-log render,
       so it is held for a few minutes rather than refetched on each mount. Same
       staleTime the other company policy readers use, so they share one cache
       entry rather than invalidating each other. */
    staleTime: 5 * 60 * 1000,
  });

  const { ownRecordingsAllowed, adminsMayPlayAllRecordings, hasCompanyRecord } = useMemo(() => {
    const settings = toObject(data?.settings);
    const policies = toObject(settings?.[POLICIES_KEY]);
    const access = toObject(policies?.[RECORDING_ACCESS_KEY]);

    return {
      ownRecordingsAllowed: readStoredBoolean(access?.own, DEFAULT_OWN_ALLOWED),
      adminsMayPlayAllRecordings: readStoredBoolean(
        access?.admins_all,
        DEFAULT_ADMINS_ALL_ALLOWED,
      ),
      hasCompanyRecord: !!data?.uuid,
    };
  }, [data]);

  /* Deciding whose call it is.
   *
   * Call-log rows carry no user id, so an extension is the only thread back to a
   * person. That thread breaks in ordinary cases: a call that arrived on a DID
   * and was answered out of a queue names the queue, not the agent, so no
   * extension on the row belongs to anyone in particular.
   *
   * Rather than guess, this returns three answers, and 'unknown' is treated
   * permissively by canPlayRecording. Guessing 'own' would hand someone a
   * recording the policy meant to withhold; guessing 'other' would deny people
   * their own calls, which is the failure this whole design is trying to avoid.
   */
  const getOwnership = useCallback(
    (call: RecordingCallRow | null | undefined): RecordingOwnership => {
      if (!call || !viewerExtension) return 'unknown';

      const parties = internalPartiesOf(call);
      if (!parties.length) return 'unknown';
      if (parties.includes(viewerExtension)) return 'own';

      return 'other';
    },
    [viewerExtension],
  );

  const canPlayRecording = useCallback(
    (call: RecordingCallRow | null | undefined): RecordingAccessCheck => {
      const ownership = getOwnership(call);

      /* Never refuse on data that has not arrived. A slow or failed read of the
         company record must not be mistaken for an admin's decision. */
      if (isLoading) return { allowed: true, ownership };

      /* An admin who may listen to anyone may of course listen to themselves, so
         this is checked before the "own recordings" rule. Without it an admin who
         switched off self-listening company-wide would lock themselves out of the
         very recordings they are allowed to audit. */
      if (IS_ADMIN && adminsMayPlayAllRecordings) {
        return { allowed: true, ownership };
      }

      if (ownership === 'own' && !ownRecordingsAllowed) {
        return {
          allowed: false,
          reason: 'own_recordings_blocked',
          ownership,
          message:
            'Listening back to your own recorded calls is switched off for this company. ' +
            'An admin set this under Company info > Policies. Ask an admin if you need to ' +
            'hear one of your calls.',
        };
      }

      /* Only an admin is restricted here, and only when we positively know the
         call is someone else's. Two deliberate limits:
         - 'unknown' never blocks, because an admin's own call that we simply
           could not match must not be withheld from them;
         - a non-admin listening to a colleague's recording is not covered by
           either setting, so it is left exactly as it is today, gated by the
           existing `call_recording_listen` role flag. Blocking it here would be
           this hook inventing a third policy nobody asked for, and would change
           behaviour for tenants that never opened the settings page. */
      if (IS_ADMIN && ownership === 'other' && !adminsMayPlayAllRecordings) {
        return {
          allowed: false,
          reason: 'admin_all_recordings_blocked',
          ownership,
          message:
            'Admins cannot listen to other people’s recorded calls in this company. ' +
            'This was switched off under Company info > Policies. You can still listen to ' +
            'your own calls.',
        };
      }

      return { allowed: true, ownership };
    },
    [getOwnership, isLoading, IS_ADMIN, adminsMayPlayAllRecordings, ownRecordingsAllowed],
  );

  return {
    ownRecordingsAllowed,
    adminsMayPlayAllRecordings,
    hasCompanyRecord,
    isLoading,
    isAdmin: IS_ADMIN,
    getOwnership,
    canPlayRecording,
  };
};

export default useRecordingAccess;
